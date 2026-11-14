import type { MetaDoTurno } from '../api/tipos'

/** Meta coletiva do turno: reconhece o grupo, nunca a pessoa. */
export function MetaTurno({ meta, escuro = false }: { meta: MetaDoTurno | null; escuro?: boolean }) {
  if (!meta) return null
  return (
    <div className={`rounded-2xl p-3 ${escuro ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
      <p className="text-xs font-semibold">
        🎯 Meta do {meta.turno}: {meta.meta}% em dia com o cuidado
      </p>
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${escuro ? 'bg-white/20' : 'bg-slate-200'}`}>
        <div className="h-full rounded-full bg-saude" style={{ width: `${Math.min(100, (meta.valor / meta.meta) * 100)}%` }} />
      </div>
      <p className={`mt-1.5 text-[11px] ${escuro ? 'text-blue-100' : 'text-slate-500'}`}>
        Já estamos em <b>{meta.valor}%</b>. Batendo a meta, o turno ganha um café da manhã. Ninguém é exposto: conta só o total do turno.
      </p>
    </div>
  )
}
