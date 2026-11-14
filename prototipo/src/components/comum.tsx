import type { ReactNode } from 'react'
import { EM_DIA_POR_TURNO, META_TURNO } from '../data/unidades'

/** QR code ilustrativo (não codifica nada) — no produto real abriria o link pessoal no celular. */
export function QrFalso({ tamanho = 96, semente = 'sesi' }: { tamanho?: number; semente?: string }) {
  const n = 21
  let x = [...semente].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0
  const cel: boolean[] = []
  for (let i = 0; i < n * n; i++) {
    x = (x * 1103515245 + 12345) >>> 0
    cel.push(((x >>> 16) & 1) === 1)
  }
  const marcador = (r: number, c: number) => {
    const dentro = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7
    for (const [r0, c0] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      if (dentro(r0, c0)) {
        const rr = r - r0
        const cc = c - c0
        return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4)
      }
    }
    return null
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={tamanho} height={tamanho} className="rounded bg-white p-1" aria-label="QR code ilustrativo">
      {cel.map((v, i) => {
        const r = Math.floor(i / n)
        const c = i % n
        const m = marcador(r, c)
        const on = m ?? v
        return on ? <rect key={i} x={c} y={r} width={1} height={1} fill="#0b1f44" /> : null
      })}
    </svg>
  )
}

/** Meta coletiva do turno: reconhece o grupo, nunca a pessoa. */
export function MetaTurno({ unidade, turno, escuro = false }: { unidade: string; turno: string; escuro?: boolean }) {
  const valor = EM_DIA_POR_TURNO[unidade]?.[turno]
  if (valor === undefined) return null
  return (
    <div className={`rounded-2xl p-3 ${escuro ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
      <p className="text-xs font-semibold">
        🎯 Meta do {turno}: {META_TURNO}% em dia com o cuidado
      </p>
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${escuro ? 'bg-white/20' : 'bg-slate-200'}`}>
        <div className="h-full rounded-full bg-saude" style={{ width: `${Math.min(100, (valor / META_TURNO) * 100)}%` }} />
      </div>
      <p className={`mt-1.5 text-[11px] ${escuro ? 'text-blue-100' : 'text-slate-500'}`}>
        Já estamos em <b>{valor}%</b>. Batendo a meta, o turno ganha um café da manhã. Ninguém é exposto: conta só o total do turno.
      </p>
    </div>
  )
}

export function Cartao({ titulo, subtitulo, children, acao }: { titulo: string; subtitulo?: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-navy">{titulo}</h3>
          {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

/** Turno pelo horário atual (para o totem não precisar perguntar). */
export function turnoAgora(d = new Date()): string {
  const h = d.getHours()
  if (h >= 6 && h < 14) return 'Turno A'
  if (h >= 14 && h < 22) return 'Turno B'
  return 'Turno C (noite)'
}
