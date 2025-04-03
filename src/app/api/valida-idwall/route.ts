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

  if (!profileRes.ok && !profileJson.message?.includes("already exists")) {
    return NextResponse.json({ mensagem: "Erro ao criar perfil", detalhes: profileJson }, { status: 400 });
  }

  // Inicia o fluxo
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

  // Consulta enrichment
  const enrichmentURL = `https://api-v3.idwall.co/maestro/profile-enrichment/by-profile-ref/${ref}`;
  console.log("📤 Consultando enrichment:", enrichmentURL);

  const enrichmentRes = await fetch(enrichmentURL, {
    method: "GET",
    headers: { Authorization: token || "" },
  });

  const enrichmentJson = await enrichmentRes.json();
  console.log("📥 Enrichment bruto recebido:", JSON.stringify(enrichmentJson, null, 2));

  const fonte = enrichmentJson?.data?.profileSourcesData?.[0]?.sourceData;
  const validacoes: string[] = [];
  const logs: string[] = [];

  if (!fonte) {
    return NextResponse.json({
      mensagem: "Consulta realizada com sucesso",
      validacoes: ["❌ Nenhum dado encontrado no enrichment."],
      enrichment: enrichmentJson.data || {},
      kycAprovado: false,
      logs,
    });
  }

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

  if (nomeEhCompatível) {
    validacoes.push("✅ Nome compatível.");
  } else {
    validacoes.push("❌ Nome não compatível.");
  }

  // Data de nascimento
  const nascimentoAPI = fonte.personal?.birthDate?.replace(/\//g, "-");
  const nascimentoUser = dataNascimento.replace(/-/g, "/");

  if (
    nascimentoAPI === dataNascimento ||
    nascimentoAPI === nascimentoUser ||
    fonte.personal?.birthDate === nascimentoUser
  ) {
    validacoes.push("✅ Data de nascimento compatível.");
  } else {
    validacoes.push("❌ Data de nascimento não confere.");
  }

  // Verifica se o KYC foi aprovado com base nas validações
  const kycAprovado =
    validacoes.includes("✅ CPF confere com os dados encontrados.") &&
    validacoes.includes("✅ Nome compatível.") &&
    validacoes.includes("✅ Data de nascimento compatível.");

  logs.push(`Status do KYC: ${kycAprovado ? "Aprovado ✅" : "Reprovado ⚠️"}`);
  logs.push(`CPF: ${cpf}`);
  logs.push(`Nome fornecido: ${nome}`);
  logs.push(`Data Nascimento: ${dataNascimento}`);
  logs.push(`Nome retornado: ${fonte.personal?.name}`);
  logs.push(`Nascimento retornado: ${fonte.personal?.birthDate}`);
  logs.push(`Renda: ${fonte.personal?.income}`);
  logs.push(`Situação IR: ${fonte.personal?.incomeTaxSituation}`);

  return NextResponse.json({
    mensagem: "Consulta realizada com sucesso",
    validacoes,
    kycAprovado,
    enrichment: enrichmentJson.data || {},
    fonteCompleta: fonte,
    respostaBruta: enrichmentJson,
    logs,
  });
}
