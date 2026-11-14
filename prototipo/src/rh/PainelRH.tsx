import { useMemo, useState } from 'react'
import { Building2, CalendarCheck, EyeOff, FileCheck2, Lightbulb, MessagesSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { Pulso } from '../data/types'
import { useDados } from '../data/store'
import { EMPRESA_EXEMPLO, MINIMO_GRUPO, UNIDADES, type ResumoUnidade } from '../data/unidades'
import { MOTIVOS } from '../domain/regras'
import { addDias, dataCurta, inicioDoDia } from '../lib/datas'
import { Cartao } from '../components/comum'

// Visão de RH e Direção: SÓ agregados e anônimos. Grupos com menos de MINIMO_GRUPO pessoas não aparecem.
// Não usar "adesão" para uso do canal: adesão é verificada pela equipe de saúde.

const visiveis = UNIDADES.filter((u) => u.vidas >= MINIMO_GRUPO)
const ocultas = UNIDADES.filter((u) => u.vidas < MINIMO_GRUPO)

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

function indicadoresPulso(ps: Pulso[]) {
  const n = ps.length
  return {
    n,
    energiaBaixa: pct(ps.filter((p) => p.energia === 1).length, n),
    dorForte: pct(ps.filter((p) => p.dor === 3).length, n),
    sonoRuim: pct(ps.filter((p) => p.sono === 1).length, n),
  }
}

export function PainelRH() {
  const { pulsos } = useDados()
  const [unidade, setUnidade] = useState<string>('todas')

  const hoje = inicioDoDia(new Date())
  const desde = addDias(hoje, -28).toISOString()
  const pulsos28 = useMemo(() => pulsos.filter((p) => p.data >= desde && visiveis.some((u) => u.unidade === p.unidade)), [pulsos, desde])
  const doFiltro = unidade === 'todas' ? pulsos28 : pulsos28.filter((p) => p.unidade === unidade)
  const unidadesFiltro = unidade === 'todas' ? visiveis : visiveis.filter((u) => u.unidade === unidade)

  const vidas = unidadesFiltro.reduce((s, u) => s + u.vidas, 0)
  const media = (f: (u: ResumoUnidade) => number) => Math.round(unidadesFiltro.reduce((s, u) => s + f(u) * u.vidas, 0) / Math.max(1, vidas))

  // Participação semanal (4 semanas)
  const semanas = [3, 2, 1, 0].map((k) => {
    const ini = addDias(hoje, -7 * (k + 1) + 1)
    const fim = addDias(hoje, -7 * k + 1)
    const n = doFiltro.filter((p) => p.data >= ini.toISOString() && p.data < fim.toISOString()).length
    return { rotulo: `${dataCurta(ini.toISOString())}–${dataCurta(addDias(fim, -1).toISOString())}`, n }
  })
  const maxSemana = Math.max(1, ...semanas.map((s) => s.n))

  // Por turno
  const turnos = [...new Set(doFiltro.map((p) => `${p.unidade}|${p.turno}`))].sort()
  const porTurno = turnos.map((k) => {
    const [u, t] = k.split('|')
    return { unidade: u, turno: t, ...indicadoresPulso(doFiltro.filter((p) => p.unidade === u && p.turno === t)) }
  })
  const insights = porTurno.flatMap((x) => {
    const onde = `${x.turno}${unidade === 'todas' ? ` (${x.unidade})` : ''}`
    const out: string[] = []
    if (x.n < MINIMO_GRUPO) return out
    if (x.sonoRuim >= 40) out.push(`${onde}: ${x.sonoRuim}% dizem dormir mal. Vale uma ação sobre sono para quem trabalha à noite e revisar a escala.`)
    if (x.dorForte >= 25) out.push(`${onde}: ${x.dorForte}% relatam dor forte. Sugere olhar ergonomia do posto e pausas.`)
    if (x.energiaBaixa >= 35) out.push(`${onde}: ${x.energiaBaixa}% com energia baixa. Hidratação e pausas no turno.`)
    return out
  })

  const total = indicadoresPulso(doFiltro)

  const kpis: { rotulo: string; valor: string; detalhe: string; Icone: LucideIcon; cor: string }[] = [
    { rotulo: 'Vidas no programa', valor: vidas.toLocaleString('pt-BR'), detalhe: `${unidadesFiltro.length} unidade(s)`, Icone: Building2, cor: 'bg-blue-50 text-tech' },
    {
      rotulo: 'Comparecimento aos retornos',
      valor: `${media((u) => u.comparecimentoAgora)}%`,
      detalhe: `era ${media((u) => u.comparecimentoAntes)}% antes · simulação de piloto`,
      Icone: CalendarCheck,
      cor: 'bg-emerald-50 text-saude-700',
    },
    { rotulo: 'Planos de cuidado recebidos', valor: `${media((u) => u.planosRecebidos)}%`, detalhe: 'abriram o plano enviado', Icone: FileCheck2, cor: 'bg-amber-50 text-amber-600' },
    { rotulo: 'Respostas no totem', valor: total.n.toLocaleString('pt-BR'), detalhe: 'últimos 28 dias · anônimas', Icone: MessagesSquare, cor: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Visão da empresa · {EMPRESA_EXEMPLO}</h2>
          <p className="text-sm text-slate-500">Para RH e Direção. Indicadores agregados e anônimos do programa e dos totens. Dados fictícios.</p>
        </div>
        <label className="text-sm text-slate-600">
          Unidade{' '}
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-navy">
            <option value="todas">Todas</option>
            {visiveis.map((u) => (
              <option key={u.unidade}>{u.unidade}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-navy/5 px-3 py-2 text-xs text-navy">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-saude-700" />
        Nenhum dado individual aparece aqui. Grupos com menos de {MINIMO_GRUPO} pessoas ficam ocultos. Uso do canal e respostas do totem não medem adesão ao tratamento: isso é verificado pela equipe de saúde.
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
            {semanas.map((s) => (
              <div key={s.rotulo} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular-nums text-navy">{s.n}</span>
                <div className="w-full rounded-t-lg bg-tech" style={{ height: `${(s.n / maxSemana) * 100}px` }} />
                <span className="text-[10px] text-slate-400">{s.rotulo}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['Energia baixa', total.energiaBaixa, 'bg-amber-500'],
                ['Dor forte', total.dorForte, 'bg-alerta'],
                ['Dormiu mal', total.sonoRuim, 'bg-violet-500'],
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
              {porTurno.map((x) => (
                <tr key={x.unidade + x.turno} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-800">
                    {x.turno}
                    {unidade === 'todas' && <span className="block text-[10px] font-normal text-slate-400">{x.unidade}</span>}
                  </td>
                  {x.n < MINIMO_GRUPO ? (
                    <td colSpan={4} className="py-2 text-slate-400">
                      Grupo pequeno, oculto
                    </td>
                  ) : (
                    <>
                      <td className="py-2 tabular-nums">{x.n}</td>
                      <BarraCel v={x.energiaBaixa} cor="bg-amber-500" />
                      <BarraCel v={x.dorForte} cor="bg-alerta" />
                      <BarraCel v={x.sonoRuim} cor="bg-violet-500" />
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
              {visiveis.map((u) => (
                <tr key={u.unidade} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-navy">{u.unidade}</td>
                  <td className="py-2 tabular-nums">{u.vidas}</td>
                  <td className="py-2 tabular-nums">
                    {u.comparecimentoAntes}% → <b className="text-saude-700">{u.comparecimentoAgora}%</b>
                  </td>
                  <td className="py-2 tabular-nums">{u.planosRecebidos}%</td>
                  <td className="py-2 tabular-nums">{u.emDiaComRisco}%</td>
                  <td className="py-2 tabular-nums">{pulsos28.filter((p) => p.unidade === u.unidade).length}</td>
                </tr>
              ))}
              {ocultas.map((u) => (
                <tr key={u.unidade} className="border-t border-slate-100 text-slate-400">
                  <td className="py-2">{u.unidade}</td>
                  <td colSpan={5} className="py-2">
                    <span className="inline-flex items-center gap-1">
                      <EyeOff className="size-3.5" /> Menos de {MINIMO_GRUPO} pessoas: oculto para proteger a identidade
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
