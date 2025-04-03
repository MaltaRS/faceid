import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, cpf, dataNascimento } = body;

  const token = process.env.IDWALL_API_TOKEN;
  const flowId = process.env.IDWALL_FLOW_ID;

  if (!nome || !cpf || !dataNascimento) {
    console.warn("❌ Campos obrigatórios ausentes:", { nome, cpf, dataNascimento });
    return NextResponse.json({ mensagem: "Todos os campos são obrigatórios." }, { status: 400 });
  }

  const ref = cpf;
  const profilePayload = {
    ref,
    personal: {
      name: nome,
      birthDate: dataNascimento,
      cpfNumber: cpf,
    },
    status: 1,
  };

  console.log("📤 Criando perfil:", JSON.stringify(profilePayload, null, 2));

  const profileRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
    method: "POST",
    headers: {
      Authorization: token || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profilePayload),
  });

  const profileJson = await profileRes.json();
  console.log("📥 Resposta do perfil:", profileJson);

  let perfilExistente = false;
  if (!profileRes.ok) {
    if (profileJson.message?.includes("already exists")) {
      perfilExistente = true;
      console.log("ℹ️ Perfil já existente.");
    } else {
      return NextResponse.json({ mensagem: "Erro ao criar perfil", detalhes: profileJson }, { status: 400 });
    }
  }

  // Dispara fluxo apenas se não for existente
  if (!perfilExistente) {
    const flowURL = `https://api-v3.idwall.co/maestro/profile/${ref}/flow/${flowId}`;
    console.log("📤 Disparando fluxo:", flowURL);

    const flowRes = await fetch(flowURL, {
      method: "POST",
      headers: { Authorization: token || "" },
    });

    const flowJson = await flowRes.json();
    console.log("📥 Resposta do fluxo:", flowJson);

    if (!flowRes.ok && !flowJson.message?.includes("already has same flow running")) {
      return NextResponse.json({ mensagem: "Erro ao iniciar fluxo", detalhes: flowJson }, { status: 400 });
    }
  }

  // Enriquecimento
  const enrichmentURL = `https://api-v3.idwall.co/maestro/profile-enrichment/by-profile-ref/${ref}`;
  console.log("📤 Consultando enriquecimento:", enrichmentURL);

  const enrichmentRes = await fetch(enrichmentURL, {
    method: "GET",
    headers: { Authorization: token || "" },
  });

  const enrichmentJson = await enrichmentRes.json();
  console.log("📥 Enriquecimento bruto recebido:", JSON.stringify(enrichmentJson, null, 2));

  const fonte = enrichmentJson?.data?.profileSourcesData?.[0]?.sourceData;
  const validacoes: string[] = [];
  const logs: string[] = [];

  if (fonte) {
    // CPF
    if (fonte.personal?.cpfNumber === cpf) {
      validacoes.push("✅ CPF confere com os dados encontrados.");
    } else {
      validacoes.push("❌ CPF não confere.");
    }

    // Nome
    const normalize = (str: string) =>
      str.normalize("NFD").replace(/[^\w\s]/gi, "").toLowerCase();

    const nomeEnviado = normalize(nome);
    const nomeRetornado = normalize(fonte.personal?.name || "");
    const nomeEhCompatível = nomeEnviado
      .split(" ")
      .every((termo) => nomeRetornado.includes(termo)) && nomeEnviado.length >= 10;

    validacoes.push(nomeEhCompatível ? "✅ Nome compatível." : "❌ Nome não compatível.");

    // Nascimento
    const nascimentoAPI = fonte.personal?.birthDate?.replace(/\//g, "-");
    const nascimentoUser = dataNascimento.replace(/-/g, "/");
    const nascimentoValido =
      nascimentoAPI === dataNascimento ||
      nascimentoAPI === nascimentoUser ||
      fonte.personal?.birthDate === nascimentoUser;

    validacoes.push(nascimentoValido ? "✅ Data de nascimento compatível." : "❌ Data de nascimento não confere.");
  }

  // NOVO: Consultando informações detalhadas do perfil
  const statusURL = `https://api-v3.idwall.co/maestro/profile/${ref}/?lastFaceImage=false`;
  console.log("📤 Consultando status detalhado do perfil:", statusURL);

  const statusRes = await fetch(statusURL, {
    method: "GET",
    headers: { Authorization: token || "" },
  });

  const statusJson = await statusRes.json();
  console.log("📥 Status detalhado do perfil recebido:", JSON.stringify(statusJson, null, 2));

  let statusKycBasico = "Desconhecido";

  const segmentos = statusJson?.data?.segments || [];
  const kycSegmento = segmentos.find((seg: any) => seg.name?.toLowerCase().includes("aprovado"));

  if (kycSegmento) {
    statusKycBasico = "Aprovado";
  } else if (segmentos.length === 0) {
    statusKycBasico = "Pendente";
  }

  const kycAprovado = statusKycBasico?.toLowerCase() === "aprovado";


  // Logs
  logs.push(`👤 Perfil: ${perfilExistente ? "Já existia" : "Criado agora"}`);
  logs.push(`📊 Enriquecimento: ${fonte ? "Encontrado" : "Não encontrado"}`);
  logs.push(`🛡️ KYC Básico: ${statusKycBasico}`);
  logs.push(`Status do KYC: ${kycAprovado ? "✅ Aprovado" : "⚠️ Reprovado"}`);
  logs.push(`CPF: ${cpf}`);
  logs.push(`Nome fornecido: ${nome}`);
  logs.push(`Nascimento fornecido: ${dataNascimento}`);

  if (fonte) {
    logs.push(`Nome retornado: ${fonte.personal?.name}`);
    logs.push(`Nascimento retornado: ${fonte.personal?.birthDate}`);
    logs.push(`Renda: ${fonte.personal?.income}`);
    logs.push(`Situação IR: ${fonte.personal?.incomeTaxSituation}`);
  }

  return NextResponse.json({
    mensagem: "Consulta realizada com sucesso",
    validacoes,
    kycAprovado,
    statusKycBasico,
    enrichment: enrichmentJson.data || {},
    fonteCompleta: fonte,
    respostaBruta: enrichmentJson,
    logs,
    segmentos,
  });
}
