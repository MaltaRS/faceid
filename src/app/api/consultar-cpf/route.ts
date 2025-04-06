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

export async function POST(req: NextRequest) {
  const body = await req.json()
  const cpfRaw = body?.cpf || ''
  const cpf = cpfRaw.replace(/\D/g, '')

  console.log('[CPF RECEBIDO DO FRONT]', cpfRaw)
  console.log('[CPF FORMATADO PARA API]', cpf)

  if (!cpf || cpf.length !== 11) {
    console.log('[ERRO CPF] CPF inválido recebido:', cpf)
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Erro ao obter token' }, { status: 500 })
  }

  // 🔄 Atualizado para usar o endpoint correto da "Consulta CPF – Direto na Faixa"
  const url = `https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v1/cpf/${cpf}`
  console.log('[CONSULTA] URL final:', url)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const contentType = response.headers.get('Content-Type') || ''
    console.log('[RESPOSTA SERPRO] Status:', response.status, '| Content-Type:', contentType)

    if (!response.ok || !contentType.includes('application/json')) {
      const raw = await response.text()
      console.warn('[ERRO DE CONTEÚDO] Conteúdo inesperado:', raw)
      return NextResponse.json({ error: 'Erro na consulta ao CPF', raw }, { status: response.status })
    }

    const result = await response.json()
    console.log('[DADOS CPF RETORNADOS]', result)

    return NextResponse.json({
      valid: true,
      nome: result.nome,
      nascimento: result.nascimento,
      situacao: result.situacao?.descricao || 'Indefinida'
    })
  } catch (error) {
    console.error('[ERRO FATAL NA CONSULTA]', error)
    return NextResponse.json({ error: 'Erro interno na consulta ao CPF' }, { status: 500 })
  }
}