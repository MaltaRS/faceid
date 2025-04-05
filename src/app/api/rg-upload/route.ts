// app/api/rg-upload/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const log = (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
  };

  try {
    // 1. Validação inicial
    log('Iniciando processamento da requisição');
    const requestBody = await req.json();
    
    const { cpf, nome, dataNascimento, frente, verso } = requestBody;

    // 2. Validação dos campos obrigatórios
    if (!cpf || !nome || !dataNascimento || !frente || !verso) {
      return NextResponse.json(
        { success: false, message: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    // 3. Verificação do token (CORREÇÃO PRINCIPAL)
    const token = process.env.IDWALL_API_TOKEN;
    const flowId = process.env.IDWALL_FLOW_ID_RG;
    
    if (!token || !flowId) {
      log('Configuração de ambiente ausente', {
        temToken: !!token,
        temFlowId: !!flowId
      });
      return NextResponse.json(
        { success: false, message: "Configuração do servidor incompleta" },
        { status: 500 }
      );
    }

    // 4. Verificar formato do token
    if (!token.match(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i)) {
      log('Token com formato inválido');
      return NextResponse.json(
        { success: false, message: "Configuração de token inválida" },
        { status: 500 }
      );
    }

    const ref = cpf;
    const dataFormatada = dataNascimento.replace(/-/g, "/");

    // 5. Configuração dos headers (CORREÇÃO IMPORTANTE)
   const headers = {
  "Authorization": token, // <- sem 'Bearer'
  "Content-Type": "application/json",
  "Accept": "application/json",
  "idw-request-id": `req_${Date.now()}`
};


    log('Configuração de headers', { headers: { ...headers, Authorization: 'Bearer ***' } });

    // 6. Criação do perfil
    const profilePayload = {
      ref,
      personal: {
        name: nome,
        birthDate: dataFormatada,
        cpfNumber: cpf,
      },
      status: 1,
    };

    log('Criando perfil na IDwall', { 
      endpoint: 'POST /maestro/profile',
      payload: { ...profilePayload, personal: { ...profilePayload.personal, cpfNumber: '***' + cpf.slice(-3) } }
    });

    const profileRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
      method: "POST",
      headers,
      body: JSON.stringify(profilePayload),
    });

    const profileJson = await profileRes.json().catch(() => ({}));
    
    log('Resposta da criação de perfil', {
      status: profileRes.status,
      body: profileJson
    });

    // 7. Tratamento de erros de autenticação específico
    if (profileRes.status === 401) {
      log('Erro de autenticação - Token inválido ou expirado');
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

     // 8. Upload dos documentos
     const upload = async (side: "FRONT" | "BACK", image: string) => {
        const buffer = Buffer.from(image.split(",")[1], "base64");
        const form = new FormData();
        form.append("file", new Blob([buffer], { type: "image/jpeg" }), `${side.toLowerCase()}.jpg`);
        form.append("documentType", "RG");
        form.append("documentSide", side);
        form.append("ref", ref);
  
        const uploadRes = await fetch("https://api-v3.idwall.co/maestro/documents", {
          method: "POST",
          headers: { Authorization: token },
          body: form
        });
  
        const json = await uploadRes.json().catch(() => ({}));
        return { status: uploadRes.status, body: json };
      };
  
      log("🔁 Upload das imagens RG");
      const frenteUpload = await upload("FRONT", frente);
      const versoUpload = await upload("BACK", verso);
  
      // 9. Disparo do fluxo
      const flowRes = await fetch(`https://api-v3.idwall.co/maestro/profile/${ref}/flow/${flowId}`, {
        method: "POST",
        headers: { Authorization: token },
      });
      const flowJson = await flowRes.json().catch(() => ({}));
  
      // 10. Consulta final dos documentos enviados
      const consultaRes = await fetch(`https://api-v3.idwall.co/maestro/profile/${ref}`, {
        method: "GET",
        headers: { Authorization: token },
      });
      const consultaJson = await consultaRes.json().catch(() => ({}));
  
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
        documentos: consultaJson.documents || null
      });
  } catch (error) {
    log('Erro durante o processamento', { error });
    return NextResponse.json(
      { success: false, message: "Erro interno do servidor", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}