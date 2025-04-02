import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, cpf, dataNascimento } = body;

    if (!nome || !cpf || !dataNascimento) {
      return NextResponse.json(
        { mensagem: "Nome, CPF e data de nascimento são obrigatórios." },
        { status: 400 }
      );
    }

    const token = process.env.IDWALL_API_TOKEN;
    const ref = cpf;

    const payload = {
      ref,
      personal: {
        name: nome,
        birthDate: dataNascimento,
      },
      status: 1,
    };

    console.log("📤 Enviando para endpoint /profile com payload:", JSON.stringify(payload, null, 2));

    const profileRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token || "",
      },
      body: JSON.stringify(payload),
    });

    const profileData = await profileRes.json();
    console.log("📥 Resposta da criação do perfil:", JSON.stringify(profileData, null, 2));

    // ⚠️ Se perfil já existir, seguimos com o enriquecimento normalmente
    if (
      !profileRes.ok &&
      profileData?.message?.includes("already exists") === false
    ) {
      return NextResponse.json(
        {
          mensagem: profileData.message || "Erro ao criar perfil",
          detalhes: profileData,
        },
        { status: 400 }
      );
    }

    const enrichmentURL = `https://api-v3.idwall.co/maestro/profile-enrichment/by-profile-ref/${ref}`;
    console.log("📤 Consultando enriquecimento em:", enrichmentURL);

    const enrichmentRes = await fetch(enrichmentURL, {
      method: "GET",
      headers: {
        Authorization: token || "",
      },
    });

    const enrichment = await enrichmentRes.json();
    console.log("📥 Resposta do enriquecimento:", JSON.stringify(enrichment, null, 2));

    return NextResponse.json({
      mensagem: "Consulta realizada com sucesso",
      enrichment,
    });
  } catch (err: any) {
    console.error("❌ Erro inesperado:", err);
    return NextResponse.json({ mensagem: "Erro interno", erro: err.message || err }, { status: 500 });
  }
}
