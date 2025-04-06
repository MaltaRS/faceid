'use client';

import { useRef, useState } from 'react';

export default function Page2() {
  const [modalTipo, setModalTipo] = useState<"cadastrar" | "validar" | null>(null);
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const abrirCamera = async () => {
    setFotoCapturada(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setMensagem('❌ Erro ao acessar a câmera.');
    }
  };

  const tirarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 300, 225);
        const imageData = canvasRef.current.toDataURL('image/png');
        setFotoCapturada(imageData);
        setMensagem("📸 Foto capturada com sucesso!");

        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    }
  };

  const enviarFoto = async () => {
    setMensagem("⏳ Enviando dados...");
    setCarregando(true);

    try {
      const rota = modalTipo === 'cadastrar' ? '/api/face-cadastrar' : '/api/face-validar';

      if (!cpf || !fotoCapturada || (modalTipo === 'cadastrar' && (!nome || !dataNascimento))) {
        setMensagem("❗️ Preencha todos os campos e capture a foto.");
        setCarregando(false);
        return;
      }

      const payload =
        modalTipo === 'cadastrar'
          ? { cpf, fotoBase64: fotoCapturada, nome, dataNascimento }
          : { cpf, fotoBase64: fotoCapturada };

      const res = await fetch(rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setMensagem(`✅ Resultado: ${data.mensagem || 'Operação concluída.'}`);
    } catch {
      setMensagem("❌ Erro ao enviar dados. Verifique sua conexão.");
    } finally {
      setCarregando(false);
      setModalTipo(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-indigo-400 text-center">🔐 Validação Facial</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <button
          onClick={() => { setModalTipo("cadastrar"); abrirCamera(); }}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded shadow text-white font-bold"
        >
          📥 Cadastrar FaceID
        </button>

        <button
          onClick={() => { setModalTipo("validar"); abrirCamera(); }}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded shadow text-white font-bold"
        >
          🧪 Validar FaceID
        </button>
      </div>

      {mensagem && (
        <div className={`max-w-lg w-full px-4 py-3 text-sm rounded shadow border mt-4
          ${mensagem.startsWith("✅") ? "bg-green-900/40 border-green-500 text-green-300" :
            mensagem.startsWith("❌") ? "bg-red-900/40 border-red-500 text-red-300" :
              "bg-yellow-900/40 border-yellow-500 text-yellow-300"}`}>
          {mensagem}
        </div>
      )}

      {/* MODAL */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalTipo(null)}
              className="absolute top-3 right-4 text-gray-300 hover:text-red-500 text-xl"
            >
              ✖
            </button>

            <h2 className="text-xl font-bold mb-4 text-center text-white">
              {modalTipo === "cadastrar" ? "📥 Cadastro de FaceID" : "🔍 Validação Facial"}
            </h2>

            <video ref={videoRef} className="w-full mb-4 rounded shadow-lg" />
            <canvas ref={canvasRef} width={300} height={225} className="hidden" />

            {!fotoCapturada && (
              <button
                onClick={tirarFoto}
                className="bg-yellow-500 hover:bg-yellow-600 w-full py-2 text-black font-bold rounded mb-4"
              >
                📸 Tirar Foto
              </button>
            )}

            {fotoCapturada && (
              <>
                <img src={fotoCapturada} alt="Foto capturada" className="w-full rounded mb-4 border border-gray-700" />

                <input
                  type="text"
                  placeholder="CPF (somente números)"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3 py-2 mb-3 rounded bg-gray-800 border border-gray-700 text-white"
                />

                {modalTipo === "cadastrar" && (
                  <>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-2 mb-3 rounded bg-gray-800 border border-gray-700 text-white"
                    />
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full px-3 py-2 mb-4 rounded bg-gray-800 border border-gray-700 text-white"
                    />
                  </>
                )}

                <button
                  onClick={enviarFoto}
                  disabled={carregando}
                  className="bg-indigo-600 hover:bg-indigo-700 w-full py-3 rounded text-white font-bold transition disabled:opacity-50"
                >
                  {carregando ? "⏳ Enviando..." : `🚀 Enviar para ${modalTipo === "cadastrar" ? "Cadastro" : "Validação"}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* OVERLAY LOADING */}
      {carregando && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg border border-indigo-500 shadow-xl text-center animate-pulse">
            <div className="text-indigo-300 mb-2 text-lg font-semibold">⏳ Aguarde...</div>
            <div className="text-white text-sm">Estamos validando sua face com a Idwall.</div>
          </div>
        </div>
      )}
    </div>
  );
}
