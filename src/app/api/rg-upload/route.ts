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
    log('Corpo da requisição recebido:', { 
      camposRecebidos: Object.keys(requestBody),
      cpf: requestBody.cpf ? '***' + requestBody.cpf.slice(-3) : 'não fornecido',
      nome: requestBody.nome ? 'fornecido' : 'não fornecido',
      temFrente: !!requestBody.frente,
      temVerso: !!requestBody.verso
    });

    const { cpf, nome, dataNascimento, frente, verso } = requestBody;

    // 2. Validação dos campos obrigatórios
    if (!cpf || !nome || !dataNascimento || !frente || !verso) {
      const missingFields = {
        cpf: !cpf,
        nome: !nome,
        dataNascimento: !dataNascimento,
        frente: !frente,
        verso: !verso
      };
      log('Campos obrigatórios faltando:', missingFields);
      
      return NextResponse.json(
        { 
          success: false,
          message: "Todos os campos são obrigatórios",
          camposFaltantes: missingFields
        },
        { status: 400 }
      );
    }

    const token = process.env.IDWALL_API_TOKEN;
    const flowId = process.env.IDWALL_FLOW_ID_RG;
    
    if (!token || !flowId) {
      log('Erro de configuração - Variáveis de ambiente faltando:', {
        temToken: !!token,
        temFlowId: !!flowId
      });
      return NextResponse.json(
        { success: false, message: "Configuração do servidor incompleta" },
        { status: 500 }
      );
    }

    const ref = cpf;
    const dataFormatada = dataNascimento.replace(/-/g, "/");

    // 3. Criação ou verificação do perfil
    const profilePayload = {
      ref,
      personal: {
        name: nome,
        birthDate: dataFormatada,
        cpfNumber: cpf,
      },
      status: 1,
    };

    log('Criando/verificando perfil na IDwall', {
      endpoint: 'POST /maestro/profile',
      payload: { ...profilePayload, personal: { ...profilePayload.personal, cpfNumber: '***' + cpf.slice(-3) } }
    });

    const profileRes = await fetch("https://api-v3.idwall.co/maestro/profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profilePayload),
    });

    const profileJson = await profileRes.json().catch(() => null);
    
    log('Resposta da criação de perfil:', {
      status: profileRes.status,
      headers: Object.fromEntries(profileRes.headers.entries()),
      body: profileJson
    });

    // 4. Tratamento do perfil existente
    if (!profileRes.ok && !profileJson?.message?.includes("already exists")) {
      throw new Error(`Erro ao criar perfil: ${JSON.stringify(profileJson)}`);
    }

    // 5. Upload dos documentos - Versão com múltiplos endpoints de teste
    const testUploadEndpoints = async (imageData: string, lado: "FRENTE" | "VERSO") => {
      const buffer = Buffer.from(imageData.split(",")[1], "base64");
      const form = new FormData();
      form.append("ref", ref);
      form.append("documentType", "RG");
      form.append("documentSide", lado);
      form.append("file", new Blob([buffer], { type: "image/jpeg" }), `rg_${lado.toLowerCase()}.jpg`);

      // Lista de endpoints possíveis para teste
      const endpointsToTest = [
        "https://api-v3.idwall.co/maestro/documents",
        "https://api-v3.idwall.co/maestro/profile-documents",
        "https://api-v3.idwall.co/maestro/profiles/${ref}/documents",
        "https://api-v3.idwall.co/maestro/profiles/${ref}/rg/upload"
      ];

      const results = [];
      
      for (const endpoint of endpointsToTest) {
        try {
          const finalEndpoint = endpoint.replace('${ref}', ref);
          log(`Tentando upload no endpoint: ${finalEndpoint}`, { lado });

          const startUploadTime = Date.now();
          const res = await fetch(finalEndpoint, {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${token}`,
            },
            body: form,
          });

          const responseTime = Date.now() - startUploadTime;
          const responseBody = await res.json().catch(() => null);

          results.push({
            endpoint: finalEndpoint,
            status: res.status,
            responseTime: `${responseTime}ms`,
            response: responseBody
          });

          if (res.ok) {
            log(`Upload bem-sucedido no endpoint: ${finalEndpoint}`, {
              status: res.status,
              response: responseBody
            });
            return { success: true, endpoint: finalEndpoint, response: responseBody };
          }
        } catch (error) {
          const err = error as Error;
          results.push({
            endpoint,
            error: err.message
          });
        }
      }

      log('Todos os endpoints de upload falharam', { results });
      throw new Error(`Todos os endpoints de upload falharam para ${lado}. Resultados: ${JSON.stringify(results)}`);
    };

    log('Iniciando upload de documentos RG...');
    const uploadResults = await Promise.all([
      testUploadEndpoints(frente, "FRENTE"),
      testUploadEndpoints(verso, "VERSO")
    ]);

    // 6. Disparo do fluxo
    const flowEndpoint = `https://api-v3.idwall.co/maestro/profile/${ref}/flow/${flowId}`;
    log('Disparando fluxo de verificação', { endpoint: flowEndpoint });

    const flowRes = await fetch(flowEndpoint, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
      },
    });

    const flowJson = await flowRes.json().catch(() => null);
    
    log('Resposta do fluxo de verificação:', {
      status: flowRes.status,
      headers: Object.fromEntries(flowRes.headers.entries()),
      body: flowJson
    });

    if (!flowRes.ok && !flowJson?.message?.includes("already has same flow running")) {
      log('Atenção: Fluxo pode não ter sido iniciado corretamente', flowJson);
    }

    // 7. Resposta de sucesso
    const totalTime = Date.now() - startTime;
    log('Processamento concluído com sucesso', { tempoTotal: `${totalTime}ms` });

    return NextResponse.json({
      success: true,
      message: "Documentos RG enviados com sucesso",
      metadata: {
        tempoProcessamento: `${totalTime}ms`,
        endpointsUsados: {
          uploadFrente: uploadResults[0].endpoint,
          uploadVerso: uploadResults[1].endpoint,
          fluxo: flowEndpoint
        }
      },
      data: {
        perfil: ref,
        documentos: {
          frente: { status: "enviado" },
          verso: { status: "enviado" }
        },
        fluxo: flowJson
      }
    });

  } catch (error: unknown) {
    const err = error as Error;
    const errorTime = Date.now() - startTime;
    
    log('Erro no processamento:', {
      message: err.message,
      stack: err.stack,
      tempoProcessamento: `${errorTime}ms`
    });
    
    return NextResponse.json(
      { 
        success: false,
        message: "Falha no processamento",
        error: err.message,
        tempoProcessamento: `${errorTime}ms`
      },
      { status: 500 }
    );
  }
}