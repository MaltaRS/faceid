"use client";

import { useState } from "react";
import type { JSX } from "react"; // ✅ Importação necessária

export default function ValidadorIdwallPage() {
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [mensagem, setMensagem] = useState<JSX.Element | string>("");
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
        body: JSON.stringify({ nome, cpf, dataNascimento }),
      });

      const data = await resposta.json();
      console.log("📥 Resposta completa recebida:", data);

      if (resposta.ok) {
        const enriched = data.fonteCompleta;
        const validacoes = data.validacoes || [];
        const aprovado = data.kycAprovado;
        const logs = data.logs || [];

        if (enriched && enriched.personal) {
          const cards = [
            { label: "Nome", value: enriched.personal.name },
            { label: "CPF", value: enriched.personal.cpfNumber },
            { label: "Nascimento", value: enriched.personal.birthDate },
            { label: "Renda", value: enriched.personal.income },
            { label: "Situação IR", value: enriched.personal.incomeTaxSituation },
            { label: "PEP", value: enriched.personal.pep ? "Sim" : "Não" },
          ];

          setMensagem(
            <div>
              <h2 className={`text-xl font-bold mb-4 ${aprovado ? "text-green-400" : "text-yellow-400"}`}>
                {aprovado ? "✅ Aprovado no KYC" : "⚠️ Divergência Encontrada"}
              </h2>
              {validacoes.length > 0 && (
                <ul className="list-disc list-inside mb-4">
                  {validacoes.map((v: string, i: number) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {cards.map((card, idx) => (
                  <div key={idx} className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="font-bold text-gray-300">{card.label}</p>
                    <p className="text-white">{card.value || "-"}</p>
                  </div>
                ))}
              </div>
              {logs.length > 0 && (
                <div className="text-sm text-gray-400">
                  <p className="font-semibold mb-1">📋 Logs do processo:</p>
                  <ul className="list-disc list-inside">
                    {logs.map((log: string, idx: number) => (
                      <li key={idx}>{log}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        } else {
          setMensagem(
            <div className="text-yellow-400">
              ⚠️ Nenhum dado de enriquecimento encontrado.
              <br /> Verifique no dashboard se o fluxo foi concluído.
              <br />
              <button onClick={validarDados} className="mt-4 underline">
                🔁 Tentar novamente
              </button>
            </div>
          );
        }
      } else {
        setMensagem(
          <pre className="text-red-400 whitespace-pre-wrap">
❌ Erro: {data.mensagem}

📋 Detalhes:
{JSON.stringify(data.detalhes || {}, null, 2)}
          </pre>
        );
      }
    } catch (error) {
      setMensagem(<span className="text-red-400">❌ Erro na conexão com o servidor.</span>);
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
        <div className="mt-6 text-sm text-gray-200 max-w-2xl text-left">
          {mensagem}
        </div>
      )}
    </div>
  );
}