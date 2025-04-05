import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cpf, nome, dataNascimento, fotoBase64 } = body;

    const token = process.env.IDWALL_API_TOKEN;
    const flowId = process.env.IDWALL_FLOW_ID;

    if (!cpf || !nome || !dataNascimento || !fotoBase64) {
      return NextResponse.json(
        { mensagem: "CPF, nome, data de nascimento e imagem são obrigatórios." },
        { status: 400 }
      );
    }

    const ref = cpf;

    // 1. Criação do perfil
    const profilePayload = {
      ref,
      personal: {
        name: nome,
        birthDate: dataNascimento,
        cpfNumber: cpf,
      },
      status: 1,
    };

    console.log("📤 Criando perfil antes de enviar imagem:", JSON.stringify(profilePayload, null, 2));

    const profileRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
      method: "POST",
      headers: {
        Authorization: token || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profilePayload),
    });

    const profileJson = await profileRes.json();
    console.log("📥 Resposta criação perfil:", profileJson);

    if (!profileRes.ok && !profileJson.message?.includes("already exists")) {
      return NextResponse.json({ mensagem: "Erro ao criar perfil", detalhes: profileJson }, { status: 400 });
    }

    // 2. Disparo do fluxo
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

    // 3. Aguarda até 3 segundos
    console.log("⏳ Aguardando fluxo ficar pronto (até 3s)...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. Converte imagem base64 para Blob
    const imageBuffer = Buffer.from(fotoBase64.split(",")[1], "base64");
    const blob = new Blob([imageBuffer], { type: "image/png" });
    const file = new File([blob], "face.png", { type: "image/png" });

    const formData = new FormData();
    formData.append("ref", ref);
    formData.append("photo", file);

    const url = "https://api-v3.idwall.co/maestro/profile-face-image";
    console.log("📤 Enviando imagem para:", url);

    const uploadRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token || "",
      },
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    console.log("📥 Resultado do envio da face:", JSON.stringify(uploadJson, null, 2));

    if (!uploadRes.ok) {
      return NextResponse.json(
        { mensagem: "Erro ao cadastrar imagem facial", detalhes: uploadJson },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mensagem: "✅ Imagem de face cadastrada com sucesso.",
      resultado: uploadJson,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Erro na API de cadastro de face:", err.message);
    return NextResponse.json({ mensagem: "Erro interno", detalhes: err.message }, { status: 500 });
  }
}
