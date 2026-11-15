import { useState } from 'react'
import { Dumbbell, Gift, GraduationCap, HeartPulse, ShoppingBag, Sparkles, Ticket, type LucideIcon } from 'lucide-react'
import type { ItemDoCatalogo, MeuCuidado } from '../../api/tipos'
import { dataCurta } from '../../lib/datas'
import { useAcoes } from './acoes'
import { CabecalhoDaAba } from './BarraDeAbas'

const ICONES: Record<string, LucideIcon> = { academia: Dumbbell, marketplace: ShoppingBag, curso: GraduationCap, saude: HeartPulse }

/** Aba "Benefícios": os pontos de participação e o que dá para resgatar com eles. */
export function AbaBeneficios({ t }: { t: MeuCuidado }) {
  const acoes = useAcoes()
  const b = t.beneficios
  const [resgatado, setResgatado] = useState<string | null>(null)

  async function resgatar(item: ItemDoCatalogo) {
    if (await acoes.resgatarBeneficio(item.id)) setResgatado(item.titulo)
  }

  return (
    <>
      <CabecalhoDaAba t={t} titulo="Benefícios" subtitulo="Cuidar de você tem recompensa." />
      <div className="flex-1 space-y-5 overflow-y-auto bg-cinza px-4 py-4">
        <section className="rounded-2xl bg-gradient-to-br from-navy-700 to-navy p-4 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Seus pontos</p>
          <p className="mt-1 flex items-end gap-2">
            <span className="text-4xl font-bold leading-none">{b.saldo}</span>
            <span className="pb-0.5 text-sm text-blue-100/90">para gastar</span>
          </p>
          <ul className="mt-3 space-y-1 text-xs text-blue-100/90">
            {b.comoGanhar.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0 text-saude" aria-hidden /> {c}
              </li>
            ))}
          </ul>
        </section>

        {resgatado && (
          <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-saude-700 ring-1 ring-emerald-200">
            🎉 Resgatado: {resgatado}. O código está em “Meus resgates”.
          </p>
        )}

        <section>
          <p className="mb-2 text-sm font-bold text-navy">Para resgatar</p>
          <ul className="space-y-2">
            {b.catalogo.map((item) => {
              const Icone = ICONES[item.icone] ?? Gift
              const faltam = item.pontos - b.saldo
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-tech">
                    <Icone className="size-6" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-slate-900">{item.titulo}</span>
                    <span className="block text-xs leading-snug text-slate-500">{item.descricao}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-saude-700">{item.pontos} pontos</span>
                  </span>
                  <button
                    onClick={() => resgatar(item)}
                    disabled={!item.podeResgatar}
                    className="shrink-0 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {item.podeResgatar ? 'Resgatar' : `Faltam ${faltam}`}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <p className="mb-2 text-sm font-bold text-navy">Meus resgates</p>
          {b.resgates.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">Você ainda não resgatou nada. Cada passo do plano feito vira pontos.</p>
          ) : (
            <ul className="space-y-2">
              {b.resgates.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <Ticket className="size-6 shrink-0 text-saude-700" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{r.titulo}</span>
                    <span className="block text-xs text-slate-500">Resgatado em {dataCurta(r.criadoEm)}</span>
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-navy">{r.codigo}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="rounded-2xl bg-navy/5 p-3 text-xs leading-snug text-navy">
          Os pontos vêm só da sua participação: passos do plano feitos e semanas seguidas de cuidado. Nunca do resultado de um exame. Na demonstração, os benefícios e os códigos são fictícios.
        </p>
      </div>
    </>
  )
}
