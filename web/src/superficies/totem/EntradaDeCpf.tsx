import { useEffect, useState } from 'react'
import { Delete, Eye, EyeOff } from 'lucide-react'
import { Titulo } from './Moldura'

// Etapa 1 do totem: a pessoa se identifica com o CPF, num teclado grande. A tela é pública, então os números
// ficam escondidos (•) até a pessoa tocar no olho. O CPF é a forma de entrar: não dá para pular (decisão de 15/11).

const TAMANHO = 11

/** 00000000191 -> 000.000.001-91; com `esconder`, • no lugar dos números. */
function formatar(digitos: string, esconder: boolean): string {
  const c = digitos.split('').map((d) => (esconder ? '•' : d))
  let texto = c.slice(0, 3).join('')
  if (c.length > 3) texto += `.${c.slice(3, 6).join('')}`
  if (c.length > 6) texto += `.${c.slice(6, 9).join('')}`
  if (c.length > 9) texto += `-${c.slice(9, 11).join('')}`
  return texto
}

export function EntradaDeCpf({ aoEntrar }: { aoEntrar: (cpf: string) => Promise<string | null> }) {
  const [digitos, setDigitos] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  function digitar(d: string) {
    setErro(null)
    setDigitos((atual) => (atual.length < TAMANHO ? atual + d : atual))
  }
  function apagar() {
    setErro(null)
    setDigitos((atual) => atual.slice(0, -1))
  }
  async function entrar() {
    if (entrando) return
    if (digitos.length < TAMANHO) {
      setErro('Digite os 11 números do CPF.')
      return
    }
    setEntrando(true)
    const problema = await aoEntrar(digitos)
    setEntrando(false)
    if (problema) {
      setErro(problema)
      setDigitos('')
    }
  }

  // Teclado físico também funciona (útil na demonstração no notebook).
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) digitar(e.key)
      else if (e.key === 'Backspace') apagar()
      else if (e.key === 'Enter') void entrar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const tecla = 'grid h-[3.1rem] place-items-center rounded-[0.75rem] transition active:scale-95'
  const teclaEscura = `${tecla} bg-gradient-to-b from-[#1d409a] to-[#152f78] text-[calc(1.4rem*var(--lm))] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.06]`

  return (
    <div className="flex flex-1 flex-col">
      <Titulo apoio="Só os números. Ninguém da empresa verá o que você digitar.">Digite seu CPF</Titulo>

      <div className="mt-[1.3rem] flex h-[4.06rem] shrink-0 items-center gap-[0.6rem] rounded-[0.9rem] bg-[#2a55b8]/30 pl-[1.4rem] pr-[1rem] ring-1 ring-[#7fa6ee]/45">
        <output
          aria-live="polite"
          aria-label={`CPF digitado: ${digitos.length} de ${TAMANHO} números`}
          className={`flex-1 text-[calc(1.3rem*var(--lm))] tracking-wide tabular-nums ${digitos ? 'font-medium text-white' : 'text-[#9db4e6]/80'}`}
        >
          {digitos ? formatar(digitos, !mostrar) : '000.000.000-00'}
        </output>
        <button
          type="button"
          onClick={() => setMostrar((m) => !m)}
          aria-label={mostrar ? 'Esconder os números' : 'Mostrar os números'}
          className="grid size-[2.4rem] place-items-center rounded-full"
        >
          {mostrar ? <Eye className="size-[1.35rem]" /> : <EyeOff className="size-[1.35rem]" />}
        </button>
      </div>
      <p className="flex min-h-[1.25rem] items-center text-[calc(0.72rem*var(--lm))] font-medium text-[#ffc078]" role="alert">
        {erro}
      </p>

      <div className="grid shrink-0 grid-cols-3 gap-[0.56rem]" role="group" aria-label="Teclado numérico">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => digitar(d)} className={teclaEscura}>
            {d}
          </button>
        ))}
        <button type="button" onClick={apagar} aria-label="Apagar" className={teclaEscura}>
          <Delete className="size-[1.5rem]" />
        </button>
        <button type="button" onClick={() => digitar('0')} className={teclaEscura}>
          0
        </button>
        <button type="button" onClick={entrar} className={`${tecla} bg-gradient-to-r from-[#1fe0b0] to-[#10c795] text-[calc(1.02rem*var(--lm))] font-semibold text-[#06204f]`}>
          {entrando ? '…' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
