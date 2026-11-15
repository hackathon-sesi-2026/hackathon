import { useState, type KeyboardEvent } from 'react'
import type { LocalDor } from '../../api/tipos'

// "Onde dói mais?" no totem. A pessoa toca a região no boneco. O sexo do boneco é só para a pessoa se
// reconhecer no desenho: não é enviado nem guardado. Só a região vai para a API, sem nada que identifique.

type Sexo = 'feminino' | 'masculino'
type Vista = 'frente' | 'costas'

export const ROTULO_LOCAL_DOR: Record<LocalDor, string> = {
  cabeca: 'Cabeça',
  pescoco: 'Pescoço',
  ombros: 'Ombros',
  bracos: 'Braços e cotovelos',
  maos_punhos: 'Mãos e punhos',
  costas: 'Costas (parte de cima)',
  lombar: 'Lombar (parte de baixo das costas)',
  quadril: 'Quadril',
  joelhos: 'Joelhos',
  pernas_pes: 'Pernas e pés',
}

type Forma =
  | { tipo: 'elipse'; cx: number; cy: number; rx: number; ry: number }
  | { tipo: 'retangulo'; x: number; y: number; w: number; h: number; r: number }

interface Parte {
  local: LocalDor | null // null: só desenho, não tocável (o peito, por exemplo)
  forma: Forma
}

const e = (cx: number, cy: number, rx: number, ry = rx): Forma => ({ tipo: 'elipse', cx, cy, rx, ry })
const r = (x: number, y: number, w: number, h: number, raio = 6): Forma => ({ tipo: 'retangulo', x, y, w, h, r: raio })

/** Desenho do corpo, em coordenadas de 120 x 262. Mulher: ombros mais estreitos e quadril mais largo. */
function partes(sexo: Sexo, vista: Vista): Parte[] {
  const f = sexo === 'feminino'
  const ombroX = f ? 40 : 37
  const bracoX = f ? 21 : 17
  const bracoW = f ? 11 : 13
  const maoX = bracoX + bracoW / 2
  const tronco: Parte[] =
    vista === 'frente'
      ? [{ local: null, forma: r(f ? 34 : 30, 50, f ? 52 : 60, 78, 12) }]
      : [
          { local: 'costas', forma: r(f ? 34 : 30, 50, f ? 52 : 60, 46, 12) },
          { local: 'lombar', forma: r(f ? 38 : 37, 97, f ? 44 : 46, 31, 8) },
        ]
  return [
    { local: 'cabeca', forma: e(60, 22, 14, 17) },
    { local: 'pescoco', forma: r(54, 37, 12, 12, 3) },
    ...tronco,
    { local: 'ombros', forma: e(ombroX, 55, 12, 8) },
    { local: 'ombros', forma: e(120 - ombroX, 55, 12, 8) },
    { local: 'bracos', forma: r(bracoX, 60, bracoW, 62, 6) },
    { local: 'bracos', forma: r(120 - bracoX - bracoW, 60, bracoW, 62, 6) },
    { local: 'maos_punhos', forma: e(maoX, 130, 7, 8) },
    { local: 'maos_punhos', forma: e(120 - maoX, 130, 7, 8) },
    { local: 'quadril', forma: r(f ? 33 : 37, 128, f ? 54 : 46, 24, 10) },
    { local: 'pernas_pes', forma: r(39, 152, 18, 38, 7) },
    { local: 'pernas_pes', forma: r(63, 152, 18, 38, 7) },
    { local: 'joelhos', forma: e(48, 197, 9, 8) },
    { local: 'joelhos', forma: e(72, 197, 9, 8) },
    { local: 'pernas_pes', forma: r(40, 206, 16, 40, 7) },
    { local: 'pernas_pes', forma: r(64, 206, 16, 40, 7) },
    { local: 'pernas_pes', forma: e(48, 252, 10, 6) },
    { local: 'pernas_pes', forma: e(72, 252, 10, 6) },
  ]
}

function Corpo({ sexo, vista, escolhido, aoTocar }: { sexo: Sexo; vista: Vista; escolhido: LocalDor | null; aoTocar: (l: LocalDor) => void }) {
  const lista = partes(sexo, vista)
  const primeiraDeCada = new Set<number>()
  const vistos = new Set<LocalDor>()
  lista.forEach((p, i) => {
    if (p.local && !vistos.has(p.local)) {
      vistos.add(p.local)
      primeiraDeCada.add(i)
    }
  })

  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 262" className="h-72 w-auto" role="group" aria-label={`Corpo visto de ${vista}`}>
        {sexo === 'feminino' && <path d="M44 20 C44 2 76 2 76 20 L80 52 L40 52 Z" className="fill-navy-600" aria-hidden />}
        {lista.map((p, i) => {
          const ativo = p.local !== null && p.local === escolhido
          const classe = p.local
            ? `cursor-pointer stroke-navy stroke-[1.5] outline-none transition-colors ${ativo ? 'fill-orange-500' : 'fill-white hover:fill-orange-200 focus-visible:fill-orange-200'}`
            : 'fill-white/70 stroke-navy stroke-[1.5]'
          const props = p.local
            ? {
                role: 'button',
                'aria-label': ROTULO_LOCAL_DOR[p.local],
                'aria-pressed': ativo,
                tabIndex: primeiraDeCada.has(i) ? 0 : -1,
                onClick: () => aoTocar(p.local!),
                onKeyDown: (ev: KeyboardEvent) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    aoTocar(p.local!)
                  }
                },
              }
            : { 'aria-hidden': true }
          const f = p.forma
          return f.tipo === 'elipse' ? (
            <ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} className={classe} {...props} />
          ) : (
            <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.r} className={classe} {...props} />
          )
        })}
      </svg>
      <figcaption className="mt-1 text-sm font-semibold text-blue-100">{vista === 'frente' ? 'Frente' : 'Costas'}</figcaption>
    </figure>
  )
}

/** Tela "Onde dói mais?": escolhe o boneco, toca a região e confirma. Pode pular. */
export function BonecoDaDor({ aoResponder }: { aoResponder: (local: LocalDor | null) => void }) {
  const [sexo, setSexo] = useState<Sexo>('masculino')
  const [escolhido, setEscolhido] = useState<LocalDor | null>(null)

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-xs font-semibold uppercase tracking-wider text-saude">Sobre a dor</p>
      <p className="mt-2 text-3xl font-bold leading-tight">Onde dói mais?</p>
      <p className="mt-1 text-sm text-blue-100">Toque no desenho. Continua anônimo.</p>

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

      <div className="mt-4 flex justify-center gap-6 rounded-2xl bg-white/5 py-4">
        <Corpo sexo={sexo} vista="frente" escolhido={escolhido} aoTocar={setEscolhido} />
        <Corpo sexo={sexo} vista="costas" escolhido={escolhido} aoTocar={setEscolhido} />
      </div>

      <p className="mt-4 min-h-8 text-center text-2xl font-bold text-orange-300" aria-live="polite">
        {escolhido ? ROTULO_LOCAL_DOR[escolhido] : ''}
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
