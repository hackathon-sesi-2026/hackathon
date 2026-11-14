import { useState } from 'react'
import { Building2, CalendarCheck, EyeOff, FileCheck2, Lightbulb, MessagesSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { PainelDaEmpresa } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { Cartao } from '../../../componentes/Cartao'
import { MOTIVOS } from '../../../lib/rotulos'

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

  const kpis: { rotulo: string; valor: string; detalhe: string; Icone: LucideIcon; cor: string }[] = [
    { rotulo: 'Vidas no programa', valor: p.vidas.toLocaleString('pt-BR'), detalhe: `${unidadesFiltro.length} unidade(s)`, Icone: Building2, cor: 'bg-blue-50 text-tech' },
    {
      rotulo: 'Comparecimento aos retornos',
      valor: `${p.comparecimentoAgora}%`,
      detalhe: `era ${p.comparecimentoAntes}% antes · simulação de piloto`,
      Icone: CalendarCheck,
      cor: 'bg-emerald-50 text-saude-700',
    },
    { rotulo: 'Planos de cuidado recebidos', valor: `${p.planosRecebidos}%`, detalhe: 'abriram o plano enviado', Icone: FileCheck2, cor: 'bg-amber-50 text-amber-600' },
    { rotulo: 'Respostas no totem', valor: p.pulso.respostas.toLocaleString('pt-BR'), detalhe: 'últimos 28 dias · anônimas', Icone: MessagesSquare, cor: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Visão da empresa · {p.empresa}</h2>
          <p className="text-sm text-slate-500">Para RH e Direção. Indicadores agregados e anônimos do programa e dos totens. Dados fictícios.</p>
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

      <p className="flex items-start gap-2 rounded-xl bg-navy/5 px-3 py-2 text-xs text-navy">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-saude-700" />
        Nenhum dado individual aparece aqui. Grupos com menos de {p.minimoDoGrupo} pessoas ficam ocultos. Uso do canal e respostas do totem não medem adesão ao tratamento: isso é verificado pela equipe de saúde.
      </p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.rotulo} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${k.cor}`}>
              <k.Icone className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-bold leading-none text-navy">{k.valor}</span>
              <span className="mt-1 block text-xs font-medium text-slate-700">{k.rotulo}</span>
              <span className="block text-[11px] text-slate-400">{k.detalhe}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
        </Cartao>

        <Cartao titulo="Como o turno está chegando" subtitulo="Pulso anônimo do totem por turno · últimos 28 dias">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2 font-medium">Turno</th>
                <th className="pb-2 font-medium">Respostas</th>
                <th className="pb-2 font-medium">Energia baixa</th>
                <th className="pb-2 font-medium">Dor forte</th>
                <th className="pb-2 font-medium">Dormiu mal</th>
              </tr>
            </thead>
            <tbody>
              {p.turnos.map((x) => (
                <tr key={x.unidade + x.turno} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-800">
                    {x.turno}
                    {unidade === 'todas' && <span className="block text-[10px] font-normal text-slate-400">{x.unidade}</span>}
                  </td>
                  {x.oculto || !x.indicadores ? (
                    <td colSpan={4} className="py-2 text-slate-400">
                      Grupo pequeno, oculto
                    </td>
                  ) : (
                    <>
                      <td className="py-2 tabular-nums">{x.indicadores.respostas}</td>
                      <BarraCel v={x.indicadores.energiaBaixa} cor="bg-amber-500" />
                      <BarraCel v={x.indicadores.dorForte} cor="bg-alerta" />
                      <BarraCel v={x.indicadores.sonoRuim} cor="bg-violet-500" />
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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

        <Cartao titulo="Onde as pessoas se perdem no retorno" subtitulo="Funil dos 4 passos · últimos 30 dias">
          <div className="space-y-4">
            {unidadesFiltro.map((u) => {
              const etapas = [
                ['Contato feito', u.funil.contato],
                ['Respondeu', u.funil.resposta],
                ['Agendou', u.funil.agendamento],
                ['Compareceu', u.funil.comparecimento],
              ] as const
              return (
                <div key={u.unidade}>
                  {unidade === 'todas' && <p className="mb-1 text-xs font-semibold text-navy">{u.unidade}</p>}
                  <div className="space-y-1">
                    {etapas.map(([r, v], i) => (
                      <div key={r} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 text-slate-500">{r}</span>
                        <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                          <div className="flex h-full items-center rounded-md bg-tech px-2 text-[10px] font-semibold text-white" style={{ width: `${pct(v, u.funil.contato)}%` }}>
                            {v}
                          </div>
                        </div>
                        <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                          {i === 0 ? '100%' : `${pct(v, u.funil.contato)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Cartao>

        <Cartao titulo="Por que as pessoas saem do cuidado" subtitulo='Motivos do "não consegui" · contagem, sem nomes'>
          <div className="space-y-4">
            {unidadesFiltro.map((u) => {
              const max = Math.max(1, ...Object.values(u.motivos))
              return (
                <div key={u.unidade}>
                  {unidade === 'todas' && <p className="mb-1 text-xs font-semibold text-navy">{u.unidade}</p>}
                  <div className="space-y-1">
                    {MOTIVOS.map((m) => (
                      <div key={m.motivo} className="flex items-center gap-2 text-xs">
                        <span className="w-44 shrink-0 truncate text-slate-600">
                          {m.emoji} {m.rotulo}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${(u.motivos[m.motivo] / max) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right font-semibold tabular-nums text-navy">{u.motivos[m.motivo]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Comparativo das unidades" subtitulo="Agregado · fictício">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="pb-2 font-medium">Unidade</th>
                <th className="pb-2 font-medium">Vidas</th>
                <th className="pb-2 font-medium">Comparecimento (antes → piloto)</th>
                <th className="pb-2 font-medium">Planos recebidos</th>
                <th className="pb-2 font-medium">Em dia com o prazo do risco</th>
                <th className="pb-2 font-medium">Respostas no totem (28 d)</th>
              </tr>
            </thead>
            <tbody>
              {p.unidades.map((u) => (
                <tr key={u.unidade} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-navy">{u.unidade}</td>
                  <td className="py-2 tabular-nums">{u.vidas}</td>
                  <td className="py-2 tabular-nums">
                    {u.comparecimentoAntes}% → <b className="text-saude-700">{u.comparecimentoAgora}%</b>
                  </td>
                  <td className="py-2 tabular-nums">{u.planosRecebidos}%</td>
                  <td className="py-2 tabular-nums">{u.emDiaComRisco}%</td>
                  <td className="py-2 tabular-nums">{u.respostasNoTotem}</td>
                </tr>
              ))}
              {p.unidadesOcultas.map((u) => (
                <tr key={u} className="border-t border-slate-100 text-slate-400">
                  <td className="py-2">{u}</td>
                  <td colSpan={5} className="py-2">
                    <span className="inline-flex items-center gap-1">
                      <EyeOff className="size-3.5" /> Menos de {p.minimoDoGrupo} pessoas: oculto para proteger a identidade
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  )
}

function BarraCel({ v, cor }: { v: number; cor: string }) {
  return (
    <td className="py-2">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${cor}`} style={{ width: `${v}%` }} />
        </div>
        <span className="tabular-nums">{v}%</span>
      </div>
    </td>
  )
}
