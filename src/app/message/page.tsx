'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MessagePage() {
  const [messages, setMessages] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCpfModal, setShowCpfModal] = useState(false)
  const [showLoadingModal, setShowLoadingModal] = useState(false)
  const [cpf, setCpf] = useState('')
  const [cpfValid, setCpfValid] = useState(false)
  const [cpfTouched, setCpfTouched] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [cpfLoading, setCpfLoading] = useState(false)
  const [cpfFound, setCpfFound] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; birthdate: string } | null>(null)
  interface IdwallData {
    fonteCompleta?: {
      personal?: Record<string, unknown>;
    };
    validacoes: string[];
    kycAprovado: boolean;
    statusKycBasico: string;
    logs: string[];
    segmentos: Array<{ id: string; name: string }>;
    perfilCriado: boolean;
  }

  const [idwallData, setIdwallData] = useState<IdwallData | null>(null)

  const chatRef = useRef<HTMLDivElement>(null)
  const emojis = ['😀', '😎', '🔥', '🥰', '💯', '🤖', '🚀', '😈']

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i)
    let firstCheck = 11 - (sum % 11)
    if (firstCheck >= 10) firstCheck = 0
    if (firstCheck !== parseInt(cpf.charAt(9))) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i)
    let secondCheck = 11 - (sum % 11)
    if (secondCheck >= 10) secondCheck = 0
    return secondCheck === parseInt(cpf.charAt(10))
  }

  const maskCpf = (value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, 11)
    return numeric
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const sendMessage = () => {
    if (!input.trim()) return
    setShowPaymentModal(true)
  }

  const handleCpfInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const masked = maskCpf(raw)
    setCpf(masked)
    setCpfTouched(true)
    setCpfValid(validateCPF(masked))
    setCpfFound(false)
    setUserInfo(null)
    setPaymentMethod('')
    setIdwallData(null)
  }

  const handlePaymentSelect = async (method: string) => {
    setPaymentMethod(method)
    if (!cpfValid) return
    setCpfLoading(true)

    try {
      const rawCpf = cpf.replace(/\D/g, '')
      const res = await fetch('/api/consultar-cpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: rawCpf }),
      })

      const data = await res.json()
      if (data?.nome && data?.nascimento) {
        setUserInfo({ name: data.nome, birthdate: data.nascimento })

        const enriched = data.fonteCompleta

        const validacoes: string[] = []

      
        
        
        

  

        setIdwallData({
          fonteCompleta: enriched,
          validacoes,
          kycAprovado: data.kycAprovado,
          statusKycBasico: data.statusKycBasico,
          logs: data.logs,
          segmentos: data.segmentos,
          perfilCriado: data.perfilCriado,
        })

        setCpfFound(true)
      } else {
        setUserInfo(null)
        setIdwallData(null)
        setCpfFound(false)
      }
    } catch (err) {
      console.error('[FRONT] Erro:', err)
      setUserInfo(null)
      setIdwallData(null)
      setCpfFound(false)
    } finally {
      setCpfLoading(false)
    }
  }

  const completePayment = () => {
    setShowCpfModal(false)
    setShowLoadingModal(true)
    setTimeout(() => {
      setMessages((prev) => [...prev, input])
      setInput('')
      setCpf('')
      setCpfValid(false)
      setCpfTouched(false)
      setPaymentMethod('')
      setCpfFound(false)
      setUserInfo(null)
      setIdwallData(null)
      setShowLoadingModal(false)
    }, 3000)
  }

  const renderIdwallData = () => {
    if (!idwallData) return null
    const enriched = idwallData.fonteCompleta || {}
    const validacoes = idwallData.validacoes || []
    const aprovado = idwallData.kycAprovado
    const logs = idwallData.logs || []
    const statusKycBasico = idwallData.statusKycBasico || 'Indefinido'
    const perfilCriado = idwallData.perfilCriado
    const segmentos = idwallData.segmentos || []
    const fonte = enriched || {}

    const badge = (texto: string, cor: string) => (
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${cor}`}>{texto}</span>
    )

  

    return (
      <div className="space-y-4 text-sm text-black bg-yellow-100 border border-yellow-300 p-2 rounded mt-2 max-h-56 overflow-y-auto relative">
        <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded-full">
          deslize para baixo
        </span>
        <h3 className={`font-bold text-lg ${aprovado ? 'text-green-600' : 'text-yellow-600'}`}>
          {aprovado ? '✅ Aprovado no KYC' : '⚠️ KYC ainda não aprovado'}
        </h3>

        <div className="space-y-2">
          <div>👤 Perfil: {badge(perfilCriado ? 'Criado' : 'Já existia', perfilCriado ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white')}</div>
          <div>📊 Enriquecimento: {badge(fonte ? 'Encontrado' : 'Não encontrado', fonte ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white')}</div>
          <div>🛡️ KYC Básico: {badge(statusKycBasico, statusKycBasico === 'Aprovado' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white')}</div>
          {segmentos.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              🎖️ Segmentos:
              {segmentos.map((s: { id: string; name: string }) => (
                <span key={s.id} className="px-2 py-1 text-xs rounded bg-indigo-700 text-white font-bold">{s.name}</span>
              ))}
            </div>
          )}
        </div>

        {validacoes.length > 0 && (
          <ul className="list-disc list-inside bg-white border border-gray-300 p-3 rounded text-black">
            {validacoes.map((v: string, i: number) => <li key={i}>{v}</li>)}
          </ul>
        )}

       

        {logs.length > 0 && (
          <div className="text-sm bg-white p-1 rounded border border-gray-300">
            <ul className="list-disc list-inside space-y-1">
              {logs.map((log: string, idx: number) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-3">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-emerald-600 max-w-sm px-5 py-3 rounded-2xl ml-auto shadow-xl"
            >
              {msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative border-t border-gray-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setShowEmojis(!showEmojis)} className="text-2xl hover:scale-110 transition-transform">😊</button>
        {showEmojis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 left-4 bg-white text-black rounded-xl p-3 grid grid-cols-4 gap-2 shadow-xl z-20"
          >
            {emojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(input + emoji)
                  setShowEmojis(false)
                }}
                className="hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-gray-800 text-white placeholder:text-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
        <button
          onClick={sendMessage}
          className="bg-gradient-to-r from-emerald-500 to-green-700 hover:opacity-90 px-5 py-2 rounded-xl font-semibold shadow-xl transition"
        >
          Enviar
        </button>
      </div>

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white text-black p-6 rounded-2xl w-[90%] max-w-sm text-center space-y-4 shadow-xl"
            >
              <h2 className="text-xl font-bold">Olá, recarregue para enviar mensagem</h2>
              <div className="space-y-2">
                {[{ label: 'R$ 10,00', icon: '🥉' }, { label: 'R$ 50,00', icon: '🥈' }, { label: 'R$ 100,00', icon: '🥇' }].map((opt, idx) => (
                  <button
                    key={idx}
                    className="w-full bg-gray-200 hover:bg-gray-300 p-3 rounded-lg flex justify-between items-center text-lg font-semibold"
                    onClick={() => {
                      setShowPaymentModal(false)
                      setShowCpfModal(true)
                    }}
                  >
                    {opt.label} <span>{opt.icon}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CPF Modal */}
      <AnimatePresence>
        {showCpfModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              className="bg-white text-black p-6 rounded-2xl w-[90%] max-w-sm space-y-4 shadow-xl"
            >
              <h2 className="text-lg font-bold">Insira seu CPF para prosseguir</h2>
              <input
                value={cpf}
                onChange={handleCpfInput}
                placeholder="000.000.000-00"
                className={`w-full px-4 py-3 border rounded-lg text-black ${cpfValid ? 'border-green-500' : cpfTouched && !cpfValid ? 'border-red-500' : 'border-gray-300'}`}
              />
              {!cpfValid && cpfTouched && cpf.replace(/\D/g, '').length === 11 && (
                <p className="text-sm text-red-600 font-medium">CPF inválido, verifique os dígitos.</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {['PIX', 'Crédito', 'Débito', 'Boleto'].map((method) => (
                  <button
                    key={method}
                    onClick={() => handlePaymentSelect(method)}
                    className={`py-2 rounded-lg font-semibold transition ${paymentMethod === method ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {cpfLoading && <p className="text-sm text-gray-500">Consultando dados do cidadão...</p>}

              {cpfFound && userInfo && (
                <div className="text-left text-sm mt-2 p-2 rounded bg-gray-100 text-black shadow">
                  <p><strong>Nome:</strong> {userInfo.name}</p>
                  <p><strong>Nascimento:</strong> {userInfo.birthdate}</p>
                </div>
              )}

              {renderIdwallData()}

              <button
                onClick={completePayment}
                disabled={!cpfFound || !paymentMethod}
                className={`w-full py-3 rounded-xl font-bold text-white ${cpfFound && paymentMethod ? 'bg-gradient-to-r from-emerald-500 to-green-700 hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                Pagar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Modal */}
      <AnimatePresence>
        {showLoadingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white text-black p-6 rounded-2xl text-center space-y-4 shadow-xl"
            >
              <Loader2 className="animate-spin mx-auto text-emerald-600" size={40} />
              <p className="text-lg font-semibold">Pagamento concluído</p>
              <p>Estamos enviando sua mensagem...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
