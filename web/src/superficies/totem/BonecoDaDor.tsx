import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { LocalDor } from '../../api/tipos'
import { BotaoPrincipal, BotaoVoltar, Titulo } from './Moldura'

// Etapa "Onde dói mais?" do totem. Desenho próprio, no jeito do mapa corporal do Questionário Nórdico (o
// questionário de dor usado com trabalhadores): uma pessoa simples, de frente e de costas, dividida em peças
// bem marcadas. Quem usa é o operador, muitas vezes com pouca leitura: a figura precisa se explicar sozinha.
// - Cada parte é uma peça separada por uma linha visível; tocar a peça acende a parte inteira.
// - A frente tem rosto e a de costas tem cabelo, para não confundir os lados.
// - Peças pequenas (mãos, pescoço, joelhos, pés) têm uma margem invisível em volta, para o dedo.
// Só a região vai para a API, sem nada que identifique quem tocou.

type Vista = 'frente' | 'costas'

/** Nome completo da região, lido pelo leitor de tela e mostrado depois do toque. */
export const ROTULO_LOCAL_DOR: Record<LocalDor, string> = {
  cabeca: 'Cabeça',
  pescoco: 'Pescoço',
  ombros: 'Ombros',
  peito: 'Peito',
  barriga: 'Barriga',
  bracos: 'Braços e cotovelos',
  maos_punhos: 'Mãos e punhos',
  costas: 'Costas (parte de cima)',
  lombar: 'Lombar (parte de baixo das costas)',
  quadril: 'Quadril',
  joelhos: 'Joelhos',
  pernas_pes: 'Pernas e pés',
}

// ---------------------------------------------------------------- o desenho (figura de 100 x 205, centro em x = 50)

interface Peca {
  local: LocalDor
  d: string
  /** Desenha também o lado direito, espelhado. */
  par?: boolean
  /** Peça pequena: ganha margem de toque em volta. */
  pequena?: boolean
}

const cabeca = 'M50 3.5 C57 3.5 61 9 61 16 C61 23.5 56.5 29 50 29 C43.5 29 39 23.5 39 16 C39 9 43 3.5 50 3.5 Z'
const pescoco = 'M44.5 26 Q50 29.5 55.5 26 L56.5 37.5 Q50 40 43.5 37.5 Z'
const ombro = 'M37 39 Q28.5 38.5 24.5 43.5 Q21.5 48 22.5 55.5 L30.5 55.5 Q32.5 47.5 36.5 45 Z'
const bracoDeCima = 'M22.5 55.5 L30.5 55.5 Q31.5 70 29.8 84 L21.2 84 Q20.5 70 22.5 55.5 Z'
const antebraco = 'M21.2 84 L29.8 84 Q29 97.5 26.6 110 L19.4 110 Q19.2 97.5 21.2 84 Z'
const mao = 'M19.4 110 L26.6 110 Q28.6 115.5 27.8 121 Q26.6 127.5 22 127.5 Q17.4 127 17 120.5 Q16.8 114.5 19.4 110 Z'
const coxa = 'M32.2 116.5 L46.2 118.6 Q47.2 132.5 45.2 146 L34.2 146 Q32 132 32.2 116.5 Z'
const joelho = 'M34.2 146 L45.2 146 Q46.4 151 45.2 156.5 L34.4 156.5 Q33.2 151 34.2 146 Z'
const canela = 'M34.4 156.5 L45.2 156.5 Q45.4 175.5 43.4 194 L36.6 194 Q34.4 175.5 34.4 156.5 Z'
const pe = 'M36.6 194 L43.4 194 Q45.4 198.5 44.6 202.5 L32.8 202.5 Q32.2 198.5 36.6 194 Z'

const PECAS: Record<Vista, Peca[]> = {
  frente: [
    { local: 'cabeca', d: cabeca },
    { local: 'pescoco', d: pescoco, pequena: true },
    { local: 'ombros', d: ombro, par: true },
    { local: 'peito', d: 'M37 39 Q50 36.5 63 39 L63.5 45 Q67 58 64.4 72 L35.6 72 Q33 58 36.5 45 Z' },
    { local: 'barriga', d: 'M35.6 72 L64.4 72 Q65 86 66 100 L34 100 Q35 86 35.6 72 Z' },
    { local: 'quadril', d: 'M34 100 L66 100 Q67.8 108 67.8 116.5 L53.8 118.6 Q50 121.5 46.2 118.6 L32.2 116.5 Q32.2 108 34 100 Z' },
    { local: 'bracos', d: bracoDeCima, par: true },
    { local: 'bracos', d: antebraco, par: true },
    { local: 'maos_punhos', d: mao, par: true, pequena: true },
    { local: 'pernas_pes', d: coxa, par: true },
    { local: 'joelhos', d: joelho, par: true, pequena: true },
    { local: 'pernas_pes', d: canela, par: true },
    { local: 'pernas_pes', d: pe, par: true, pequena: true },
  ],
  costas: [
    { local: 'cabeca', d: cabeca },
    { local: 'pescoco', d: pescoco, pequena: true },
    { local: 'ombros', d: ombro, par: true },
    { local: 'costas', d: 'M37 39 Q50 36.5 63 39 L63.5 45 Q67 62 65 80 L35 80 Q33 62 36.5 45 Z' },
    { local: 'lombar', d: 'M35 80 L65 80 Q65.5 90 66 100 L34 100 Q34.5 90 35 80 Z' },
    // Glúteos em duas peças: deixa claro que esta é a figura de costas.
    { local: 'quadril', d: 'M34 100 L50 100 L50 120 Q41 122.5 32.2 117 Q32.2 108 34 100 Z', par: true },
    { local: 'bracos', d: bracoDeCima, par: true },
    { local: 'bracos', d: antebraco, par: true },
    { local: 'maos_punhos', d: mao, par: true, pequena: true },
    { local: 'pernas_pes', d: 'M32.2 117 Q41 122.5 46.2 120 Q47.2 133 45.2 146 L34.2 146 Q32 132 32.2 117 Z', par: true },
    { local: 'joelhos', d: joelho, par: true, pequena: true },
    { local: 'pernas_pes', d: 'M34.4 156.5 L45.2 156.5 Q46.6 170 43.4 194 L36.6 194 Q33 172 34.4 156.5 Z', par: true },
    { local: 'pernas_pes', d: 'M36.6 194 L43.4 194 Q44.6 198.5 43.8 202.5 L35 202.5 Q34.2 198.5 36.6 194 Z', par: true, pequena: true },
  ],
}

const ESPELHO = 'translate(100 0) scale(-1 1)'
const ambos = (par: boolean | undefined, desenho: (t?: string) => ReactNode) => (
  <>
    {desenho()}
    {par && desenho(ESPELHO)}
  </>
)

/** Regiões que existem nas duas figuras entram no Tab e no leitor de tela uma vez só, pela frente. */
const SO_NAS_COSTAS: LocalDor[] = ['costas', 'lombar']
const SO_NA_FRENTE: LocalDor[] = ['peito', 'barriga']

const COR = {
  peca: 'url(#cor-da-peca)',
  linha: '#0c2559',
  escolhida: '#3ee8c0',
  detalhe: '#0c2559',
}

function Figura({ vista, x, escolhido, aoTocar }: { vista: Vista; x: number; escolhido: LocalDor | null; aoTocar: (l: LocalDor) => void }) {
  const tecla = (local: LocalDor) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      aoTocar(local)
    }
  }
  // Agrupa as peças por região: um botão por região, com todas as suas peças.
  const regioes = [...new Set(PECAS[vista].map((p) => p.local))]

  return (
    <g transform={`translate(${x} 0) translate(50 0) scale(${MAIS_CHEIO} 1) translate(-50 0)`}>
      {/* Margem de toque das peças pequenas: um contorno largo e invisível, por baixo das peças. */}
      {PECAS[vista]
        .filter((p) => p.pequena)
        .map((p, i) => (
          <g key={`margem-${i}`} onClick={() => aoTocar(p.local)} aria-hidden>
            {ambos(p.par, (t) => (
              <path d={p.d} transform={t} fill="none" stroke="transparent" strokeWidth={7} strokeLinejoin="round" pointerEvents="stroke" />
            ))}
          </g>
        ))}

      <g filter="url(#sombra-da-figura)">
        {regioes.map((local) => {
          const ativa = escolhido === local
          const acessivel = vista === 'frente' ? !SO_NAS_COSTAS.includes(local) : SO_NAS_COSTAS.includes(local) || false
          const visivelNoLeitor = acessivel && !(vista === 'costas' && SO_NA_FRENTE.includes(local))
          return (
            <g
              key={local}
              {...(visivelNoLeitor
                ? { role: 'button', 'aria-label': ROTULO_LOCAL_DOR[local], 'aria-pressed': ativa, tabIndex: 0, onKeyDown: tecla(local) }
                : { 'aria-hidden': true })}
              onClick={() => aoTocar(local)}
              className="cursor-pointer outline-none [&:focus-visible>path]:stroke-white"
              filter={ativa ? 'url(#brilho-da-escolha)' : undefined}
            >
              {PECAS[vista]
                .filter((p) => p.local === local)
                .map((p, i) =>
                  ambos(p.par, (t) => (
                    <path
                      key={`${i}-${t ?? 'e'}`}
                      d={p.d}
                      transform={t}
                      fill={ativa ? COR.escolhida : COR.peca}
                      stroke={COR.linha}
                      strokeWidth={1.3}
                      strokeLinejoin="round"
                      className="transition-[fill] duration-150"
                    />
                  )),
                )}
            </g>
          )
        })}
      </g>

      {/* Rosto na frente e cabelo atrás: a pessoa sabe de que lado está olhando. Não recebem toque. */}
      <g pointerEvents="none" fill={COR.detalhe} stroke={COR.detalhe}>
        {vista === 'frente' ? (
          <>
            <circle cx="45.8" cy="15" r="1.2" stroke="none" opacity="0.55" />
            <circle cx="54.2" cy="15" r="1.2" stroke="none" opacity="0.55" />
            <path d="M45.5 20.5 Q50 24 54.5 20.5" fill="none" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
          </>
        ) : (
          <path d="M39.4 17 Q38.8 4.2 50 3.8 Q61.2 4.2 60.6 17 Q55.5 21 50 21 Q44.5 21 39.4 17 Z" stroke="none" opacity="0.22" />
        )}
      </g>
    </g>
  )
}

// As duas figuras lado a lado, com a legenda embaixo. Coordenadas da figura: 100 x 205.
/** A figura é desenhada 18% mais larga, a partir do centro: corpo mais cheio, peças maiores para o dedo. */
const MAIS_CHEIO = 1.18
const X_DA_FRENTE = 0
const X_DAS_COSTAS = 98
const CAIXA = { x: 8, y: 1, largura: 182, altura: 216 }

function MapaDoCorpo({ escolhido, aoTocar }: { escolhido: LocalDor | null; aoTocar: (l: LocalDor) => void }) {
  return (
    <svg
      viewBox={`${CAIXA.x} ${CAIXA.y} ${CAIXA.largura} ${CAIXA.altura}`}
      className="mx-auto block h-full max-w-full touch-manipulation select-none [-webkit-tap-highlight-color:transparent]"
      role="group"
      aria-label="Corpo de frente e de costas: toque onde dói"
    >
      <defs>
        <linearGradient id="cor-da-peca" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="205">
          <stop offset="0" stopColor="#eef4ff" />
          <stop offset="1" stopColor="#b9d1fb" />
        </linearGradient>
        <filter id="sombra-da-figura" x="-20%" y="-10%" width="140%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.7  0 0 0 0 1  0 0 0 0.45 0" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="brilho-da-escolha" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.95  0 0 0 0 0.75  0 0 0 0.9 0" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <Figura vista="frente" x={X_DA_FRENTE} escolhido={escolhido} aoTocar={aoTocar} />
      <Figura vista="costas" x={X_DAS_COSTAS} escolhido={escolhido} aoTocar={aoTocar} />
      <g pointerEvents="none" fill="#cfe2ff" fontSize="8" fontWeight="600" textAnchor="middle">
        <text x={X_DA_FRENTE + 50} y={214}>
          Frente
        </text>
        <text x={X_DAS_COSTAS + 50} y={214}>
          Costas
        </text>
      </g>
    </svg>
  )
}

/**
 * Mapa de calor do corpo, só para ler (painel de RH): a mesma figura do totem, cada parte com a cor pela
 * quantidade de relatos. Quanto mais relatos, mais forte o laranja. Sem toque.
 */
export function MapaDeCalor({ valores, className = '' }: { valores: Partial<Record<LocalDor, number>>; className?: string }) {
  const maior = Math.max(1, ...Object.values(valores).map((v) => v ?? 0))
  const cor = (local: LocalDor) => {
    const v = valores[local] ?? 0
    if (!v) return '#e8eef8'
    const t = 0.25 + 0.75 * (v / maior)
    return `rgba(249, 115, 22, ${t.toFixed(2)})`
  }
  return (
    <svg viewBox="8 1 182 216" className={className} role="img" aria-label="Mapa do corpo com os locais de dor mais citados">
      {(['frente', 'costas'] as const).map((vista, n) => (
        <g key={vista} transform={`translate(${n === 0 ? X_DA_FRENTE : X_DAS_COSTAS} 0) translate(50 0) scale(${MAIS_CHEIO} 1) translate(-50 0)`}>
          {PECAS[vista].map((p, i) =>
            ambos(p.par, (t) => (
              <path key={`${i}-${t ?? 'e'}`} d={p.d} transform={t} fill={cor(p.local)} stroke="#94a3b8" strokeWidth={0.9} strokeLinejoin="round">
                <title>{`${ROTULO_LOCAL_DOR[p.local]}: ${valores[p.local] ?? 0} relato(s)`}</title>
              </path>
            )),
          )}
        </g>
      ))}
      <g fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">
        <text x={X_DA_FRENTE + 50} y={214}>
          Frente
        </text>
        <text x={X_DAS_COSTAS + 50} y={214}>
          Costas
        </text>
      </g>
    </svg>
  )
}

/** Etapa "Onde dói mais?" (só aparece com dor leve, média ou forte): toca a região e confirma. */
export function BonecoDaDor({
  inicial = null,
  aoResponder,
  aoVoltar,
}: {
  inicial?: LocalDor | null
  aoResponder: (local: LocalDor) => void
  aoVoltar: () => void
}) {
  const [escolhido, setEscolhido] = useState<LocalDor | null>(inicial)
  const pilula = 'flex h-[1.9rem] items-center gap-[0.4rem] rounded-full px-[0.85rem] text-[0.68rem] font-medium ring-1 ring-white/35 disabled:opacity-45'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Titulo apoio="Toque na parte do corpo.">Onde dói mais?</Titulo>

      {/* O desenho ocupa o espaço que sobra: encolhe quando a tela é baixa ou a acessibilidade está ligada. */}
      <div className="mt-[0.5rem] min-h-[8rem] flex-1">
        <MapaDoCorpo escolhido={escolhido} aoTocar={setEscolhido} />
      </div>

      {/* A parte escolhida, em texto grande: confirma o toque para quem não tem certeza do que acendeu. */}
      <p aria-live="polite" className="mt-[0.4rem] flex h-[1.7rem] shrink-0 items-center justify-center gap-[0.4rem] text-[0.95rem] font-semibold">
        {escolhido && (
          <>
            <Check className="size-[1rem] text-[#22d3a6]" /> {ROTULO_LOCAL_DOR[escolhido]}
          </>
        )}
      </p>

      <div className="mt-[0.4rem] flex shrink-0 justify-center gap-[0.5rem]">
        <button type="button" onClick={() => setEscolhido(null)} disabled={!escolhido} className={pilula}>
          <RotateCcw className="size-[0.85rem]" /> Desfazer seleção
        </button>
      </div>
      <BotaoPrincipal onClick={() => escolhido && aoResponder(escolhido)} disabled={!escolhido} className="mt-[0.5rem] h-[2.8rem] w-full text-[1.06rem]">
        Confirmar
      </BotaoPrincipal>
      <BotaoVoltar onClick={aoVoltar} className="mt-[1.15rem]" />
    </div>
  )
}
