'use server'

import { NextRequest, NextResponse } from 'next/server'

const getToken = async (): Promise<string | null> => {
  console.log('[TOKEN] Solicitando novo token...')

  const auth = Buffer.from(
    `${process.env.SERPRO_CLIENT_ID}:${process.env.SERPRO_CLIENT_SECRET}`
  ).toString('base64')

  try {
    const response = await fetch('https://gateway.apiserpro.serpro.gov.br/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    const data = await response.json()
    console.log('[TOKEN] Resposta do SERPRO:', data)

    return data?.access_token || null
  } catch (error) {
    console.error('[ERRO TOKEN]', error)
    return null
  }
}

function formatDateToISO(dateString: string): string {
  if (!dateString || dateString.length !== 8) return ''
  const day = dateString.slice(0, 2)
  const month = dateString.slice(2, 4)
  const year = dateString.slice(4, 8)
  return `${year}-${month}-${day}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cpfRaw = body?.cpf || ''
    const cpf = cpfRaw.replace(/\D/g, '')

    console.log('[CPF RECEBIDO DO FRONT]', cpfRaw)
    console.log('[CPF FORMATADO PARA API]', cpf)

    if (!cpf || cpf.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Erro ao obter token' }, { status: 500 })
    }

    const url = `https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v1/cpf/${cpf}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const contentType = response.headers.get('Content-Type') || ''
    if (!response.ok || !contentType.includes('application/json')) {
      const raw = await response.text()
      return NextResponse.json({ error: 'Erro na consulta ao CPF', raw }, { status: response.status })
    }

    const result = await response.json()
    const { nome, nascimento } = result
    const formattedNascimento = formatDateToISO(nascimento)
    if (!formattedNascimento) {
      return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
    }

    const tokenIdwall = process.env.IDWALL_API_TOKEN
    const flowId = process.env.IDWALL_FLOW_ID

    const ref = cpf
    const profilePayload = {
      ref,
      personal: {
        name: nome,
        birthDate: formattedNascimento,
        cpfNumber: cpf,
      },
      status: 1,
    }

    const profileRes = await fetch('https://api-v3.idwall.co/maestro/profile', {
      method: 'POST',
      headers: {
        Authorization: tokenIdwall || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profilePayload),
    })

    const profileJson = await profileRes.json()
    let perfilExistente = false
    if (!profileRes.ok) {
      if (profileJson.message?.includes('already exists')) {
        perfilExistente = true
      } else {
        return NextResponse.json({ mensagem: 'Erro ao criar perfil', detalhes: profileJson }, { status: 400 })
      }
    }

    if (!perfilExistente) {
      const flowURL = `https://api-v3.idwall.co/maestro/profile/${ref}/flow/${flowId}`
      const flowRes = await fetch(flowURL, {
        method: 'POST',
        headers: { Authorization: tokenIdwall || '' },
      })
      const flowJson = await flowRes.json()
      if (!flowRes.ok && !flowJson.message?.includes('already has same flow running')) {
        return NextResponse.json({ mensagem: 'Erro ao iniciar fluxo', detalhes: flowJson }, { status: 400 })
      }
    }

    const enrichmentURL = `https://api-v3.idwall.co/maestro/profile-enrichment/by-profile-ref/${ref}`
    const enrichmentRes = await fetch(enrichmentURL, {
      method: 'GET',
      headers: { Authorization: tokenIdwall || '' },
    })
    const enrichmentJson = await enrichmentRes.json()
    const fonte = enrichmentJson?.data?.profileSourcesData?.[0]?.sourceData

    const statusURL = `https://api-v3.idwall.co/maestro/profile/${ref}/?lastFaceImage=false`
    const statusRes = await fetch(statusURL, {
      method: 'GET',
      headers: { Authorization: tokenIdwall || '' },
    })
    const statusJson = await statusRes.json()

    let statusKycBasico = 'Desconhecido'
    const segmentos = Array.isArray(statusJson?.data?.segments) ? statusJson.data.segments : []
    const kycSegmento = segmentos.find((seg: { name?: string }) =>
      seg.name?.toLowerCase().includes('aprovado')
    )
    if (kycSegmento) {
      statusKycBasico = 'Aprovado'
    } else if (segmentos.length === 0) {
      statusKycBasico = 'Pendente'
    }

    const kycAprovado = statusKycBasico.toLowerCase() === 'aprovado'

    const logs: string[] = []
    logs.push(`👤 Perfil: ${perfilExistente ? 'Já existia' : 'Criado agora'}`)
    logs.push(`📊 Enriquecimento: ${fonte ? 'Encontrado' : 'Não encontrado'}`)
    logs.push(`🛡️ KYC Básico: ${statusKycBasico}`)
    logs.push(`Status do KYC: ${kycAprovado ? '✅ Aprovado' : '⚠️ Reprovado'}`)
    logs.push(`CPF: ${cpf}`)
    logs.push(`Nome fornecido: ${nome}`)
    logs.push(`Nascimento fornecido: ${formattedNascimento}`)
    if (fonte) {
      logs.push(`Nome retornado: ${fonte.personal?.name}`)
      logs.push(`Nascimento retornado: ${fonte.personal?.birthDate}`)
      logs.push(`Renda: ${fonte.personal?.income}`)
      logs.push(`Situação IR: ${fonte.personal?.incomeTaxSituation}`)
    }

    return NextResponse.json({
      nome,
      nascimento: formattedNascimento,
      fonteCompleta: fonte,
      validacoes: [],
      kycAprovado,
      statusKycBasico,
      logs,
      segmentos,
      perfilCriado: !perfilExistente,
    })
  } catch (error) {
    console.error('❌ Erro na API combinada SERPRO + IDWALL:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
