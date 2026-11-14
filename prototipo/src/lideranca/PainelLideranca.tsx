import { useState } from 'react'
import { AlertTriangle, CalendarClock, Clock, EyeOff, HeartHandshake, Users, type LucideIcon } from 'lucide-react'
import type { Liberacao } from '../data/types'
import { useDados } from '../data/store'
import { EM_DIA_POR_TURNO } from '../data/unidades'
import { TURNOS } from '../domain/regras'
import { addDias, dataCurta, horaCurta, inicioDoDia, semanaCurta } from '../lib/datas'
import { Cartao, MetaTurno } from '../components/comum'

// Visão da Liderança: organizar a cobertura do turno para as liberações de saúde.
// Nunca mostra o motivo; o nome aparece só quando a própria pessoa autorizou.

const UNIDADES_LIDERANCA = Object.keys(EM_DIA_POR_TURNO)

function proximosDiasUteis(n: number, hoje = new Date()): Date[] {
  const out: Date[] = []
  for (let d = 1; out.length < n && d < 14; d++) {
    const dia = addDias(inicioDoDia(hoje), d)
    if (dia.getDay() !== 0 && dia.getDay() !== 6) out.push(dia)
  }
  return out
}

export function PainelLideranca() {
  const { liberacoes } = useDados()
  const [unidade, setUnidade] = useState(UNIDADES_LIDERANCA[0])
  const turnosDaUnidade = Object.keys(EM_DIA_POR_TURNO[unidade] ?? {}).filter((t) => {
    const def = TURNOS.find((x) => x.nome === t)
    return def && def.inicio < def.fim // agenda de liberação para turnos diurnos
  })
  const [turnoSel, setTurnoSel] = useState('Turno A')
  const turno = turnosDaUnidade.includes(turnoSel) ? turnoSel : turnosDaUnidade[0]
  const def = TURNOS.find((x) => x.nome === turno)!

  const dias = proximosDiasUteis(5)
  const horas = Array.from({ length: def.fim - def.inicio }, (_, i) => def.inicio + i)
  const limite = addDias(dias[dias.length - 1], 1).toISOString()

  const doTurno = liberacoes.filter((l) => l.unidade === unidade && l.turno === turno && l.inicio >= dias[0].toISOString() && l.inicio < limite)

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
  const emDia = EM_DIA_POR_TURNO[unidade]?.[turno]

  const kpis: { rotulo: string; valor: string; Icone: LucideIcon; cor: string }[] = [
    { rotulo: 'Liberações nos próximos 5 dias', valor: String(doTurno.length), Icone: CalendarClock, cor: 'bg-blue-50 text-tech' },
    { rotulo: 'Minutos fora da linha', valor: `${minutos} min`, Icone: Clock, cor: 'bg-slate-100 text-navy' },
    { rotulo: 'Horários com 2+ pessoas', valor: String(conflitos), Icone: AlertTriangle, cor: conflitos ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-saude-700' },
    { rotulo: 'Do turno em dia com o cuidado', valor: emDia !== undefined ? `${emDia}%` : '—', Icone: Users, cor: 'bg-emerald-50 text-saude-700' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Agenda de cuidado do turno</h2>
          <p className="text-sm text-slate-500">Para a liderança organizar a cobertura da linha. Microconsultas de 20 min no ambulatório da empresa, dentro do turno.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <select value={unidade} onChange={(e) => setUnidade(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-navy">
            {UNIDADES_LIDERANCA.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <select value={turno} onChange={(e) => setTurnoSel(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-navy">
            {turnosDaUnidade.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-navy/5 px-3 py-2 text-xs text-navy">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-saude-700" />
        Você vê só o horário da liberação. Nunca o motivo nem o tipo de atendimento. O nome aparece apenas quando a própria pessoa autoriza; senão, aparece "Colaborador(a)".
      </p>

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
        <Cartao titulo={`${turno} · ${unidade}`} subtitulo="Próximos 5 dias úteis">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="w-14" />
                  {dias.map((d) => (
                    <th key={d.toISOString()} className="pb-1 font-semibold text-navy">
                      {semanaCurta(d.toISOString())} <span className="font-normal text-slate-400">{dataCurta(d.toISOString())}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horas.map((h) => (
                  <tr key={h}>
                    <td className="pr-1 text-right align-top tabular-nums text-slate-400">{String(h).padStart(2, '0')}h</td>
                    {dias.map((d) => {
                      const ls = naCelula(d, h)
                      const conflito = ls.length >= 2
                      return (
                        <td key={d.toISOString()} className={`h-12 rounded-lg align-top ${conflito ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-cinza'}`}>
                          <div className="space-y-1 p-1">
                            {ls.map((l) => (
                              <Bloco key={l.id} l={l} />
                            ))}
                            {conflito && <p className="text-[10px] font-semibold text-amber-700">2+ no mesmo horário: combine cobertura</p>}
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

        <div className="space-y-4">
          <MetaTurno unidade={unidade} turno={turno} />
          <Cartao titulo="Como apoiar sem invadir" acao={<HeartHandshake className="size-5 text-saude-700" />}>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>• Libere sem pedir justificativa. O compromisso já foi validado pela equipe de saúde.</li>
              <li>• Nunca pergunte o motivo nem comente com o time. O cuidado é sigiloso.</li>
              <li>• No DDS, lembre que a APS é separada do exame ocupacional e não conta como "corpo mole".</li>
              <li>• Se dois saírem no mesmo horário, ajuste a cobertura, não a consulta.</li>
              <li>• Cuide de você também: liderança tem acesso ao mesmo programa.</li>
            </ul>
          </Cartao>
        </div>
      </div>
    </div>
  )
}

function Bloco({ l }: { l: Liberacao }) {
  return (
    <div className={`rounded-md px-1.5 py-1 leading-tight ${l.nome ? 'bg-tech text-white' : 'bg-navy/80 text-white'}`}>
      <p className="font-semibold">{horaCurta(l.inicio)} · {l.duracaoMin} min</p>
      <p className="truncate opacity-90">{l.nome ?? 'Colaborador(a)'}</p>
    </div>
  )
}
