"use client";

import { useState } from "react";
import type { JSX } from "react";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cpf, dataNascimento }),
      });

      const data = await resposta.json();
      if (!resposta.ok) {
        setMensagem(
          <pre className="text-red-400 whitespace-pre-wrap bg-red-900/20 p-4 rounded border border-red-500">
            ❌ Erro: {data.mensagem}
            {"\n\n"}📋 Detalhes:
            {JSON.stringify(data.detalhes || {}, null, 2)}
          </pre>
        );
        return;
      }

      const enriched = data.fonteCompleta;
      const validacoes = data.validacoes || [];
      const aprovado = data.kycAprovado;
      const logs = data.logs || [];
      const statusKycBasico = data.statusKycBasico || "Indefinido";
      const perfilCriado = data.perfilCriado;
      const segmentos = data.segmentos || [];

      const badge = (texto: string, cor: string) => (
        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${cor}`}>
          {texto}
        </span>
      );

      const statusCard = (
        <div className="mb-4 space-y-2 text-sm bg-gray-800/50 p-4 rounded border border-gray-700 shadow">
          <div>
            👤 Perfil: {badge(perfilCriado ? "Criado" : "Já existia", perfilCriado ? "bg-green-600" : "bg-yellow-600")}
          </div>
          <div>
            📊 Enriquecimento: {badge(enriched ? "Encontrado" : "Não encontrado", enriched ? "bg-green-600" : "bg-yellow-600")}
          </div>
          <div>
            🛡️ KYC Básico: {badge(statusKycBasico, statusKycBasico === "Aprovado" ? "bg-green-600" : "bg-yellow-600")}
          </div>
          {segmentos.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              🎖️ Segmentos:
              {segmentos.map((s: { id: string; name: string }) => (
                <span key={s.id} className="px-2 py-1 text-xs rounded bg-indigo-700 text-white font-bold">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      );

      const fonte = enriched || data.detalhado?.personal || {};
      const personal = fonte?.personal || {};

      const cards = [
        { label: "Nome", value: personal.name },
        { label: "CPF", value: personal.cpfNumber },
        { label: "Nascimento", value: personal.birthDate },
        { label: "Renda", value: personal.income },
        { label: "Situação IR", value: personal.incomeTaxSituation },
        { label: "PEP", value: personal.pep ? "Sim" : "Não" },
      ];

      setMensagem(
        <div className="space-y-6">
          <h2 className={`text-xl font-bold ${aprovado ? "text-green-400" : "text-yellow-400"}`}>
            {aprovado ? "✅ Aprovado no KYC" : "⚠️ KYC ainda não aprovado"}
          </h2>

          {statusCard}

          {validacoes.length > 0 && (
            <ul className="list-disc list-inside bg-gray-800/40 p-4 rounded border border-gray-700 text-sm">
              {validacoes.map((v: string, i: number) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, idx) => (
              <div key={idx} className="bg-gray-800 p-4 rounded border border-gray-700 shadow-md">
                <p className="text-gray-400 text-sm font-medium">{card.label}</p>
                <p className="text-white font-semibold">{card.value || "-"}</p>
              </div>
            ))}
          </div>

          {logs.length > 0 && (
            <div className="text-sm text-gray-300 bg-gray-800/30 p-4 rounded border border-gray-700">
              <p className="font-semibold mb-2">📋 Logs do processo:</p>
              <ul className="list-disc list-inside space-y-1">
                {logs.map((log: string, idx: number) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error(error);
      setMensagem(
        <span className="text-red-400 bg-red-900/20 p-4 rounded border border-red-500">
          ❌ Erro na conexão com o servidor.
        </span>
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4 py-12 text-white">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-indigo-400">
          Validação de CPF – API Idwall v3
        </h1>

        <div className="bg-gray-900 border border-gray-700 rounded p-6 shadow-md space-y-4">
          <input
            type="text"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="text"
            placeholder="CPF (somente números)"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="date"
            placeholder="Data de Nascimento"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={validarDados}
            disabled={carregando}
            className="w-full bg-indigo-600 hover:bg-indigo-700 transition font-bold py-3 rounded text-white disabled:opacity-50"
          >
            {carregando ? "Validando..." : "Validar"}
          </button>
        </div>

        {mensagem && (
          <div className="mt-8 bg-gray-950 p-6 rounded-lg border border-gray-700 shadow-lg">
            {mensagem}
          </div>
        )}
      </div>
    </div>
  );
}
