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
  const chatRef = useRef<HTMLDivElement>(null)

  const emojis = ['😀', '😎', '🔥', '🥰', '💯', '🤖', '🚀', '😈']

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let firstCheck = 11 - (sum % 11)
    if (firstCheck >= 10) firstCheck = 0
    if (firstCheck !== parseInt(cpf.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i)
    }
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
      setShowLoadingModal(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Conversa */}
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

      {/* Campo de envio */}
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

      {/* Modal 1 – Selecionar valor */}
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

      {/* Modal 2 – CPF e métodos */}
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
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-lg font-semibold transition ${paymentMethod === method ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <button
                onClick={completePayment}
                disabled={!cpfValid || !paymentMethod}
                className={`w-full py-3 rounded-xl font-bold text-white ${cpfValid && paymentMethod ? 'bg-gradient-to-r from-emerald-500 to-green-700 hover:opacity-90' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                Pagar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal 3 – Loading */}
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
