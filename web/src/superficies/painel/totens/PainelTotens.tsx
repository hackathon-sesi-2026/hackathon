import { useState } from 'react'
import { Activity, CalendarDays, Clock, EyeOff, Frown, Lock, MonitorSmartphone, type LucideIcon } from 'lucide-react'
import type { LocalDor, MetricasDoTotem } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { Cartao } from '../../../componentes/Cartao'
import { faixaTurno, periodoDoTurno } from '../../../lib/datas'
import { MapaDeCalor, ROTULO_LOCAL_DOR } from '../../totem/BonecoDaDor'

// Métricas dos totens para a equipe de saúde: quanto o totem é usado e o que as respostas dizem.
// Tudo agregado e anônimo: o pulso não guarda quem respondeu, e turnos com menos de 5 respostas ficam ocultos.

const numero = (n: number) => n.toLocaleString('pt-BR')
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

const BEM_ESTAR = [
  { chave: '4', rotulo: 'Muito bem', cor: '#19d3a2' },
  { chave: '3', rotulo: 'Bem', cor: '#84cc16' },
  { chave: '2', rotulo: 'Mais ou menos', cor: '#f59e0b' },
  { chave: '1', rotulo: 'Cansado(a)', cor: '#ef4444' },
] as const

const INTENSIDADE = [
  { chave: '0', rotulo: 'Nenhuma', cor: '#19d3a2' },
  { chave: '1', rotulo: 'Leve', cor: '#9be15d' },
  { chave: '2', rotulo: 'Média', cor: '#f5c451' },
  { chave: '3', rotulo: 'Forte', cor: '#f59a6b' },
] as const

export function PainelTotens() {
  const [unidade, setUnidade] = useState('')
  const { dados: m, erro, carregando } = useRecurso<MetricasDoTotem>(`/aps/totens${unidade ? `?unidade=${encodeURIComponent(unidade)}` : ''}`, '/aps/eventos')

  if (!m) return <p className="p-6 text-sm text-slate-500">{erro ? `Não foi possível carregar as métricas: ${erro}` : 'Carregando as métricas dos totens…'}</p>

  const totalBem = Object.values(m.bemEstar).reduce((a, b) => a + b, 0)
  const totalDor = Object.values(m.intensidade).reduce((a, b) => a + b, 0)
  const comDor = totalDor - m.intensidade['0']
  const mediaPorDia = Math.round(m.respostas / Math.max(1, m.porDia.length))
  const pico = m.porHora.indexOf(Math.max(...m.porHora))
  const locais = (Object.entries(m.locaisDeDor) as [LocalDor, number][]).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-tech">Equipe de saúde</p>
          <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">Métricas dos totens</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="size-3.5" /> Respostas anônimas · últimos 28 dias {carregando && '· atualizando…'}
          </p>
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-slate-200" role="tablist" aria-label="Totem">
          {['', ...m.unidades].map((u) => (
            <button
              key={u || 'todos'}
              role="tab"
              aria-selected={unidade === u}
              onClick={() => setUnidade(u)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 transition ${unidade === u ? 'bg-navy text-white shadow' : 'text-slate-600 hover:text-navy'}`}
            >
              <MonitorSmartphone className="size-4" /> {u || `Todos os totens (${m.unidades.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Numero Icone={MonitorSmartphone} cor="bg-tech" rotulo="Respostas" valor={numero(m.respostas)} detalhe={`${numero(m.respostasHoje)} hoje`} />
        <Numero Icone={CalendarDays} cor="bg-saude" rotulo="Média por dia" valor={numero(mediaPorDia)} detalhe="respostas por dia" />
        <Numero Icone={Frown} cor="bg-amber-500" rotulo="Chegam cansados" valor={`${pct(m.bemEstar['1'], totalBem)}%`} detalhe={'responderam "Cansado(a)"'} />
        <Numero Icone={Activity} cor="bg-orange-500" rotulo="Sentem dor" valor={`${pct(comDor, totalDor)}%`} detalhe="leve, média ou forte" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <GraficoPorDia dias={m.porDia} />
        <Cartao titulo="Horários de mais uso" subtitulo={`Pico às ${pico}h · bom horário para avisos e campanhas`} acao={<Clock className="size-5 text-tech" />}>
          <div className="grid grid-cols-12 gap-1">
            {m.porHora.map((n, h) => {
              const forca = n / Math.max(1, ...m.porHora)
              return (
                <div
                  key={h}
                  title={`${h}h: ${n} respostas`}
                  className="flex aspect-square items-center justify-center rounded-md text-[9px] font-semibold"
                  style={{ background: n ? `rgba(28, 99, 230, ${0.12 + forca * 0.88})` : '#f1f5f9', color: forca > 0.5 ? 'white' : '#64748b' }}
                >
                  {h}h
                </div>
              )
            })}
          </div>
        </Cartao>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Como você está hoje?" subtitulo={`${numero(totalBem)} respostas`}>
          <Distribuicao itens={BEM_ESTAR.map((b) => ({ ...b, valor: m.bemEstar[b.chave] }))} total={totalBem} />
        </Cartao>
        <Cartao titulo="Você sente alguma dor hoje?" subtitulo={`${numero(totalDor)} respostas`}>
          <Distribuicao itens={INTENSIDADE.map((b) => ({ ...b, valor: m.intensidade[b.chave] }))} total={totalDor} />
        </Cartao>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <Cartao titulo="Onde mais dói" subtitulo="Partes tocadas no boneco do totem" acao={<Activity className="size-5 text-orange-500" />}>
          {locais.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Ainda sem relatos suficientes.</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
              <MapaDeCalor valores={m.locaisDeDor} className="mx-auto h-52 w-auto" />
              <ol className="space-y-2">
                {locais.slice(0, 6).map(([local, n], i) => (
                  <li key={local} className="flex items-center gap-2 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-cinza text-xs font-bold text-navy">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{ROTULO_LOCAL_DOR[local]}</span>
                    <b className="tabular-nums text-navy">{numero(n)}</b>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Cartao>
        <Cartao titulo="Por turno" subtitulo="Turnos com menos de 5 respostas ficam ocultos, para ninguém ser reconhecido">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-2 font-semibold">Totem</th>
                  <th className="px-2 py-2 font-semibold">Turno</th>
                  <th className="px-2 py-2 text-right font-semibold">Respostas</th>
                  <th className="px-2 py-2 text-right font-semibold">Cansados</th>
                  <th className="py-2 pl-2 text-right font-semibold">Com dor</th>
                </tr>
              </thead>
              <tbody>
                {m.porTurno.map((t) => (
                  <tr key={`${t.unidade}-${t.turno}`} className="border-b border-slate-50">
                    <td className="py-2 pr-2 text-slate-700">{t.unidade}</td>
                    <td className="px-2 py-2 text-slate-700">
                      <span className="font-medium text-navy">{t.turno.replace(' (noite)', '')}</span>
                      {t.inicio !== null && t.fim !== null && (
                        <span className="block text-xs text-slate-500">
                          {faixaTurno(t.inicio, t.fim)} · {periodoDoTurno(t.inicio)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-navy">{numero(t.respostas)}</td>
                    {t.oculto ? (
                      <td colSpan={2} className="py-2 pl-2 text-right text-xs text-slate-500">
                        <EyeOff className="mr-1 inline size-3.5" /> menos de 5
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-2 text-right tabular-nums">
                          <span className={t.cansados! >= 35 ? 'font-semibold text-amber-600' : 'text-slate-600'}>{t.cansados}%</span>
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums">
                          <span className={t.comDor! >= 40 ? 'font-semibold text-orange-600' : 'text-slate-600'}>{t.comDor}%</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      </div>
    </div>
  )
}

const PERIODOS = [7, 14, 28] as const
const DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Dia "2026-11-15" como data local (sem o deslize de fuso do `new Date('2026-11-15')`). */
function dataLocal(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/**
 * Respostas por dia, interativo: período de 7, 14 ou 28 dias, eixo com os dias, grade com números e a barra
 * em foco mostrando data e quantidade. Uma série só, por isso sem legenda; o número aparece ao focar, não em tudo.
 */
function GraficoPorDia({ dias }: { dias: { dia: string; respostas: number }[] }) {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>(14)
  const [foco, setFoco] = useState<number | null>(null)
  const visiveis = dias.slice(-periodo)
  const total = visiveis.reduce((s, d) => s + d.respostas, 0)
  const maior = Math.max(1, ...visiveis.map((d) => d.respostas))
  const iMaior = visiveis.findIndex((d) => d.respostas === maior)
  const topo = Math.max(5, Math.ceil(maior / 5) * 5)
  const grade = [topo, Math.round(topo / 2), 0]
  const ativo = foco ?? visiveis.length - 1
  const d = visiveis[ativo]
  const data = d ? dataLocal(d.dia) : null
  const rotuloCada = periodo === 7 ? 1 : periodo === 14 ? 2 : 7

  return (
    <Cartao
      titulo="Respostas por dia"
      subtitulo={`${numero(total)} respostas nos últimos ${periodo} dias · média de ${numero(Math.round(total / Math.max(1, visiveis.length)))} por dia`}
      acao={
        <div role="tablist" aria-label="Período" className="flex rounded-full bg-cinza p-0.5 text-xs font-semibold">
          {PERIODOS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={periodo === p}
              onClick={() => {
                setPeriodo(p)
                setFoco(null)
              }}
              className={`min-h-8 rounded-full px-3 transition ${periodo === p ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'}`}
            >
              {p}d
            </button>
          ))}
        </div>
      }
    >
      {/* Leitura do dia em foco: data por extenso e quantidade. Começa em hoje. */}
      <p className="mb-3 flex min-h-6 flex-wrap items-baseline gap-x-2 text-sm" aria-live="polite">
        {d && data && (
          <>
            <span className="text-2xl font-bold leading-none tabular-nums text-navy">{numero(d.respostas)}</span>
            <span className="text-slate-600">
              {d.respostas === 1 ? 'resposta' : 'respostas'} em {DIA_SEMANA[data.getDay()]}, {data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              {ativo === visiveis.length - 1 && <span className="ml-1.5 rounded-full bg-tech/10 px-2 py-0.5 text-xs font-semibold text-tech">hoje</span>}
              {ativo === iMaior && maior > 0 && <span className="ml-1.5 rounded-full bg-saude/15 px-2 py-0.5 text-xs font-semibold text-saude-700">melhor dia</span>}
            </span>
          </>
        )}
      </p>

      <div className="grid grid-cols-[2rem_1fr] gap-x-2">
        {/* eixo y */}
        <div className="relative h-40 text-right text-xs tabular-nums text-slate-500">
          {grade.map((g) => (
            <span key={g} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (g / topo) * 100}%` }}>
              {g}
            </span>
          ))}
        </div>
        {/* barras */}
        <div className="relative h-40" onMouseLeave={() => setFoco(null)}>
          {grade.map((g) => (
            <span key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-200" style={{ top: `${100 - (g / topo) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-px sm:gap-1" role="group" aria-label="Respostas por dia">
            {visiveis.map((x, i) => {
              const dt = dataLocal(x.dia)
              const fds = dt.getDay() === 0 || dt.getDay() === 6
              const emFoco = i === ativo
              return (
                <button
                  key={x.dia}
                  type="button"
                  onMouseEnter={() => setFoco(i)}
                  onFocus={() => setFoco(i)}
                  onClick={() => setFoco(i)}
                  aria-label={`${DIA_SEMANA[dt.getDay()]} ${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: ${x.respostas} respostas`}
                  aria-pressed={emFoco}
                  className="group relative flex h-full flex-1 items-end rounded-t outline-none focus-visible:ring-2 focus-visible:ring-tech"
                >
                  <span
                    className={`block w-full rounded-t transition-[height,background-color] duration-300 motion-reduce:transition-none ${
                      emFoco ? 'bg-navy' : fds ? 'bg-sky-300 group-hover:bg-sky-400' : 'bg-tech group-hover:bg-blue-700'
                    }`}
                    style={{ height: `${Math.max(x.respostas ? 3 : 1, (x.respostas / topo) * 100)}%` }}
                  />
                </button>
              )
            })}
          </div>
        </div>
        {/* eixo x */}
        <span />
        <div className="mt-1 flex gap-px sm:gap-1">
          {visiveis.map((x, i) => {
            const dt = dataLocal(x.dia)
            const mostrar = (visiveis.length - 1 - i) % rotuloCada === 0
            return (
              <span key={x.dia} className={`flex-1 text-center text-[11px] leading-tight tabular-nums ${i === ativo ? 'font-semibold text-navy' : 'text-slate-500'}`}>
                {mostrar && (
                  <>
                    {periodo === 7 && <span className="block">{DIA_SEMANA[dt.getDay()]}</span>}
                    {dt.getDate().toString().padStart(2, '0')}
                    {periodo !== 7 && <span className="text-slate-500">/{(dt.getMonth() + 1).toString().padStart(2, '0')}</span>}
                  </>
                )}
              </span>
            )
          })}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-tech" aria-hidden /> dia útil</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-sky-300" aria-hidden /> fim de semana</span>
        <span className="ml-auto">passe o mouse ou use Tab para ver cada dia</span>
      </p>
    </Cartao>
  )
}

function Numero({ Icone, cor, rotulo, valor, detalhe }: { Icone: LucideIcon; cor: string; rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${cor}`}>
          <Icone className="size-4" />
        </span>
        <p className="text-sm font-medium leading-tight text-slate-600">{rotulo}</p>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-navy sm:text-3xl">{valor}</p>
      <p className="text-xs text-slate-500">{detalhe}</p>
    </div>
  )
}

/** Uma barra única dividida pelas respostas, com a legenda em percentuais. */
function Distribuicao({ itens, total }: { itens: { chave: string; rotulo: string; cor: string; valor: number }[]; total: number }) {
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        {itens.map((i) => (i.valor ? <span key={i.chave} style={{ width: `${pct(i.valor, total)}%`, background: i.cor }} title={`${i.rotulo}: ${i.valor}`} /> : null))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {itens.map((i) => (
          <div key={i.chave} className="rounded-xl bg-cinza p-2.5">
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.cor }} /> {i.rotulo}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-navy">{pct(i.valor, total)}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}
