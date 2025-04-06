'use client';

import { useRef, useState, useEffect } from 'react';

export default function Page3() {
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [fotoFrente, setFotoFrente] = useState<string | null>(null);
  const [fotoVerso, setFotoVerso] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState('');
  interface ApiResponse {
    message?: string;
    success?: boolean;
    [key: string]: unknown;
  }
  
  const [respostaCompleta, setRespostaCompleta] = useState<ApiResponse | null>(null);
  const [etapa, setEtapa] = useState<'frente' | 'verso' | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const abrirCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        setCameraAtiva(true);
        setEtapa('frente');
        setMensagem('📸 Posicione a frente do RG na câmera');
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setMensagem('❌ Erro ao acessar a câmera. Verifique as permissões.');
    }
  };

  const tirarFoto = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      setMensagem('❌ Câmera não está pronta');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setMensagem('❌ Contexto de canvas não disponível');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    if (etapa === 'frente') {
      setFotoFrente(imageDataUrl);
      setMensagem('📸 Frente capturada! Agora posicione o verso');
      setEtapa('verso');
    } else {
      setFotoVerso(imageDataUrl);
      setMensagem('📸 Verso capturado! Revise os documentos');
      pararCamera();
    }
  };

  const pararCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraAtiva(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  const reiniciarCaptura = () => {
    pararCamera();
    setFotoFrente(null);
    setFotoVerso(null);
    setEtapa(null);
    setMensagem('');
    setRespostaCompleta(null);
  };

  const enviarDados = async () => {
    if (!cpf || !nome || !dataNascimento || !fotoFrente || !fotoVerso) {
      setMensagem('❗ Preencha todos os campos e capture ambas as imagens');
      return;
    }

    setCarregando(true);
    setMensagem('⏳ Enviando documentos para validação...');

    try {
      const response = await fetch('/api/rg-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cpf, 
          nome, 
          dataNascimento, 
          frente: fotoFrente, 
          verso: fotoVerso 
        }),
      });

      const data = await response.json();
      setRespostaCompleta(data);

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao enviar documentos');
      }

      setMensagem('✅ Documentos enviados com sucesso!');
    } catch (error) {
      console.error('Erro no envio:', error);
      setMensagem(`❌ ${(error as Error).message || 'Falha no envio'}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Cadastro de RG</h1>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Digite seu CPF"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Digite seu nome"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {!fotoFrente || !fotoVerso ? (
            <div className="mb-6">
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-64 object-contain"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex flex-col space-y-2">
                {!cameraAtiva ? (
                  <button
                    onClick={abrirCamera}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                  >
                    Abrir Câmera
                  </button>
                ) : (
                  <button
                    onClick={tirarFoto}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                  >
                    {etapa === 'frente' ? 'Capturar Frente do RG' : 'Capturar Verso do RG'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Frente do RG</p>
                  <img src={fotoFrente} alt="Frente do RG" className="w-full rounded border border-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Verso do RG</p>
                  <img src={fotoVerso} alt="Verso do RG" className="w-full rounded border border-gray-300" />
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={reiniciarCaptura}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md"
                >
                  Refazer Fotos
                </button>
                <button
                  onClick={enviarDados}
                  disabled={carregando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
                >
                  {carregando ? 'Enviando...' : 'Enviar Documentos'}
                </button>
              </div>
            </div>
          )}

          {mensagem && (
            <div className={`p-3 rounded-md text-center ${
              mensagem.includes('✅') ? 'bg-green-100 text-green-800' :
              mensagem.includes('❌') ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {mensagem}
            </div>
          )}

          {respostaCompleta && (
            <details className="mt-6 bg-gray-100 p-4 rounded text-sm">
              <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                📦 Ver detalhes da resposta
              </summary>
              <pre className="mt-2 overflow-auto max-h-96 text-xs text-gray-700">
                {JSON.stringify(respostaCompleta, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
