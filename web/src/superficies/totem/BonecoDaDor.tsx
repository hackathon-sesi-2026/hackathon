import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { LocalDor } from '../../api/tipos'

// "Onde dói mais?" no totem: a pessoa toca a PARTE do corpo no desenho (frente e costas), pensado para o toque
// no totem e no celular. Desenho próprio, em SVG. O sexo do boneco é só para a pessoa se reconhecer no desenho:
// não é enviado nem guardado. Só a região vai para a API, sem nada que identifique.

type Sexo = 'feminino' | 'masculino'
type Vista = 'frente' | 'costas'

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

/** Nome da região como a pessoa vê: no desenho da mulher, o peito é "Seios". */
export function rotuloDoLocal(local: LocalDor, sexo: Sexo): string {
  return local === 'peito' && sexo === 'feminino' ? 'Seios' : ROTULO_LOCAL_DOR[local]
}

// Cores do desenho: pele, sombra, contorno, cabelo, roupa e a parte escolhida.
const PELE_CLARA = '#f6cfb2'
const PELE_ESCURA = '#e2a581'
const CONTORNO = '#c4866a'
const CABELO = '#5b3a26'
const ROUPA = '#7a5640'
const ESCOLHIDA = '#fb923c'
const ESCOLHIDA_CONTORNO = '#c2410c'

// Onde uma mesma forma do desenho se divide em regiões (coordenadas da figura, 200 x 560). Quando duas áreas
// de toque se sobrepõem, vale a desenhada por último: joelho sobre a perna, ombro sobre o braço e o tronco.
const FIM_DO_PEITO = 180 // tronco da frente: acima disso é peito, abaixo é barriga
const FIM_DAS_COSTAS = 198 // tronco de costas: acima disso são as costas, abaixo é a lombar
const JOELHO = { centro: 393, raio: 19 } // perna: essa elipse é o joelho

/** Medidas que mudam entre os desenhos: mulher com ombros mais estreitos, cintura fina e quadril mais largo. */
function medidas(sexo: Sexo) {
  const f = sexo === 'feminino'
  return { f, o: f ? 52 : 46, ax: f ? 62 : 58, ci: f ? 72 : 66, qu: f ? 56 : 62, dx: f ? 5 : 0 }
}

interface Contexto {
  sexo: Sexo
  vista: Vista
  escolhido: LocalDor | null
  aoTocar: (l: LocalDor) => void
}

interface Zona {
  fill: string
  fillOpacity: number
  stroke: string
  strokeWidth: number
  className: string
}

/**
 * Uma parte tocável do corpo. A área é invisível até ser escolhida (laranja) ou apontada (laranja claro).
 * Cada região entra uma vez no Tab: pela frente e, de costas, só o que não existe na frente (costas e lombar).
 */
function Parte({ local, ctx, children }: { local: LocalDor; ctx: Contexto; children: (zona: Zona) => ReactNode }) {
  const ativa = ctx.escolhido === local
  const focavel = ctx.vista === 'frente' || local === 'costas' || local === 'lombar'
  const zona: Zona = {
    fill: ativa ? ESCOLHIDA : 'transparent',
    fillOpacity: ativa ? 0.88 : 1,
    stroke: ativa ? ESCOLHIDA_CONTORNO : 'none',
    strokeWidth: 1.6,
    className: ativa ? '' : 'transition-[fill] group-hover:fill-orange-300/45 group-focus-visible:fill-orange-300/45',
  }
  return (
    <g
      role="button"
      aria-label={rotuloDoLocal(local, ctx.sexo)}
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
      {children(zona)}
    </g>
  )
}

/** Formas do desenho (coordenadas da figura, 200 x 560, centro em x = 100). Do lado esquerdo; o direito é espelhado. */
function formas(sexo: Sexo, vista: Vista) {
  const { f, o, ax, ci, qu, dx } = medidas(sexo)
  return {
    f,
    tronco: `M88 94 C${o + 20} 98 ${o + 2} 102 ${o} 114 C${o - 4} 126 ${o + 2} 140 ${ax} 146 C${ax + 2} 176 ${ci} 196 ${ci} 214 C${ci} 228 ${qu} 238 ${qu} 252 L${200 - qu} 252 C${200 - qu} 238 ${200 - ci} 228 ${200 - ci} 214 C${200 - ci} 196 ${200 - ax - 2} 176 ${200 - ax} 146 C${200 - o - 2} 140 ${200 - o + 4} 126 ${200 - o} 114 C${200 - o - 2} 102 ${200 - o - 20} 98 112 94 Z`,
    braco: `M${50 + dx} 114 C${38 + dx} 124 ${36 + dx} 150 ${36 + dx} 176 C${35 + dx} 198 ${33 + dx} 218 ${31 + dx} 238 C${30 + dx} 252 ${29 + dx} 262 ${29 + dx} 270 L${42 + dx} 270 C${43 + dx} 258 ${46 + dx} 244 ${48 + dx} 230 C${52 + dx} 210 ${56 + dx} 190 ${58 + dx} 170 C${60 + dx} 150 ${61 + dx} 132 ${60 + dx} 124 Z`,
    // Área do ombro: uma calota sobre o topo do braço e o canto do tronco, recortada pelo contorno do corpo.
    ombro: `M${30 + dx} 138 C${30 + dx} 112 ${44 + dx} 100 ${o + 10} 100 C${ax + 6} 100 ${ax + 16} 110 ${ax + 16} 122 C${ax + 16} 136 ${ax + 6} 146 ${o + 4} 148 C${40 + dx} 150 ${30 + dx} 148 ${30 + dx} 138 Z`,
    joelhoCentro: (qu + 6 + 94) / 2,
    mao: `M${29 + dx} 268 C${24 + dx} 280 ${24 + dx} 296 ${30 + dx} 305 C${34 + dx} 309 ${40 + dx} 307 ${42 + dx} 299 C${44 + dx} 289 ${44 + dx} 278 ${42 + dx} 268 Z`,
    perna: `M${qu - 4} 290 C${qu - 6} 324 ${qu} 358 ${qu + 6} 386 C${qu + 6} 402 ${qu + 6} 416 ${qu + 8} 432 C${qu + 10} 462 ${qu + 12} 492 ${qu + 14} 518 L${qu + 28} 518 C${qu + 29} 492 ${qu + 31} 462 ${qu + 32} 432 C${qu + 33} 416 ${qu + 32} 400 94 386 C96 360 99 326 99 294 Z`,
    pe:
      vista === 'frente'
        ? `M${qu + 14} 516 C${qu + 10} 528 ${qu + 6} 538 ${qu + 10} 542 C${qu + 18} 547 ${qu + 30} 546 ${qu + 32} 540 C${qu + 32} 532 ${qu + 30} 524 ${qu + 28} 516 Z`
        : `M${qu + 14} 516 C${qu + 12} 530 ${qu + 14} 542 ${qu + 21} 543 C${qu + 28} 542 ${qu + 30} 530 ${qu + 28} 516 Z`,
    calcao: `M${qu} 248 L${200 - qu} 248 C${202 - qu} 264 ${204 - qu} 278 ${204 - qu} 292 L106 296 C104 288 102 284 100 284 C98 284 96 288 94 296 L${qu - 4} 292 C${qu - 4} 278 ${qu - 2} 264 ${qu} 248 Z`,
    top:
      vista === 'frente'
        ? 'M64 146 C74 136 90 138 100 148 C110 138 126 136 136 146 L136 176 C124 182 112 180 100 178 C88 180 76 182 64 176 Z'
        : 'M62 148 L138 148 L138 170 L62 170 Z',
    pescoco: 'M89 76 L89 100 C94 104 106 104 111 100 L111 76 Z',
    cabeloComprido:
      vista === 'frente'
        ? 'M72 60 C68 20 90 10 100 10 C112 10 132 20 128 60 C131 82 132 100 122 110 L118 70 L82 70 L78 110 C68 100 69 82 72 60 Z'
        : 'M72 60 C68 20 90 10 100 10 C112 10 132 20 128 60 C132 86 130 108 120 116 L80 116 C70 108 68 86 72 60 Z',
    cabelo:
      vista === 'frente'
        ? f
          ? 'M74 52 C70 22 90 14 100 14 C112 14 132 22 126 52 C122 36 112 26 100 26 C88 26 78 36 74 52 Z'
          : 'M74 48 C71 22 89 14 100 14 C112 14 130 22 126 48 C120 36 110 32 100 32 C90 32 80 36 74 48 Z'
        : f
          ? 'M73 62 C69 22 89 14 100 14 C112 14 132 22 127 62 C118 80 82 80 73 62 Z'
          : 'M74 60 C70 24 88 14 100 14 C112 14 130 24 126 60 C118 74 82 74 74 60 Z',
    joelho: `M${qu + 12} 392 Q${(qu + 100) / 2} ${vista === 'frente' ? 400 : 384} 90 392`,
  }
}

const ESPELHO = 'translate(200 0) scale(-1 1)'

/** O desenho em si, liso e sem interação. As áreas de toque ficam por cima (Zonas). */
function Desenho({ sexo, vista }: { sexo: Sexo; vista: Vista }) {
  const d = formas(sexo, vista)
  const pele = `url(#pele-${vista})`
  const contorno = { stroke: CONTORNO, strokeWidth: 1.4 }
  const detalhe = { fill: 'none', stroke: CONTORNO, strokeWidth: 1.2, strokeLinecap: 'round' as const, opacity: 0.55 }
  const ambosOsLados = (desenho: (transform?: string) => ReactNode) => (
    <>
      {desenho()}
      {desenho(ESPELHO)}
    </>
  )
  return (
    <g pointerEvents="none">
      {d.f && <path d={d.cabeloComprido} fill={CABELO} />}
      {ambosOsLados((t) => (
        <g transform={t}>
          <path d={d.perna} fill={pele} {...contorno} />
          <path d={d.pe} fill={PELE_CLARA} {...contorno} />
          <path d={d.joelho} {...detalhe} />
          <path d={d.braco} fill={pele} {...contorno} />
          <path d={d.mao} fill={PELE_CLARA} {...contorno} />
        </g>
      ))}
      <path d={d.pescoco} fill={PELE_ESCURA} {...contorno} />
      <path d={d.tronco} fill={pele} {...contorno} />
      {vista === 'frente' ? (
        <>
          <path d="M78 106 Q90 112 99 109 M101 109 Q110 112 122 106" {...detalhe} />
          {!d.f && <path d="M66 148 Q82 162 98 154 M102 154 Q118 162 134 148" {...detalhe} />}
          <path d="M100 186 L100 206" {...detalhe} opacity={0.3} />
          <ellipse cx="100" cy="216" rx="1.8" ry="2.6" fill={CONTORNO} opacity="0.7" />
        </>
      ) : (
        <>
          <path d="M100 102 L100 244" {...detalhe} />
          <path d="M72 128 Q78 160 94 152 M128 128 Q122 160 106 152" {...detalhe} />
          <path d="M84 232 Q92 238 96 234 M116 232 Q108 238 104 234" {...detalhe} opacity={0.4} />
        </>
      )}
      <path d={d.calcao} fill={ROUPA} />
      {d.f && <path d={d.top} fill={ROUPA} />}
      <ellipse cx="73" cy="56" rx="5" ry="9" fill={PELE_ESCURA} stroke={CONTORNO} strokeWidth="1.2" />
      <ellipse cx="127" cy="56" rx="5" ry="9" fill={PELE_ESCURA} stroke={CONTORNO} strokeWidth="1.2" />
      <ellipse cx="100" cy="50" rx="26" ry="32" fill={vista === 'frente' ? PELE_CLARA : PELE_ESCURA} {...contorno} />
      <path d={d.cabelo} fill={CABELO} />
    </g>
  )
}

/**
 * Áreas de toque por cima do desenho. Invisíveis até a pessoa tocar: a parte escolhida acende inteira em laranja,
 * seguindo o contorno do corpo, sem emendas no desenho.
 */
function Zonas({ ctx }: { ctx: Contexto }) {
  const d = formas(ctx.sexo, ctx.vista)
  const id = (nome: string) => `${nome}-${ctx.vista}`
  const recorte = (nome: string) => `url(#${id(nome)})`
  const ambosOsLados = (desenho: (transform?: string) => ReactNode) => (
    <>
      {desenho()}
      {desenho(ESPELHO)}
    </>
  )
  const troncoPorRegiao =
    ctx.vista === 'frente'
      ? ([
          ['peito', 90, FIM_DO_PEITO],
          ['barriga', FIM_DO_PEITO, 256],
        ] as const)
      : ([
          ['costas', 90, FIM_DAS_COSTAS],
          ['lombar', FIM_DAS_COSTAS, 256],
        ] as const)

  return (
    <g>
      <defs>
        {/* Silhuetas que recortam as áreas. Cada área é uma forma própria, do tamanho da região: assim o centro
            dela cai na própria região (o que leitores de tela e testes usam para tocar). */}
        <clipPath id={id('silhueta-tronco')}>
          <path d={d.tronco} />
        </clipPath>
        <clipPath id={id('silhueta-perna')}>
          <path d={d.perna} />
        </clipPath>
        {/* O ombro acende só onde há corpo: topo do braço e canto do tronco */}
        <clipPath id={id('corpo-do-ombro')}>
          <path d={d.braco} />
          <path d={d.tronco} />
        </clipPath>
      </defs>

      <Parte local="pernas_pes" ctx={ctx}>
        {(z) =>
          ambosOsLados((t) => (
            <g transform={t}>
              <path d={d.perna} {...z} />
              <path d={d.pe} {...z} />
            </g>
          ))
        }
      </Parte>
      <Parte local="joelhos" ctx={ctx}>
        {(z) =>
          ambosOsLados((t) => (
            <ellipse cx={d.joelhoCentro} cy={JOELHO.centro} rx="22" ry={JOELHO.raio} {...z} clipPath={recorte('silhueta-perna')} transform={t} />
          ))
        }
      </Parte>
      <Parte local="bracos" ctx={ctx}>
        {(z) => ambosOsLados((t) => <path d={d.braco} {...z} transform={t} />)}
      </Parte>
      <Parte local="maos_punhos" ctx={ctx}>
        {(z) => ambosOsLados((t) => <path d={d.mao} {...z} transform={t} />)}
      </Parte>
      <Parte local="pescoco" ctx={ctx}>
        {(z) => <path d={d.pescoco} {...z} />}
      </Parte>
      {troncoPorRegiao.map(([local, de, ate]) => (
        <Parte key={local} local={local} ctx={ctx}>
          {(z) => <rect x="30" y={de} width="140" height={ate - de} {...z} clipPath={recorte('silhueta-tronco')} />}
        </Parte>
      ))}
      <Parte local="ombros" ctx={ctx}>
        {(z) => ambosOsLados((t) => <path d={d.ombro} {...z} stroke="none" clipPath={recorte('corpo-do-ombro')} transform={t} />)}
      </Parte>
      <Parte local="quadril" ctx={ctx}>
        {(z) => <path d={d.calcao} {...z} />}
      </Parte>
      <Parte local="cabeca" ctx={ctx}>
        {(z) => (
          <>
            {d.f && <path d={d.cabeloComprido} {...z} />}
            <ellipse cx="73" cy="56" rx="6" ry="10" {...z} />
            <ellipse cx="127" cy="56" rx="6" ry="10" {...z} />
            <ellipse cx="100" cy="50" rx="27" ry="34" {...z} />
          </>
        )}
      </Parte>
    </g>
  )
}

/** Uma figura (frente ou costas): o desenho e, por cima, as áreas de toque. */
function Figura({ ctx }: { ctx: Contexto }) {
  return (
    <g>
      <defs>
        <linearGradient id={`pele-${ctx.vista}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={PELE_ESCURA} />
          <stop offset="0.35" stopColor={PELE_CLARA} />
          <stop offset="0.65" stopColor={PELE_CLARA} />
          <stop offset="1" stopColor={PELE_ESCURA} />
        </linearGradient>
      </defs>
      <Desenho sexo={ctx.sexo} vista={ctx.vista} />
      <Zonas ctx={ctx} />
    </g>
  )
}

const FRENTE_X = 6
const COSTAS_X = 238

function MapaDoCorpo({ sexo, escolhido, aoTocar }: { sexo: Sexo; escolhido: LocalDor | null; aoTocar: (l: LocalDor) => void }) {
  return (
    <svg viewBox="0 0 444 580" className="mx-auto h-auto w-full max-w-md touch-manipulation select-none" role="group" aria-label="Corpo de frente e de costas: toque onde dói">
      <g transform={`translate(${FRENTE_X} 4)`}>
        <Figura ctx={{ sexo, vista: 'frente', escolhido, aoTocar }} />
      </g>
      <g transform={`translate(${COSTAS_X} 4)`}>
        <Figura ctx={{ sexo, vista: 'costas', escolhido, aoTocar }} />
      </g>
      <text x={FRENTE_X + 100} y="576" textAnchor="middle" className="fill-blue-100 text-[14px] font-semibold">
        Frente
      </text>
      <text x={COSTAS_X + 100} y="576" textAnchor="middle" className="fill-blue-100 text-[14px] font-semibold">
        Costas
      </text>
    </svg>
  )
}

/** Tela "Onde dói mais?": escolhe o desenho, toca a parte do corpo e confirma. Pode pular. */
export function BonecoDaDor({ aoResponder }: { aoResponder: (local: LocalDor | null) => void }) {
  const [sexo, setSexo] = useState<Sexo>('masculino')
  const [escolhido, setEscolhido] = useState<LocalDor | null>(null)

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-xs font-semibold uppercase tracking-wider text-saude">Sobre a dor</p>
      <p className="mt-2 text-3xl font-bold leading-tight">Onde dói mais?</p>
      <p className="mt-1 text-sm text-blue-100">Toque na parte do corpo. Continua anônimo.</p>

      <div role="group" aria-label="Escolha o desenho" className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
        {(
          [
            ['feminino', 'Mulher'],
            ['masculino', 'Homem'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setSexo(valor)}
            aria-pressed={sexo === valor}
            className={`rounded-xl py-3 text-base font-bold transition ${sexo === valor ? 'bg-white text-navy' : 'text-blue-100 hover:bg-white/10'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <MapaDoCorpo sexo={sexo} escolhido={escolhido} aoTocar={setEscolhido} />
      </div>

      <p className="mt-3 min-h-8 text-center text-2xl font-bold text-orange-300" aria-live="polite">
        {escolhido ? rotuloDoLocal(escolhido, sexo) : ''}
      </p>

      <div className="mt-auto grid gap-2 pt-4">
        <button
          onClick={() => escolhido && aoResponder(escolhido)}
          disabled={!escolhido}
          className="rounded-2xl bg-saude py-4 text-lg font-extrabold text-navy transition active:scale-[0.98] disabled:opacity-40"
        >
          {escolhido ? 'É aqui' : 'Toque onde dói'}
        </button>
        <button onClick={() => aoResponder(null)} className="rounded-2xl py-3 text-base font-semibold text-blue-100 hover:bg-white/10">
          Prefiro não dizer
        </button>
      </div>
    </div>
  )
}
