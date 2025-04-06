"use client";

import { useState, useRef } from "react";
import type { JSX } from "react";

export default function Page2() {
  const [cpf, setCpf] = useState("");
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<JSX.Element | string>("");
  const [carregando, setCarregando] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao acessar a câmera.";
      setMensagem(`❌ ${errorMessage}`);
    }
  };

  const capturarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const base64 = canvasRef.current.toDataURL("image/jpeg");
        setFotoBase64(base64);
      }
    }
  };

  const enviarFoto = async (tipo: "cadastrar" | "verificar") => {
    if (!cpf || !fotoBase64) {
      setMensagem("⚠️ CPF e foto são obrigatórios.");
      return;
    }

    setCarregando(true);
    setMensagem("⌛ Processando...");

    try {
      const res = await fetch("/api/face-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, imagem: fotoBase64, tipo }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensagem(<span className="text-red-400">❌ Erro: {data.mensagem}</span>);
        return;
      }

      setMensagem(
        <div className="text-green-400 text-sm whitespace-pre-wrap">
          ✅ {tipo === "cadastrar" ? "Cadastro facial feito com sucesso!" : "Validação facial concluída!"}
          <br />
          {JSON.stringify(data.resultado, null, 2)}
        </div>
      );
    } catch (err) {
      setMensagem(<span className="text-red-500">❌ Erro de rede: {err instanceof Error ? err.message : 'Erro desconhecido'}</span>);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">FaceID - Reconhecimento Facial</h1>

      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="CPF (somente números)"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          className="w-full px-4 py-2 rounded border text-black"
        />

        <div className="flex flex-col items-center gap-4">
          <video ref={videoRef} width="300" height="300" className="rounded border" />
          <canvas ref={canvasRef} width="300" height="300" className="hidden" />
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            onClick={iniciarCamera}
            disabled={carregando}
          >
            📸 Iniciar Câmera
          </button>

          <button
            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
            onClick={capturarFoto}
            disabled={carregando}
          >
            🧠 Capturar Foto
          </button>
        </div>

        {fotoBase64 && (
          <img src={fotoBase64} alt="Foto capturada" className="w-40 h-40 mx-auto rounded border" />
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <button
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded"
            onClick={() => enviarFoto("cadastrar")}
            disabled={carregando || !fotoBase64}
          >
            ✅ Cadastrar Face
          </button>

          <button
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded"
            onClick={() => enviarFoto("verificar")}
            disabled={carregando || !fotoBase64}
          >
            🔍 Verificar Face
          </button>
        </div>

        {mensagem && (
          <div className="mt-6 text-sm max-w-xl text-left bg-gray-800 p-4 rounded border border-gray-700">
            {mensagem}
          </div>
        )}
      </div>
    </div>
  );
}
