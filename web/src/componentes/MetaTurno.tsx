import { Target } from 'lucide-react'
import type { MetaDoTurno } from '../api/tipos'

/** Meta coletiva do turno: reconhece o grupo, nunca a pessoa. `grande` é a versão do painel da liderança. */
export function MetaTurno({ meta, escuro = false, grande = false }: { meta: MetaDoTurno | null; escuro?: boolean; grande?: boolean }) {
  if (!meta) return null
  const progresso = Math.min(100, (meta.valor / meta.meta) * 100)
  return (
    <div className={`rounded-2xl ${grande ? 'p-5' : 'p-3'} ${escuro ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/70'}`}>
      <p className={`flex items-center gap-1.5 font-semibold ${grande ? 'text-sm' : 'text-xs'}`}>
        <Target className={`shrink-0 ${grande ? 'size-5' : 'size-4'} ${escuro ? 'text-saude' : 'text-saude-700'}`} />
        Meta do {meta.turno}: {meta.meta}% em dia com o cuidado
      </p>
      {grande && (
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold leading-none text-navy">{meta.valor}%</span>
          <span className="text-sm text-slate-500">de {meta.meta}%</span>
        </p>
      )}
      <div className={`overflow-hidden rounded-full ${grande ? 'mt-2 h-3' : 'mt-2 h-2'} ${escuro ? 'bg-white/20' : 'bg-slate-200'}`}>
        <div className="h-full rounded-full bg-saude" style={{ width: `${progresso}%` }} />
      </div>
      <p className={`${grande ? 'mt-2.5 text-xs leading-relaxed' : 'mt-1.5 text-[11px]'} ${escuro ? 'text-blue-100' : 'text-slate-500'}`}>
        Já estamos em <b>{meta.valor}%</b>. Batendo a meta, o turno ganha um café da manhã. Ninguém é exposto: conta só o total do turno.
      </p>
    </div>
  )
}
