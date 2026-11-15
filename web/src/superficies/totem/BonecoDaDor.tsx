import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import type { LocalDor } from '../../api/tipos'
import { BotaoPrincipal, BotaoVoltar, Titulo } from './Moldura'

// Etapa "Onde dói mais?" do totem: silhueta do corpo, de frente e de costas, e a pessoa toca a REGIÃO.
// Desenho próprio, em SVG. Só a região vai para a API, sem nada que identifique quem tocou.

type Vista = 'frente' | 'costas'

/** Nome completo da região, lido pelo leitor de tela. */
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

/** Nome curto que aparece na etiqueta ao lado do desenho. */
const ETIQUETA: Record<LocalDor, string> = {
  cabeca: 'Cabeça',
  pescoco: 'Pescoço',
  ombros: 'Ombro',
  peito: 'Peito',
  barriga: 'Barriga',
  bracos: 'Braço',
  maos_punhos: 'Mão',
  costas: 'Costas',
  lombar: 'Lombar',
  quadril: 'Quadril',
  joelhos: 'Joelho',
  pernas_pes: 'Perna',
}

// Formas da silhueta, em coordenadas da figura (200 x 560, centro em x = 100). As do lado esquerdo são
// espelhadas para o direito. Sem contorno e com a mesma cor, elas se fundem num corpo só.
const FORMA = {
  cabeca: { cx: 100, cy: 40, rx: 17, ry: 26 },
  pescoco: 'M91 60 L91 76 C89 86 78 91 64 95 L136 95 C122 91 111 86 109 76 L109 60 Z',
  tronco:
    'M64 94 C54 96 47 102 46 113 C46 126 53 136 60 142 C61 166 67 186 68 204 C68 220 61 238 60 258 C60 268 60 276 61 284 L139 284 C140 276 140 268 140 258 C139 238 132 220 132 204 C133 186 139 166 140 142 C147 136 154 126 154 113 C153 102 146 96 136 94 Z',
  braco: 'M52 99 C43 104 38 118 38 134 C37 154 36 172 35 190 C33 214 30 238 27 259 L39 262 C43 242 48 220 51 198 C54 178 58 160 60 142 C61 124 60 108 52 99 Z',
  mao: 'M27 257 C22 268 20 282 22 295 C24 304 31 307 35 301 C39 291 40 276 39 261 Z',
  perna:
    'M60 262 C56 290 56 330 62 362 C64 376 64 388 64 398 C60 420 62 450 68 482 C70 494 70 504 70 512 L83 512 C84 500 86 486 88 470 C92 446 92 420 91 400 C92 386 95 370 97 350 C99 330 100 308 100 286 L100 262 Z',
  pe: {
    frente: 'M70 510 C66 522 60 534 62 540 C66 546 82 546 85 540 C86 530 84 520 83 510 Z',
    costas: 'M70 510 C68 524 69 538 76 540 C83 538 85 524 83 510 Z',
  },
}
const ESPELHO = 'translate(200 0) scale(-1 1)'

// Onde o tronco se divide em regiões.
const FIM_DO_PEITO = 178
const FIM_DAS_COSTAS = 196
const INICIO_DO_QUADRIL = 248

const ambosOsLados = (desenho: (transform?: string) => ReactNode) => (
  <>
    {desenho()}
    {desenho(ESPELHO)}
  </>
)

/** A silhueta: azul-clara, translúcida e com brilho, sem interação. As áreas de toque ficam por cima. */
function Silhueta({ vista }: { vista: Vista }) {
  const linha = { fill: 'none', stroke: '#eaf3ff', strokeWidth: 1.4, strokeLinecap: 'round' as const, opacity: 0.28 }
  return (
    <g pointerEvents="none" filter="url(#brilho-do-corpo)">
      <g fill="url(#cor-do-corpo)" opacity="0.9">
        {ambosOsLados((t) => (
          <g transform={t}>
            <path d={FORMA.perna} />
            <path d={FORMA.pe[vista]} />
            <path d={FORMA.braco} />
            <path d={FORMA.mao} />
          </g>
        ))}
        <path d={FORMA.pescoco} />
        <path d={FORMA.tronco} />
        <ellipse {...FORMA.cabeca} />
      </g>
      {vista === 'frente' ? (
        <>
          <path d="M70 146 Q84 160 98 152 M102 152 Q116 160 130 146" {...linha} />
          <path d="M100 150 L100 236" {...linha} opacity={0.18} />
          <path d="M66 396 Q77 404 90 396 M110 396 Q123 404 134 396" {...linha} />
        </>
      ) : (
        <>
          <path d="M100 98 L100 250" {...linha} />
          <path d="M74 128 Q80 158 95 150 M126 128 Q120 158 105 150" {...linha} />
          <path d="M66 396 Q77 388 90 396 M110 396 Q123 388 134 396" {...linha} />
        </>
      )}
    </g>
  )
}

interface Contexto {
  vista: Vista
  escolhido: LocalDor | null
  aoTocar: (l: LocalDor) => void
}

interface Zona {
  fill: string
  fillOpacity: number
  className: string
}

/**
 * Uma região tocável. A área é invisível até ser escolhida, quando acende. Cada região entra uma vez no Tab:
 * pela frente e, de costas, só o que não existe na frente (costas e lombar).
 */
function Regiao({ local, ctx, children }: { local: LocalDor; ctx: Contexto; children: (zona: Zona) => ReactNode }) {
  const ativa = ctx.escolhido === local
  const focavel = ctx.vista === 'frente' || local === 'costas' || local === 'lombar'
  return (
    <g
      role="button"
      aria-label={ROTULO_LOCAL_DOR[local]}
      aria-pressed={ativa}
      tabIndex={focavel ? 0 : -1}
      onClick={() => ctx.aoTocar(local)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ctx.aoTocar(local)
        }
      }}
      className="group cursor-pointer outline-none [-webkit-tap-highlight-color:transparent]"
    >
      {children({
        fill: ativa ? '#c8f1ff' : 'transparent',
        fillOpacity: ativa ? 0.6 : 1,
        className: ativa ? '' : 'group-focus-visible:fill-white/25',
      })}
    </g>
  )
}

/**
 * Áreas de toque por cima da silhueta. Cada área é uma forma do tamanho da região, recortada pelo contorno do
 * corpo. Quando duas se sobrepõem, vale a desenhada por último (joelho sobre a perna, ombro sobre o braço).
 */
function Regioes({ ctx }: { ctx: Contexto }) {
  const id = (nome: string) => `${nome}-${ctx.vista}`
  const recorte = (nome: string) => `url(#${id(nome)})`
  const tronco =
    ctx.vista === 'frente'
      ? ([
          ['peito', 88, FIM_DO_PEITO],
          ['barriga', FIM_DO_PEITO, INICIO_DO_QUADRIL],
        ] as const)
      : ([
          ['costas', 88, FIM_DAS_COSTAS],
          ['lombar', FIM_DAS_COSTAS, INICIO_DO_QUADRIL],
        ] as const)

  return (
    <g>
      <defs>
        <clipPath id={id('no-tronco')}>
          <path d={FORMA.tronco} />
        </clipPath>
        <clipPath id={id('na-perna')}>
          <path d={FORMA.perna} />
        </clipPath>
        <clipPath id={id('no-quadril')}>
          <path d={FORMA.tronco} />
          <path d={FORMA.perna} />
          <path d={FORMA.perna} transform={ESPELHO} />
        </clipPath>
        <clipPath id={id('no-ombro')}>
          <path d={FORMA.braco} />
          <path d={FORMA.tronco} />
        </clipPath>
      </defs>

      <Regiao local="pernas_pes" ctx={ctx}>
        {(z) =>
          ambosOsLados((t) => (
            <g transform={t}>
              <path d={FORMA.perna} {...z} />
              <path d={FORMA.pe[ctx.vista]} {...z} />
            </g>
          ))
        }
      </Regiao>
      <Regiao local="joelhos" ctx={ctx}>
        {(z) => ambosOsLados((t) => <ellipse cx="77" cy="396" rx="22" ry="20" {...z} clipPath={recorte('na-perna')} transform={t} />)}
      </Regiao>
      <Regiao local="bracos" ctx={ctx}>
        {(z) => ambosOsLados((t) => <path d={FORMA.braco} {...z} transform={t} />)}
      </Regiao>
      <Regiao local="maos_punhos" ctx={ctx}>
        {(z) => ambosOsLados((t) => <path d={FORMA.mao} {...z} transform={t} />)}
      </Regiao>
      <Regiao local="pescoco" ctx={ctx}>
        {(z) => <path d={FORMA.pescoco} {...z} />}
      </Regiao>
      {tronco.map(([local, de, ate]) => (
        <Regiao key={local} local={local} ctx={ctx}>
          {(z) => <rect x="30" y={de} width="140" height={ate - de} {...z} clipPath={recorte('no-tronco')} />}
        </Regiao>
      ))}
      <Regiao local="quadril" ctx={ctx}>
        {(z) => <rect x="40" y={INICIO_DO_QUADRIL} width="120" height="54" {...z} clipPath={recorte('no-quadril')} />}
      </Regiao>
      <Regiao local="ombros" ctx={ctx}>
        {(z) => ambosOsLados((t) => <ellipse cx="50" cy="115" rx="17" ry="18" {...z} clipPath={recorte('no-ombro')} transform={t} />)}
      </Regiao>
      <Regiao local="cabeca" ctx={ctx}>
        {(z) => <ellipse {...FORMA.cabeca} {...z} />}
      </Regiao>
    </g>
  )
}

// O desenho inteiro tem a largura da tela do design (384 px = 842 unidades da figura).
const LARGURA = 842
const ALTURA = 566
const X_DA_FIGURA: Record<Vista, number> = { frente: 192, costas: 499 }
const Y_DA_FIGURA = 8
/** A figura é desenhada 20% mais larga, a partir do centro, para ficar com o corpo do design. */
const LARGO = 1.2
const ALARGAR = `translate(100 0) scale(${LARGO} 1) translate(-100 0)`

/** Ponto de cada região onde a etiqueta aponta (coordenadas da figura). Costas e lombar, só na figura de costas. */
const PONTO: Record<LocalDor, { vista: Vista; x: number; y: number }> = {
  cabeca: { vista: 'frente', x: 100, y: 34 },
  pescoco: { vista: 'frente', x: 100, y: 78 },
  ombros: { vista: 'frente', x: 52, y: 112 },
  peito: { vista: 'frente', x: 82, y: 140 },
  barriga: { vista: 'frente', x: 88, y: 212 },
  bracos: { vista: 'frente', x: 42, y: 188 },
  maos_punhos: { vista: 'frente', x: 30, y: 284 },
  quadril: { vista: 'frente', x: 74, y: 266 },
  joelhos: { vista: 'frente', x: 76, y: 396 },
  pernas_pes: { vista: 'frente', x: 72, y: 452 },
  costas: { vista: 'costas', x: 120, y: 140 },
  lombar: { vista: 'costas', x: 104, y: 224 },
}

/** Etiqueta da região escolhida: caixa ao lado do desenho, com uma linha até o ponto de luz na região. */
function Etiqueta({ local }: { local: LocalDor }) {
  const p = PONTO[local]
  const px = X_DA_FIGURA[p.vista] + 100 + (p.x - 100) * LARGO
  const py = Y_DA_FIGURA + p.y
  const texto = ETIQUETA[local]
  const largura = 30 + texto.length * 17.5
  const altura = 68
  const aEsquerda = p.vista === 'frente'
  const x = aEsquerda ? 185 - largura : X_DA_FIGURA.costas + 200
  const y = Math.min(ALTURA - altura - 4, Math.max(4, py - 72))
  const ponta = { x: aEsquerda ? x + largura : x, y: y + altura / 2 }
  return (
    <g pointerEvents="none">
      <line x1={ponta.x} y1={ponta.y} x2={px} y2={py} stroke="#d6efff" strokeWidth="2" strokeOpacity="0.85" />
      <circle cx={px} cy={py} r="30" fill="#8fe6ff" opacity="0.75" filter="url(#luz)" />
      <circle cx={px} cy={py} r="6.5" fill="white" />
      <rect x={x} y={y} width={largura} height={altura} rx="16" fill="#0a2a72" fillOpacity="0.85" stroke="white" strokeOpacity="0.8" strokeWidth="2" />
      <text x={x + largura / 2} y={y + altura / 2 + 10.5} textAnchor="middle" fontSize="30" fontWeight="500" fill="white">
        {texto}
      </text>
    </g>
  )
}

function MapaDoCorpo({ escolhido, aoTocar }: { escolhido: LocalDor | null; aoTocar: (l: LocalDor) => void }) {
  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      className="-mx-[1.75rem] block h-full w-[calc(100%+3.5rem)] max-w-none touch-manipulation select-none"
      role="group"
      aria-label="Corpo de frente e de costas: toque onde dói"
    >
      <defs>
        <linearGradient id="cor-do-corpo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9ceff" />
          <stop offset="0.45" stopColor="#74a9fb" />
          <stop offset="1" stopColor="#4d86ee" />
        </linearGradient>
        <filter id="brilho-do-corpo" x="-40%" y="-10%" width="180%" height="120%">
          <feGaussianBlur stdDeviation="9" result="desfoque" />
          <feColorMatrix in="desfoque" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.62  0 0 0 0 1  0 0 0 0.75 0" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="luz" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      {(['frente', 'costas'] as const).map((vista) => (
        <g key={vista} transform={`translate(${X_DA_FIGURA[vista]} ${Y_DA_FIGURA}) ${ALARGAR}`}>
          <Silhueta vista={vista} />
          <Regioes ctx={{ vista, escolhido, aoTocar }} />
        </g>
      ))}
      {escolhido && <Etiqueta local={escolhido} />}
    </svg>
  )
}

/** Etapa "Onde dói mais?": toca a região e confirma, ou diz que não sente dor. */
export function BonecoDaDor({ aoResponder, aoVoltar }: { aoResponder: (local: LocalDor | null) => void; aoVoltar: () => void }) {
  const [escolhido, setEscolhido] = useState<LocalDor | null>(null)
  const pilula = 'flex h-[1.9rem] items-center gap-[0.4rem] rounded-full px-[0.85rem] text-[0.68rem] font-medium ring-1 ring-white/35 disabled:opacity-45'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Titulo apoio="Toque na região do corpo.">Onde dói mais?</Titulo>

      {/* O desenho ocupa o espaço que sobra: encolhe quando a tela é baixa ou a acessibilidade está ligada. */}
      <div className="mt-[0.3rem] min-h-[8rem] flex-1">
        <MapaDoCorpo escolhido={escolhido} aoTocar={setEscolhido} />
      </div>
      <p className="sr-only" aria-live="polite">
        {escolhido ? `Escolhido: ${ROTULO_LOCAL_DOR[escolhido]}` : ''}
      </p>

      <div className="mt-[0.7rem] flex shrink-0 justify-center gap-[0.5rem]">
        <button type="button" onClick={() => setEscolhido(null)} disabled={!escolhido} className={pilula}>
          <RotateCcw className="size-[0.85rem]" /> Desfazer seleção
        </button>
        <button type="button" onClick={() => aoResponder(null)} className={pilula}>
          Não sinto dor
        </button>
      </div>
      <BotaoPrincipal onClick={() => escolhido && aoResponder(escolhido)} disabled={!escolhido} className="mt-[0.5rem] h-[2.8rem] w-full text-[1.06rem]">
        Confirmar
      </BotaoPrincipal>
      <BotaoVoltar onClick={aoVoltar} className="mt-[1.15rem]" />
    </div>
  )
}
