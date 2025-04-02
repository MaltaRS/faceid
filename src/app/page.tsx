// API para consulta de enriquecimento via Idwall v3
"use client";

import { useState } from "react";

export default function ValidadorIdwallPage() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const validarDados = async () => {
    setCarregando(true);
    setMensagem("");

    try {
      const resposta = await fetch("/api/valida-idwall", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          cpf,
          dataNascimento, // formato ISO: YYYY-MM-DD vindo do input type="date"
        }),
      });

      const data = await resposta.json();

      if (resposta.ok) {
        const enriched = data.enrichment?.data?.profileSourcesData?.[0]?.sourceData;

        if (enriched) {
          setMensagem(
            `✅ ${data.mensagem}

📋 Dados retornados:
Nome: ${enriched.personal?.name || "-"}
CPF: ${enriched.personal?.cpfNumber || "-"}
Nascimento: ${enriched.personal?.birthDate || "-"}
Renda: ${enriched.personal?.income || "-"}
Situação IR: ${enriched.personal?.incomeTaxSituation || "-"}
PEP: ${enriched.personal?.pep ? "Sim" : "Não"}`
          );
        } else {
          setMensagem(
            `✅ ${data.mensagem}

📋 Nenhum dado encontrado no enrichment.`
          );
        }
      } else {
        setMensagem(
          `❌ Erro: ${data.mensagem}

📋 Detalhes:
${JSON.stringify(data.detalhes || {}, null, 2)}`
        );
      }
    } catch (error) {
      setMensagem("❌ Erro na conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 px-4 py-10 text-white">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Consulta de CPF - API v3 (Idwall)
      </h1>

      <input
        type="text"
        placeholder="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="border border-gray-300 px-3 py-2 mb-3 w-full max-w-md rounded text-black"
      />

      <input
        type="text"
        placeholder="CPF (somente números)"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
        className="border border-gray-300 px-3 py-2 mb-3 w-full max-w-md rounded text-black"
      />

      <input
        type="date"
        placeholder="Data de Nascimento"
        value={dataNascimento}
        onChange={(e) => setDataNascimento(e.target.value)}
        className="border border-gray-300 px-3 py-2 mb-5 w-full max-w-md rounded text-black"
      />

      <button
        onClick={validarDados}
        className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-2 rounded disabled:opacity-50"
        disabled={carregando}
      >
        {carregando ? "Validando..." : "Validar"}
      </button>

      {mensagem && (
        <pre className="mt-6 text-sm text-gray-200 whitespace-pre-wrap max-w-2xl text-left bg-gray-800 p-4 rounded-md border border-gray-700">
          {mensagem}
        </pre>
      )}
    </div>
  );
}
