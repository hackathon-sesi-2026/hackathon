import type { ReactNode } from 'react'

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
