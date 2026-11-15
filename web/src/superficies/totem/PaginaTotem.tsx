import { useCallback, useEffect, useState } from 'react'
import { Check, Lock, Play } from 'lucide-react'
import { useParams } from 'react-router'
import { api, ErroDaApi } from '../../api/cliente'
import type { LocalDor, TelaInicialDoTotem } from '../../api/tipos'
import { useRecurso } from '../../api/useRecurso'
import { AvisoDeFalha, TelaCheia } from '../../componentes/TelaCheia'
import { BonecoDaDor } from './BonecoDaDor'
import { EntradaDeCpf } from './EntradaDeCpf'
import { BotaoPrincipal, BotaoVoltar, Cabecalho, Palco, Progresso, Titulo } from './Moldura'

// Totem "Ponto de Cuidado" na unidade. A unidade vem do endereço do aparelho (/totem/:unidade), configurada
// uma vez na instalação. Fluxo: boas-vindas → CPF → onde dói → como está → obrigado.
// O CPF diz quem está usando, mas o pulso continua anônimo: a resposta vai para a API sem o CPF.
//
// O visual segue o design do totem, uma tela de retrato de 24rem x 38.4rem. Enquanto o totem está aberto, o
// tamanho do rem acompanha a tela, e tudo escala junto, como no mockup.

type Etapa = 'boas_vindas' | 'cpf' | 'dor' | 'bem_estar' | 'obrigado'
type BemEstar = 1 | 2 | 3 | 4

const ETAPAS_COM_PROGRESSO: Etapa[] = ['cpf', 'dor', 'bem_estar']

/** Sem toque por este tempo, o totem volta ao começo, para ninguém continuar o que outra pessoa deixou aberto. */
const SEGUNDOS_PARADO = 45
const SEGUNDOS_NO_OBRIGADO = 8

const OPCOES_DE_BEM_ESTAR: { valor: BemEstar; rotulo: string }[] = [
  { valor: 4, rotulo: 'Muito bem' },
  { valor: 3, rotulo: 'Bem' },
  { valor: 2, rotulo: 'Mais ou menos' },
  { valor: 1, rotulo: 'Cansado(a)' },
]

export function PaginaTotem() {
  const { unidade: slug = '' } = useParams()
  const base = `/totem/${slug}`
  const { dados: totem, erro, falha, enviar } = useRecurso<TelaInicialDoTotem>(base, `${base}/eventos`)
  const [etapa, setEtapa] = useState<Etapa>('boas_vindas')
  const [localDor, setLocalDor] = useState<LocalDor | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar | null>(null)
  const [acessivel, setAcessivel] = useState(false)
  const [restante, setRestante] = useState(SEGUNDOS_PARADO)

  const recomecar = useCallback(() => {
    setEtapa('boas_vindas')
    setLocalDor(null)
    setBemEstar(null)
  }, [])

  // Volta ao começo depois de um tempo parado (no "Obrigado!", depois de poucos segundos).
  const limite = etapa === 'obrigado' ? SEGUNDOS_NO_OBRIGADO : SEGUNDOS_PARADO
  useEffect(() => {
    if (etapa === 'boas_vindas') return
    setRestante(limite)
    const id = setInterval(() => setRestante((s) => s - 1), 1000)
    const tocou = () => setRestante(limite)
    window.addEventListener('pointerdown', tocou)
    return () => {
      clearInterval(id)
      window.removeEventListener('pointerdown', tocou)
    }
  }, [etapa, limite])
  useEffect(() => {
    if (restante <= 0 && etapa !== 'boas_vindas') recomecar()
  }, [restante, etapa, recomecar])

  // O rem acompanha a tela: 24rem é a largura do design, limitada pela altura (proporção 0,625).
  // Com "Acessibilidade", tudo fica 12% maior.
  useEffect(() => {
    const raiz = document.documentElement
    raiz.style.fontSize = `calc(min(100vw, 62.5dvh) / 24 * ${acessivel ? 1.12 : 1})`
    return () => {
      raiz.style.fontSize = ''
    }
  }, [acessivel])

  if (!totem) return <TelaCheia>{erro ? 'Totem não encontrado. Confira o endereço da unidade.' : 'Preparando o totem…'}</TelaCheia>

  /** Confere o CPF nesta unidade. Devolve a mensagem de erro para a tela, ou null quando deu certo. */
  async function identificar(cpf: string): Promise<string | null> {
    try {
      await api.post(`${base}/identificacao`, { cpf })
    } catch (e) {
      return e instanceof ErroDaApi && e.status === 404 ? 'CPF não encontrado nesta unidade. Confira os números.' : 'Não foi possível entrar. Tente de novo.'
    }
    setEtapa('dor')
    return null
  }

  async function enviarPulso() {
    if (!bemEstar) return
    if (await enviar('post', `${base}/pulsos`, { bemEstar, localDor })) setEtapa('obrigado')
  }

  const passo = ETAPAS_COM_PROGRESSO.indexOf(etapa) + 1

  return (
    <Palco ondas={passo ? 'baixas' : 'altas'}>
      <Cabecalho acessivel={acessivel} aoAlternarAcessibilidade={passo ? () => setAcessivel((a) => !a) : undefined} />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-[1.75rem] pb-[1.4rem]">
        {passo > 0 && <Progresso passo={passo} total={ETAPAS_COM_PROGRESSO.length} />}

        {etapa === 'boas_vindas' && <BoasVindas aoComecar={() => setEtapa('cpf')} />}

        {etapa === 'cpf' && <EntradaDeCpf aoEntrar={identificar} aoPular={() => setEtapa('dor')} />}

        {etapa === 'dor' && (
          <BonecoDaDor
            aoResponder={(local) => {
              setLocalDor(local)
              setEtapa('bem_estar')
            }}
            aoVoltar={() => setEtapa('cpf')}
          />
        )}

        {etapa === 'bem_estar' && (
          <div className="flex flex-1 flex-col">
            <Titulo apoio="Avalie seu bem-estar de forma rápida.">Como você está hoje?</Titulo>
            <div role="group" aria-label="Como você está hoje" className="mt-[3.8rem] grid shrink-0 grid-cols-4">
              {OPCOES_DE_BEM_ESTAR.map(({ valor, rotulo }) => {
                const escolhida = bemEstar === valor
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setBemEstar(valor)}
                    aria-pressed={escolhida}
                    className="flex flex-col items-center gap-[0.75rem] [-webkit-tap-highlight-color:transparent]"
                  >
                    <span className="grid h-[4.6rem] place-items-center">
                      <Rosto valor={valor} escolhido={escolhida} />
                    </span>
                    <span className={`px-[0.2rem] text-[0.9rem] leading-[1.25] ${escolhida ? 'font-semibold' : ''}`}>{rotulo}</span>
                  </button>
                )
              })}
            </div>
            <BotaoPrincipal onClick={enviarPulso} disabled={!bemEstar} className="mx-auto mt-[5.3rem] h-[3.5rem] w-[18.4rem] max-w-full text-[1.25rem]">
              Continuar
            </BotaoPrincipal>
            <BotaoVoltar onClick={() => setEtapa('dor')} className="mt-[2.4rem]" />
          </div>
        )}

        {etapa === 'obrigado' && <Obrigado />}
      </main>
      <AvisoDeFalha mensagem={falha} />
    </Palco>
  )
}

/** Boas-vindas: "Olá!", o coração com a pessoa e o botão "Começar". */
function BoasVindas({ aoComecar }: { aoComecar: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <CoracaoComPessoa className="pointer-events-none absolute -right-[1.5rem] top-[4.3rem] w-[9.7rem]" />
      <h1 className="relative mt-[4.3rem] text-[4.1rem] font-bold leading-none tracking-tight">Olá!</h1>
      <p className="relative mt-[1.3rem] text-[1.32rem] leading-[1.35]">
        Este é um momento
        <br />
        para <span className="font-semibold text-[#1fe0b0]">cuidar de você.</span>
      </p>
      <p className="relative mt-[1.7rem] max-w-[14.5rem] text-[0.9rem] leading-[1.4]">Responda algumas perguntas rápidas e ajude-nos a cuidar ainda melhor de você.</p>
      <BotaoPrincipal onClick={aoComecar} className="mx-auto mt-[3.2rem] h-[4.06rem] w-[17.5rem] max-w-full text-[1.5rem]">
        <Play className="size-[1.4rem] fill-[#06204f]" strokeWidth={0} /> Começar
      </BotaoPrincipal>
      <p className="mt-[1.9rem] flex items-center justify-center gap-[0.45rem] text-[0.72rem]">
        <Lock className="size-[0.95rem]" /> Seus dados são protegidos
      </p>
    </div>
  )
}

/** Rosto do "Como você está hoje?". O escolhido fica maior, verde e com brilho. */
function Rosto({ valor, escolhido }: { valor: BemEstar; escolhido: boolean }) {
  const cor = escolhido ? '#4ff0c6' : '#a8c0f5'
  const traco = { fill: 'none', stroke: cor, strokeWidth: escolhido ? 2.6 : 1.8, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 56 56" className={`transition-all ${escolhido ? 'size-[4.6rem] drop-shadow-[0_0_0.7rem_rgba(31,224,176,0.75)]' : 'size-[3.45rem]'}`} aria-hidden>
      {escolhido && <circle cx="28" cy="28" r="26" fill="none" stroke="#1fe0b0" strokeWidth="2.6" />}
      <circle cx="28" cy="28" r={escolhido ? 20 : 26} fill={escolhido ? 'rgba(25,211,162,0.28)' : 'none'} stroke={cor} strokeWidth={escolhido ? 2.6 : 1.8} />
      <circle cx="21.5" cy="23.5" r="2.2" fill={cor} />
      <circle cx="34.5" cy="23.5" r="2.2" fill={cor} />
      {valor === 4 && <path d="M18.5 30 Q28 43 37.5 30 Z" fill={cor} stroke={cor} strokeWidth="1.5" strokeLinejoin="round" />}
      {valor === 3 && <path d="M19 31 Q28 39.5 37 31" {...traco} />}
      {valor === 2 && <path d="M21 36 Q28 32 35 36" {...traco} />}
      {valor === 1 && <path d="M19 38 Q28 28.5 37 38" {...traco} />}
    </svg>
  )
}

/** "Obrigado!" com o check em destaque. Volta sozinho ao começo. */
function Obrigado() {
  const risco = 'absolute h-[0.3rem] w-[1.45rem] rounded-full bg-[#1fe0b0]'
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <div className="relative mt-[4.1rem] shrink-0">
        <span className={risco} style={{ left: '-3.4rem', top: '0.5rem', transform: 'rotate(32deg)' }} aria-hidden />
        <span className={risco} style={{ left: '-3.8rem', top: '2.35rem', transform: 'rotate(8deg)' }} aria-hidden />
        <span className={risco} style={{ right: '-3.4rem', top: '0.5rem', transform: 'rotate(-32deg)' }} aria-hidden />
        <span className={risco} style={{ right: '-3.8rem', top: '2.35rem', transform: 'rotate(-8deg)' }} aria-hidden />
        <span className="grid size-[7.4rem] place-items-center rounded-full border-[0.45rem] border-[#1fe0b0] bg-[#0a2a70] shadow-[0_0_2.2rem_rgba(31,224,176,0.5),inset_0_0_1.2rem_rgba(31,224,176,0.25)]">
          <Check className="size-[4rem]" strokeWidth={3} />
        </span>
      </div>
      <h1 className="mt-[1.7rem] text-[2.8rem] font-bold leading-none">Obrigado!</h1>
      <p className="mt-[1.1rem] text-[1.3rem] leading-[1.3]">
        Sua participação
        <br />é muito importante.
      </p>
      <svg viewBox="0 0 64 60" className="mt-[2.4rem] w-[3.9rem] shrink-0" aria-hidden>
        <defs>
          <linearGradient id="coracao-obrigado" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3aa0ff" />
            <stop offset="1" stopColor="#1fe0b0" />
          </linearGradient>
        </defs>
        <path
          d="M32 54C15 41 5 31 5 19.5 5 11 11.5 5 19.5 5c5.2 0 9.6 2.8 12.5 7.2C34.9 7.8 39.3 5 44.5 5 52.5 5 59 11 59 19.5 59 31 49 41 32 54Z"
          fill="none"
          stroke="url(#coracao-obrigado)"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-[3.2rem] text-[1.65rem] font-extrabold italic leading-none tracking-tight">SESI</p>
    </div>
  )
}

/** Coração em contorno brilhante, com a pessoa de braços abertos dentro (a marca do Selo Saúde, grande). */
function CoracaoComPessoa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 196" className={className} aria-hidden>
      <defs>
        <linearGradient id="contorno-do-coracao" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1fd6c8" />
          <stop offset="0.55" stopColor="#1f9ae8" />
          <stop offset="1" stopColor="#2b62e6" />
        </linearGradient>
        <linearGradient id="corpo-da-pessoa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fb4ff" />
          <stop offset="0.6" stopColor="#3d7cf0" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2b62e6" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="cabeca-da-pessoa" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#bfe0ff" />
          <stop offset="1" stopColor="#5a9cf5" />
        </radialGradient>
        <filter id="brilho-do-coracao" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="7" result="desfoque" />
          <feMerge>
            <feMergeNode in="desfoque" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M100 180C44 138 12 104 12 66 12 37 34 16 61 16c17 0 31 9 39 25 8-16 22-25 39-25 27 0 49 21 49 50 0 38-32 72-88 114Z"
        fill="none"
        stroke="url(#contorno-do-coracao)"
        strokeWidth="11"
        strokeLinejoin="round"
        filter="url(#brilho-do-coracao)"
      />
      <circle cx="100" cy="66" r="15" fill="url(#cabeca-da-pessoa)" />
      <path d="M52 76C66 92 84 100 100 100S134 92 148 76C143 104 126 122 112 130L106 176Q100 186 94 176L88 130C74 122 57 104 52 76Z" fill="url(#corpo-da-pessoa)" />
    </svg>
  )
}
