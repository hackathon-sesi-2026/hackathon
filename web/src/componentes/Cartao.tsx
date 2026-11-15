import type { ReactNode } from 'react'

export function Cartao({ titulo, subtitulo, children, acao }: { titulo: string; subtitulo?: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy">{titulo}</h3>
          {subtitulo && <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}
