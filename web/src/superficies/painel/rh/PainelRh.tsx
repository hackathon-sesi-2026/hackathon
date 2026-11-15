import { useState } from 'react'
import { Activity, Building2, CalendarCheck, FileCheck2, Lightbulb, MessagesSquare, Stethoscope, type LucideIcon } from 'lucide-react'
import type { ItemContado, PainelDaEmpresa } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { Cartao } from '../../../componentes/Cartao'

// Visão de RH e Direção: SÓ agregados e anônimos. A API já omite grupos pequenos; nenhum dado individual chega aqui.
// Não usar "adesão" para uso do canal: adesão é verificada pela equipe de saúde.

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function PainelRh() {
  const [unidade, setUnidade] = useState<string>('todas')
  const { dados: p, erro } = useRecurso<PainelDaEmpresa>(`/rh/painel?unidade=${encodeURIComponent(unidade)}`, '/rh/eventos')

  if (!p) return <p className="p-6 text-sm text-slate-500">{erro ? `Não foi possível carregar os indicadores: ${erro}` : 'Carregando os indicadores…'}</p>

  const unidadesFiltro = unidade === 'todas' ? p.unidades : p.unidades.filter((u) => u.unidade === unidade)
  const maxSemana = Math.max(1, ...p.semanas.map((s) => s.respostas))
  // Leituras do pulso que sugerem ação sobre as condições de trabalho, não sobre pessoas.
  const insights = p.turnos.flatMap((x) => x.alertas.map((a) => `${x.turno}${unidade === 'todas' ? ` (${x.unidade})` : ''}: ${a}`))

  const kpis: { rotulo: string; valor: string; detalhe: string; Icone: LucideIcon; cor: string; anel: string }[] = [
    { rotulo: 'Vidas no programa', valor: p.vidas.toLocaleString('pt-BR'), detalhe: `${unidadesFiltro.length} unidade(s)`, Icone: Building2, cor: 'bg-tech', anel: 'ring-tech/25' },
    {
      rotulo: 'Comparecimento aos retornos',
      valor: `${p.comparecimentoAgora}%`,
      detalhe: `era ${p.comparecimentoAntes}% antes · simulação de piloto`,
      Icone: CalendarCheck,
      cor: 'bg-saude',
      anel: 'ring-saude/25',
    },
    { rotulo: 'Planos de cuidado recebidos', valor: `${p.planosRecebidos}%`, detalhe: 'abriram o plano enviado', Icone: FileCheck2, cor: 'bg-orange-500', anel: 'ring-orange-500/25' },
    { rotulo: 'Respostas no totem', valor: p.pulso.respostas.toLocaleString('pt-BR'), detalhe: 'últimos 28 dias · anônimas', Icone: MessagesSquare, cor: 'bg-fuchsia-600', anel: 'ring-fuchsia-600/25' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Visão da empresa · {p.empresa}</h2>
        </div>
        <label className="text-sm text-slate-600">
          Unidade{' '}
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-navy">
            <option value="todas">Todas</option>
            {p.unidades.map((u) => (
              <option key={u.unidade}>{u.unidade}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 justify-items-center gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.rotulo}
            className="flex aspect-square w-full max-w-60 flex-col items-center justify-center rounded-full bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70"
          >
            <span className={`grid size-14 shrink-0 place-items-center rounded-full text-white shadow-md ring-8 ${k.cor} ${k.anel}`}>
              <k.Icone className="size-7" strokeWidth={2.25} />
            </span>
            <span className="mt-3 block text-3xl font-bold leading-none text-navy">{k.valor}</span>
            <span className="mt-1.5 block text-sm font-medium leading-tight text-slate-700">{k.rotulo}</span>
            <span className="mt-0.5 block text-xs leading-tight text-slate-500">{k.detalhe}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[7fr_3fr]">
        <Cartao titulo="Resultados dos totens" subtitulo={`Respostas por semana · ${unidade === 'todas' ? 'todas as unidades' : unidade}`}>
          <div className="flex h-36 items-end gap-3">
            {p.semanas.map((s) => (
              <div key={s.rotulo} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular-nums text-navy">{s.respostas}</span>
                <div className="w-full rounded-t-lg bg-tech" style={{ height: `${(s.respostas / maxSemana) * 100}px` }} />
                <span className="text-[10px] text-slate-400">{s.rotulo}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['Energia baixa', p.pulso.energiaBaixa, 'bg-amber-500'],
                ['Dor forte', p.pulso.dorForte, 'bg-alerta'],
                ['Dormiu mal', p.pulso.sonoRuim, 'bg-violet-500'],
              ] as const
            ).map(([r, v, cor]) => (
              <div key={r} className="rounded-xl bg-cinza p-2">
                <p className="text-xl font-bold text-navy">{v}%</p>
                <p className="text-[11px] text-slate-500">{r}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full ${cor}`} style={{ width: `${v}%` }} />
                </div>
              </div>
            ))}
          </div>
          {insights.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {insights.map((i) => (
                <li key={i} className="flex gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0" /> {i}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <Cartao titulo="Onde mais dói" subtitulo="Local tocado no boneco do totem · últimos 28 dias · anônimo" acao={<Activity className="size-5 text-orange-500" />}>
          <Ranking itens={p.locaisDeDor} cor="bg-orange-500" unidade="relatos" vazio="Ainda sem relatos suficientes para mostrar." />
        </Cartao>
      </div>

      <Cartao titulo="Acompanhamento" subtitulo="Quantas pessoas avançaram em cada etapa do cuidado · últimos 30 dias">
        <div className="space-y-4">
          {unidadesFiltro.map((u) => {
            const etapas = [
              ['Respondeu WhatsApp', u.funil.whatsapp],
              ['Realizou exame', u.funil.exame],
              ['Realizou consulta', u.funil.consulta],
              ['Reavaliação', u.funil.reavaliacao],
            ] as const
            return (
              <div key={u.unidade}>
                {unidade === 'todas' && <p className="mb-1 text-xs font-semibold text-navy">{u.unidade}</p>}
                <div className="space-y-1">
                  {etapas.map(([r, v], i) => (
                    <div key={r} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 text-slate-500">{r}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                        <div className="flex h-full items-center rounded-md bg-tech px-2 text-[10px] font-semibold text-white" style={{ width: `${pct(v, u.funil.whatsapp)}%` }}>
                          {v}
                        </div>
                      </div>
                      <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                        {i === 0 ? '100%' : `${pct(v, u.funil.whatsapp)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Cartao>

      <Cartao titulo="Especialidades mais procuradas" subtitulo="Consultas por especialidade médica · últimos 30 dias · agregado, sem nomes" acao={<Stethoscope className="size-5 text-tech" />}>
        <Ranking itens={p.especialidades} cor="bg-tech" unidade="consultas" vazio="Ainda sem consultas suficientes para mostrar." />
      </Cartao>
    </div>
  )
}

/** Os 5 primeiros, do mais citado ao menos citado. A API já tira os itens com menos de 5 ocorrências. */
function Ranking({ itens, cor, unidade, vazio }: { itens: ItemContado[]; cor: string; unidade: string; vazio: string }) {
  if (itens.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{vazio}</p>
  const maior = Math.max(1, ...itens.map((i) => i.vezes))
  return (
    <ol className="space-y-3">
      {itens.map((item, posicao) => (
        <li key={item.codigo} className="flex items-center gap-3 text-sm">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cinza text-xs font-bold text-navy">{posicao + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 font-medium leading-snug text-slate-800">{item.rotulo}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                <b className="text-navy">{item.vezes.toLocaleString('pt-BR')}</b> {unidade}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${cor}`} style={{ width: `${(item.vezes / maior) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
