import { useState } from 'react'
import { AlertTriangle, CalendarClock, Clock, Factory, HeartHandshake, Users, type LucideIcon } from 'lucide-react'
import type { AgendaDoTurno, Liberacao } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { Cartao } from '../../../componentes/Cartao'
import { Escolha } from '../../../componentes/Escolha'
import { addDias, dataCurta, horaCurta, inicioDoDia, semanaCurta } from '../../../lib/datas'

// Visão da Liderança: organizar a cobertura do turno para as liberações de saúde.
// A API nunca manda o motivo; o nome vem só quando a própria pessoa autorizou.

type Periodo = 'matutino' | 'noturno' | 'ambos'

// Janelas da agenda. São só de visualização: os turnos de verdade (Turno A 6h–14h, Turno B 14h–22h) vêm do
// cadastro da API. A liberação aparece pela hora em que acontece; das 13h às 16h ela está nas duas janelas.
// `serve` diz quais turnos entram no percentual em dia mostrado no topo.
const PERIODOS: { valor: Periodo; rotulo: string; inicio: number; fim: number; serve: (inicioDoTurno: number) => boolean }[] = [
  { valor: 'matutino', rotulo: 'Matutino', inicio: 7, fim: 16, serve: (i) => i < 12 },
  { valor: 'noturno', rotulo: 'Noturno', inicio: 13, fim: 22, serve: (i) => i >= 12 },
  { valor: 'ambos', rotulo: 'Ambos', inicio: 7, fim: 22, serve: () => true },
]

const faixa = (inicio: number, fim: number) => `${inicio}h–${fim}h`

function proximosDiasUteis(n: number, hoje = new Date()): Date[] {
  const out: Date[] = []
  for (let d = 1; out.length < n && d < 14; d++) {
    const dia = addDias(inicioDoDia(hoje), d)
    if (dia.getDay() !== 0 && dia.getDay() !== 6) out.push(dia)
  }
  return out
}

export function PainelLideranca() {
  const { dados: agenda, erro } = useRecurso<AgendaDoTurno>('/lideranca/agenda', '/lideranca/eventos')
  const [unidadeSel, setUnidadeSel] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>('matutino')

  if (!agenda) return <p className="p-6 text-sm text-slate-500">{erro ? `Não foi possível carregar a agenda: ${erro}` : 'Carregando a agenda…'}</p>

  const daUnidade = agenda.unidades.find((u) => u.unidade === unidadeSel) ?? agenda.unidades[0]
  if (!daUnidade) return <p className="p-6 text-sm text-slate-500">Nenhuma unidade com liberações no turno.</p>
  const regra = PERIODOS.find((x) => x.valor === periodo)!
  const escolhidos = daUnidade.turnos.filter((t) => regra.serve(t.turno.inicio))
  const selecionados = escolhidos.length ? escolhidos : daUnidade.turnos
  const unidade = daUnidade.unidade
  const { inicio, fim } = regra
  const emDia = Math.round(selecionados.reduce((s, t) => s + t.emDia, 0) / selecionados.length)

  const dias = proximosDiasUteis(5)
  const horas = Array.from({ length: fim - inicio }, (_, i) => inicio + i)
  const limite = addDias(dias[dias.length - 1], 1).toISOString()

  const doTurno = agenda.liberacoes.filter((l) => {
    const hora = new Date(l.inicio).getHours()
    return l.unidade === unidade && hora >= inicio && hora < fim && l.inicio >= dias[0].toISOString() && l.inicio < limite
  })

  const naCelula = (dia: Date, h: number) =>
    doTurno
      .filter((l) => {
        const d = new Date(l.inicio)
        return inicioDoDia(d).getTime() === dia.getTime() && d.getHours() === h
      })
      .sort((a, b) => a.inicio.localeCompare(b.inicio))

  // Conflito de cobertura: 2+ pessoas liberadas no mesmo horário.
  const conflitos = dias.reduce((s, dia) => s + horas.filter((h) => naCelula(dia, h).length >= 2).length, 0)
  const minutos = doTurno.reduce((s, l) => s + l.duracaoMin, 0)

  const kpis: { rotulo: string; valor: string; Icone: LucideIcon; cor: string }[] = [
    { rotulo: 'Liberações nos próximos 5 dias', valor: String(doTurno.length), Icone: CalendarClock, cor: 'bg-blue-50 text-tech' },
    { rotulo: 'Minutos fora da linha', valor: `${minutos} min`, Icone: Clock, cor: 'bg-slate-100 text-navy' },
    { rotulo: 'Horários com 2+ pessoas', valor: String(conflitos), Icone: AlertTriangle, cor: conflitos ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-saude-700' },
    { rotulo: selecionados.length > 1 ? 'Dos turnos em dia com o cuidado (média)' : 'Do turno em dia com o cuidado', valor: `${emDia}%`, Icone: Users, cor: 'bg-emerald-50 text-saude-700' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Agenda de cuidado do turno</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Escolha
            rotulo="Unidade"
            Icone={Factory}
            valor={unidade}
            aoEscolher={setUnidadeSel}
            opcoes={agenda.unidades.map((u) => ({
              valor: u.unidade,
              rotulo: u.unidade,
              detalhe: `${u.turnos.length} ${u.turnos.length === 1 ? 'turno' : 'turnos'} com microconsulta`,
            }))}
          />
          <div role="group" aria-label="Período" className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {PERIODOS.map((x) => {
              const horario = faixa(x.inicio, x.fim)
              return (
                <button
                  key={x.valor}
                  onClick={() => setPeriodo(x.valor)}
                  aria-pressed={periodo === x.valor}
                  className={`rounded-full px-4 py-1.5 text-left leading-tight transition ${periodo === x.valor ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <span className="block text-sm font-semibold">{x.rotulo}</span>
                  <span className={`block text-xs ${periodo === x.valor ? 'text-blue-100' : 'text-slate-500'}`}>{horario}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.rotulo} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${k.cor}`}>
              <k.Icone className="size-5" />
            </span>
            <span>
              <span className="block text-2xl font-bold leading-none text-navy">{k.valor}</span>
              <span className="mt-1 block text-xs text-slate-500">{k.rotulo}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Cartao titulo={`${regra.rotulo} · ${unidade}`} subtitulo={`Próximos 5 dias úteis · ${faixa(inicio, fim)}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="w-14" />
                  {dias.map((d) => (
                    <th key={d.toISOString()} className="pb-1 font-semibold text-navy">
                      {semanaCurta(d.toISOString())} <span className="font-normal text-slate-500">{dataCurta(d.toISOString())}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horas.map((h) => (
                  <tr key={h}>
                    <td className="pr-1 text-right align-top tabular-nums text-slate-500">{String(h).padStart(2, '0')}h</td>
                    {dias.map((d) => {
                      const ls = naCelula(d, h)
                      const conflito = ls.length >= 2
                      return (
                        <td key={d.toISOString()} className={`h-12 rounded-lg align-top ${conflito ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-cinza'}`}>
                          <div className="space-y-1 p-1">
                            {ls.map((l) => (
                              <Bloco key={l.id} l={l} mostrarTurno={periodo === 'ambos'} />
                            ))}
                            {conflito && <p className="text-xs font-semibold text-amber-700">2+ no mesmo horário: combine cobertura</p>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>

        {/* Coluna da direita com a mesma altura do calendário: o cartão de dicas estica até alinhar embaixo. */}
        <div className="flex flex-col gap-4 xl:h-0 xl:min-h-full">
          <div className="min-h-0 flex-1 [&>section]:flex [&>section]:h-full [&>section]:flex-col [&>section]:overflow-y-auto">
            <Cartao titulo="Como apoiar sem invadir" acao={<HeartHandshake className="size-5 text-saude-700" />}>
              <ul className="space-y-2.5 text-[13px] leading-snug text-slate-600">
                {[
                  'Libere sem pedir justificativa. O compromisso já foi validado pela equipe de saúde.',
                  'Nunca pergunte o motivo nem comente com o time. O cuidado é sigiloso.',
                  'No DDS, lembre que a APS é separada do exame ocupacional e não conta como "corpo mole".',
                  'Se dois saírem no mesmo horário, ajuste a cobertura, não a consulta.',
                  'Cuide de você também: liderança tem acesso ao mesmo programa.',
                ].map((dica) => (
                  <li key={dica} className="flex gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-saude" aria-hidden />
                    {dica}
                  </li>
                ))}
              </ul>
            </Cartao>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bloco({ l, mostrarTurno }: { l: Liberacao; mostrarTurno: boolean }) {
  return (
    <div className={`rounded-md px-1.5 py-1 leading-tight ${l.nome ? 'bg-tech text-white' : 'bg-navy/80 text-white'}`}>
      <p className="font-semibold">
        {horaCurta(l.inicio)} · {l.duracaoMin} min{mostrarTurno && <span className="font-normal opacity-80"> · {l.turno.replace('Turno ', 'T')}</span>}
      </p>
      <p className="truncate opacity-90">{l.nome ?? 'Colaborador(a)'}</p>
    </div>
  )
}
