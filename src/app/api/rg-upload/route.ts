// app/api/rg-upload/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const log = (msg: string, data?: unknown) =>
    console.log(`[${new Date().toISOString()}] ${msg}`, data || '');

  try {
    // 1. Parse e validação
    log('Iniciando processamento da requisição');
    const requestBody = await req.json();
    const { cpf, nome, dataNascimento, frente, verso } = requestBody;

    if (!cpf || !nome || !dataNascimento || !frente || !verso) {
      return NextResponse.json(
        { success: false, message: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    // 2. Configuração dos tokens
    const token = process.env.IDWALL_API_TOKEN;
    const flowId = process.env.IDWALL_FLOW_ID_RG;

    if (!token || !flowId) {
      log('Faltando token ou flowId');
      return NextResponse.json(
        { success: false, message: "Configuração do servidor incompleta" },
        { status: 500 }
      );
    }

    if (!token.match(/^[a-f0-9\-]{36}$/i)) {
      return NextResponse.json(
        { success: false, message: "Token com formato inválido" },
        { status: 500 }
      );
    }

    const ref = cpf;
    const dataFormatada = dataNascimento.replace(/-/g, "/");

    const headers = {
      "Authorization": token,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "idw-request-id": `req_${Date.now()}`
    };

    log("Criando perfil IDwall", { ref, nome, dataFormatada });

    const profilePayload = {
      ref,
      personal: {
        name: nome,
        birthDate: dataFormatada,
        cpfNumber: cpf
      },
      status: 1
    };

    const profileRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
      method: "POST",
      headers,
      body: JSON.stringify(profilePayload)
    });

    const profileJson = await profileRes.json().catch(() => ({}));

    log("Resposta da criação de perfil", { status: profileRes.status, body: profileJson });

    if (profileRes.status === 401) {
      return NextResponse.json(
        {
          success: false,
          message: "Erro de autenticação com a IDwall",
          details: "Token API inválido ou expirado"
        },
        { status: 401 }
      );
    }

    if (!profileRes.ok && !profileJson.message?.includes("already exists")) {
      throw new Error(`Erro ao criar perfil: ${JSON.stringify(profileJson)}`);
    }

    // 3. Upload dos documentos
    const upload = async (side: "FRONT" | "BACK", image: string) => {
      const buffer = Buffer.from(image.split(",")[1], "base64");
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: "image/jpeg" }), `${side.toLowerCase()}.jpg`);
      form.append("documentType", "RG");
      form.append("documentSide", side);

      const endpoint = `https://api-v3.idwall.co/maestro/profile/${ref}/document`;
      log(`Upload ${side}`, endpoint);

      const uploadRes = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: token },
        body: form
      });

      const body = await uploadRes.json().catch(() => ({}));
      return { status: uploadRes.status, body };
    };

    const frenteUpload = await upload("FRONT", frente);
    const versoUpload = await upload("BACK", verso);

    // 4. Disparo do fluxo
    const flowRes = await fetch(`https://api-v3.idwall.co/maestro/profile/${ref}/flow/${flowId}`, {
      method: "POST",
      headers: { Authorization: token }
    });

    const flowJson = await flowRes.json().catch(() => ({}));

    // 5. Consulta final do perfil/documentos
    const consultaRes = await fetch(`https://api-v3.idwall.co/maestro/profile/${ref}`, {
      method: "GET",
      headers: { Authorization: token }
    });

    const consultaJson = await consultaRes.json().catch(() => ({}));
    const documentos = consultaJson?.documents || null;

    return NextResponse.json({
      success: true,
      message: "Documentos enviados e verificação iniciada",
      profileStatus: profileRes.status,
      profileJson,
      frenteUpload,
      versoUpload,
      flowStatus: flowRes.status,
      flowJson,
      ref,
      documentos
    });

  } catch (err) {
    log("Erro no processamento", err);
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno do servidor",
        error: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}
