import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cpf, nome, dataNascimento, fotoBase64 } = body;

    const token = process.env.IDWALL_API_TOKEN;
    const flowId = process.env.IDWALL_FLOW_ID_BIOMETRIA; // novo fluxo de biometria

    if (!cpf || !fotoBase64 || !nome || !dataNascimento) {
      return NextResponse.json(
        { mensagem: "CPF, nome, data de nascimento e imagem são obrigatórios." },
        { status: 400 }
      );
    }

    const ref = cpf;

    // 1. Criação ou verificação do perfil
    const profilePayload = {
      ref,
      personal: {
        name: nome,
        birthDate: dataNascimento,
        cpfNumber: cpf,
      },
      status: 1,
    };

    const profileHeaders = {
      Authorization: token || "",
      "Content-Type": "application/json",
    };

    console.log("📤 Criando perfil (POST /maestro/profile):");
    console.log("🟡 Headers:", profileHeaders);
    console.log("🟡 Payload:", JSON.stringify(profilePayload, null, 2));

    const createRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
      method: "POST",
      headers: profileHeaders,
      body: JSON.stringify(profilePayload),
    });

    interface ProfileResponse {
      [key: string]: unknown;
      message?: string;
    }
    const profileJson: ProfileResponse = await createRes.json();
    console.log("📥 Resposta criação perfil:");
    console.log("🔵 Status:", createRes.status);
    console.log("🔵 Headers:", Object.fromEntries(createRes.headers.entries()));
    console.log("🔵 Body:", profileJson);

    const perfilJaExiste = profileJson?.message?.includes("already exists");

    if (!createRes.ok && !perfilJaExiste) {
      return NextResponse.json(
        { mensagem: "Erro ao criar perfil", detalhes: profileJson },
        { status: 400 }
      );
    }

    // 2. Disparar fluxo biometria
    const flowURL = `https://api-v3.idwall.co/maestro/profile/${ref}/flow/${flowId}`;
    console.log("📤 Disparando fluxo (POST):", flowURL);

    const flowRes = await fetch(flowURL, {
      method: "POST",
      headers: { Authorization: token || "" },
    });

    const flowJson = await flowRes.json();
    console.log("📥 Resposta do fluxo:");
    console.log("🔵 Status:", flowRes.status);
    console.log("🔵 Headers:", Object.fromEntries(flowRes.headers.entries()));
    console.log("🔵 Body:", flowJson);

    if (!flowRes.ok && !flowJson.message?.includes("already has same flow running")) {
      return NextResponse.json({ mensagem: "Erro ao iniciar fluxo", detalhes: flowJson }, { status: 400 });
    }

    // 3. Aguarda 3 segundos
    console.log("⏳ Aguardando fluxo (delay 3s)...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. Converte a imagem
    const imageBuffer = Buffer.from(fotoBase64.split(",")[1], "base64");
    const formData = new FormData();
    formData.append("ref", ref);
    formData.append("photo", new Blob([imageBuffer], { type: "image/png" }), "face.png");

    // 5. Envio da imagem facial
    const url = "https://api-v3.idwall.co/maestro/profile-face-image";
    console.log("📤 Enviando imagem facial (POST):", url);

    const imagemRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: token || "" },
      body: formData,
    });

    const imagemJson = await imagemRes.json();
    console.log("📥 Resultado envio da face:");
    console.log("🔵 Status:", imagemRes.status);
    console.log("🔵 Headers:", Object.fromEntries(imagemRes.headers.entries()));
    console.log("🔵 Body:", imagemJson);

    if (!imagemRes.ok) {
      return NextResponse.json(
        {
          mensagem: "Erro ao cadastrar imagem facial",
          detalhes: imagemJson,
          sugestao: "Verifique se o fluxo permite envio de imagem e se está configurado corretamente.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mensagem: "Imagem de face cadastrada com sucesso.",
      resultado: imagemJson,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Erro na API de cadastro de face:", err.message);
    return NextResponse.json({ mensagem: "Erro interno", detalhes: err.message }, { status: 500 });
  }
}
