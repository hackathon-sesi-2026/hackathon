import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Lock, Play } from 'lucide-react'
import { useParams } from 'react-router'
import { api, ErroDaApi } from '../../api/cliente'
import type { IntensidadeDor, LocalDor, TelaInicialDoTotem } from '../../api/tipos'
import { useRecurso } from '../../api/useRecurso'
import { AvisoDeFalha, TelaCheia } from '../../componentes/TelaCheia'
import { LogoMarca } from '../../componentes/Logo'
import { BonecoDaDor } from './BonecoDaDor'
import { EntradaDeCpf } from './EntradaDeCpf'
import { BotaoPrincipal, BotaoVoltar, Cabecalho, Palco, Progresso, Titulo } from './Moldura'

// Totem "Ponto de Cuidado" na unidade. A unidade vem do endereço do aparelho (/totem/:unidade), configurada
// uma vez na instalação. Fluxo: boas-vindas → CPF → sente dor? → (com dor) onde dói → como está → obrigado.
// O CPF diz quem está usando, mas o pulso continua anônimo: a resposta vai para a API sem o CPF.
//
// O visual segue o design do totem, uma tela de retrato de 24rem x 38.4rem. Enquanto o totem está aberto, o
// tamanho do rem acompanha a tela, e tudo escala junto, como no mockup.

type Etapa = 'boas_vindas' | 'cpf' | 'intensidade' | 'dor' | 'bem_estar' | 'obrigado'
type BemEstar = 1 | 2 | 3 | 4

const ETAPAS_COM_PROGRESSO: Etapa[] = ['cpf', 'intensidade', 'dor', 'bem_estar']

const OPCOES_DE_DOR: { valor: IntensidadeDor; rotulo: string; cor: string }[] = [
  { valor: 0, rotulo: 'Nenhuma', cor: '#1fe0b0' },
  { valor: 1, rotulo: 'Leve', cor: '#9be15d' },
  { valor: 2, rotulo: 'Média', cor: '#f5c451' },
  { valor: 3, rotulo: 'Forte', cor: '#f59a6b' },
]

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
  const [intensidade, setIntensidade] = useState<IntensidadeDor | null>(null)
  const [localDor, setLocalDor] = useState<LocalDor | null>(null)
  const [bemEstar, setBemEstar] = useState<BemEstar | null>(null)
  const [acessivel, setAcessivel] = useState(false)
  const [restante, setRestante] = useState(SEGUNDOS_PARADO)

  const recomecar = useCallback(() => {
    setEtapa('boas_vindas')
    setIntensidade(null)
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
  // "Letras maiores" aumenta só o texto em 30% (--lm), sem mexer nas caixas: a tela não pode ganhar rolagem.
  useEffect(() => {
    const raiz = document.documentElement
    raiz.style.fontSize = 'calc(min(100vw, 62.5dvh) / 24)'
    raiz.style.setProperty('--lm', acessivel ? '1.3' : '1')
    return () => {
      raiz.style.fontSize = ''
      raiz.style.removeProperty('--lm')
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
    setEtapa('intensidade')
    return null
  }

  async function enviarPulso() {
    if (!bemEstar) return
    const corpo = { bemEstar, intensidadeDor: intensidade, localDor: intensidade === 0 ? null : localDor }
    if (await enviar('post', `${base}/pulsos`, corpo)) setEtapa('obrigado')
  }

  function responderIntensidade(valor: IntensidadeDor) {
    setIntensidade(valor)
    if (valor === 0) setLocalDor(null)
    setEtapa(valor === 0 ? 'bem_estar' : 'dor')
  }

  const passo = ETAPAS_COM_PROGRESSO.indexOf(etapa) + 1

  return (
    <Palco ondas={passo ? 'baixas' : 'altas'}>
      <Cabecalho acessivel={acessivel} aoAlternarAcessibilidade={passo ? () => setAcessivel((a) => !a) : undefined} />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-[1.75rem] pb-[1.4rem]">
        {passo > 0 && <Progresso passo={passo} total={ETAPAS_COM_PROGRESSO.length} />}

        {etapa === 'boas_vindas' && <BoasVindas aoComecar={() => setEtapa('cpf')} />}

        {etapa === 'cpf' && <EntradaDeCpf aoEntrar={identificar} />}

        {etapa === 'intensidade' && <PerguntaDaDor escolhida={intensidade} aoResponder={responderIntensidade} aoVoltar={() => setEtapa('cpf')} />}

        {etapa === 'dor' && (
          <BonecoDaDor
            inicial={localDor}
            aoResponder={(local) => {
              setLocalDor(local)
              setEtapa('bem_estar')
            }}
            aoVoltar={() => setEtapa('intensidade')}
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
                    <span className={`px-[0.2rem] text-[calc(0.9rem*var(--lm))] leading-[1.25] ${escolhida ? 'font-semibold' : ''}`}>{rotulo}</span>
                  </button>
                )
              })}
            </div>
            <BotaoPrincipal onClick={enviarPulso} disabled={!bemEstar} className="mx-auto mt-[5.3rem] h-[3.5rem] w-[18.4rem] max-w-full text-[calc(1.25rem*var(--lm))]">
              Continuar
            </BotaoPrincipal>
            <BotaoVoltar onClick={() => setEtapa(intensidade === 0 ? 'intensidade' : 'dor')} className="mt-[2.4rem]" />
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
      <LogoMarca className="pointer-events-none absolute -right-[0.4rem] top-[2.4rem] w-[7.2rem] drop-shadow-[0_0_1.6rem_rgba(31,224,176,0.45)]" />
      <h1 className="relative mt-[4.3rem] text-[4.1rem] font-bold leading-none tracking-tight">Olá!</h1>
      <p className="relative mt-[1.3rem] text-[calc(1.32rem*var(--lm))] leading-[1.35]">
        Este é um momento
        <br />
        para <span className="font-semibold text-[#1fe0b0]">cuidar de você.</span>
      </p>
      <p className="relative mt-[1.7rem] max-w-[14.5rem] text-[calc(0.9rem*var(--lm))] leading-[1.4]">Responda algumas perguntas rápidas e ajude-nos a cuidar ainda melhor de você.</p>
      <BotaoPrincipal onClick={aoComecar} className="mx-auto mt-[3.2rem] h-[4.06rem] w-[17.5rem] max-w-full text-[calc(1.5rem*var(--lm))]">
        <Play className="size-[1.4rem] fill-[#06204f]" strokeWidth={0} /> Começar
      </BotaoPrincipal>
      <p className="mt-[1.9rem] flex items-center justify-center gap-[0.45rem] text-[calc(0.72rem*var(--lm))]">
        <Lock className="size-[0.95rem]" /> Seus dados são protegidos
      </p>
    </div>
  )
}

/**
 * "Você sente alguma dor hoje?": quatro botões largos, um embaixo do outro, fáceis de acertar com o dedo.
 * Um toque já responde e avança: "Nenhuma" pula o boneco; leve, média ou forte abre o "Onde dói mais?".
 */
function PerguntaDaDor({
  escolhida,
  aoResponder,
  aoVoltar,
}: {
  escolhida: IntensidadeDor | null
  aoResponder: (valor: IntensidadeDor) => void
  aoVoltar: () => void
}) {
  const [tocada, setTocada] = useState<IntensidadeDor | null>(escolhida)
  const respondendo = useRef(false)
  const tocar = (valor: IntensidadeDor) => {
    if (respondendo.current) return // um segundo toque no meio da transição não responde de novo
    respondendo.current = true
    setTocada(valor)
    // Um instante com o botão aceso, para a pessoa ver o que tocou antes de a tela mudar.
    setTimeout(() => aoResponder(valor), 260)
  }
  return (
    <div className="flex flex-1 flex-col">
      <Titulo apoio="Toque em uma opção.">Você sente alguma dor hoje?</Titulo>
      <div role="group" aria-label="Você sente alguma dor hoje" className="mt-[1.6rem] flex shrink-0 flex-col gap-[0.75rem]">
        {OPCOES_DE_DOR.map(({ valor, rotulo, cor }) => {
          const acesa = tocada === valor
          return (
            <button
              key={valor}
              type="button"
              onClick={() => tocar(valor)}
              aria-pressed={acesa}
              className={`flex h-[3.6rem] items-center gap-[1rem] rounded-[1.1rem] px-[1.2rem] text-left text-[calc(1.25rem*var(--lm))] font-semibold ring-2 transition-all [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                acesa ? 'bg-white/15 ring-[#1fe0b0] shadow-[0_0_1.2rem_rgba(31,224,176,0.45)]' : 'bg-white/[0.06] ring-white/25'
              }`}
            >
              <span className="flex items-end gap-[0.22rem]" aria-hidden>
                {[0, 1, 2].map((barra) => (
                  <span
                    key={barra}
                    className="w-[0.42rem] rounded-full"
                    style={{ height: `${0.7 + barra * 0.42}rem`, background: barra < valor ? cor : 'rgba(255,255,255,0.22)' }}
                  />
                ))}
              </span>
              <span className="flex-1">{rotulo}</span>
              <span className="size-[0.85rem] rounded-full" style={{ background: cor }} aria-hidden />
            </button>
          )
        })}
      </div>
      <div className="mt-auto pt-[1.6rem]">
        <BotaoVoltar onClick={aoVoltar} />
      </div>
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
      <h1 className="mt-[1.7rem] text-[calc(2.8rem*var(--lm))] font-bold leading-none">Obrigado!</h1>
      <p className="mt-[1.1rem] text-[calc(1.3rem*var(--lm))] leading-[1.3]">
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
      <p className="mt-[3.2rem] text-[calc(1.65rem*var(--lm))] font-extrabold italic leading-none tracking-tight">SESI</p>
    </div>
  )
}
