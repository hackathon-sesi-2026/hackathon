import { useState } from 'react'
import { Building2, CalendarClock, Columns2, Database, MonitorSmartphone, RotateCcw, ShieldCheck, Smartphone, Users, type LucideIcon } from 'lucide-react'
import { adapter, useDados } from './data/store'
import { TrabalhadorApp } from './trabalhador/TrabalhadorApp'
import { PainelEnfermeira } from './enfermeira/PainelEnfermeira'
import { Totem } from './totem/Totem'
import { PainelRH } from './rh/PainelRH'
import { PainelLideranca } from './lideranca/PainelLideranca'
import { Logo } from './components/Logo'

type Modo = 'lado' | 'trabalhador' | 'totem' | 'enfermeira' | 'lideranca' | 'rh'

const NAV: { grupo: string; modo: Modo; rotulo: string; Icone: LucideIcon; soDesktop?: boolean }[] = [
  { grupo: 'Trabalhador', modo: 'lado', rotulo: 'Visão lado a lado', Icone: Columns2, soDesktop: true },
  { grupo: 'Trabalhador', modo: 'trabalhador', rotulo: 'Celular do trabalhador', Icone: Smartphone },
  { grupo: 'Trabalhador', modo: 'totem', rotulo: 'Totem na unidade', Icone: MonitorSmartphone },
  { grupo: 'Equipe de saúde', modo: 'enfermeira', rotulo: 'Painel da APS', Icone: Users },
  { grupo: 'Empresa', modo: 'lideranca', rotulo: 'Liderança do turno', Icone: CalendarClock },
  { grupo: 'Empresa', modo: 'rh', rotulo: 'RH e Direção', Icone: Building2 },
]

export default function App() {
  const { trabalhadores } = useDados()
  const [modo, setModo] = useState<Modo>(() => (window.innerWidth >= 1280 ? 'lado' : 'enfermeira'))
  const [selecionado, setSelecionado] = useState('t1')
  const t = trabalhadores.find((x) => x.id === selecionado) ?? trabalhadores[0]

  const verTrabalhador = (id: string) => {
    setSelecionado(id)
    if (modo === 'enfermeira') setModo('trabalhador')
  }

  return (
    <div className="flex h-full">
      {/* Sidebar no estilo da referência */}
      <aside className="hidden w-60 shrink-0 flex-col bg-navy px-3 py-5 text-white lg:flex">
        <div className="px-2">
          <Logo />
          <p className="mt-1 text-[11px] text-blue-100/70">
            Cuidar hoje. <span className="text-saude">Trabalhar melhor</span> amanhã.
          </p>
          <p className="text-[10px] text-blue-100/50">com a APS do SESI Saúde Acolhe</p>
        </div>

        <nav className="mt-6 space-y-1">
          {NAV.map(({ grupo, modo: m, rotulo, Icone, soDesktop }, i) => (
            <div key={m}>
              {(i === 0 || NAV[i - 1].grupo !== grupo) && (
                <p className="mt-4 mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-blue-100/50">{grupo}</p>
              )}
              <button
                onClick={() => setModo(m)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  modo === m ? 'bg-tech text-white shadow' : 'text-blue-100/80 hover:bg-white/5'
                } ${soDesktop ? 'max-xl:hidden' : ''}`}
              >
                <Icone className="size-4" /> {rotulo}
              </button>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-white/5 p-3 text-[11px] leading-snug text-blue-100/80">
            <p className="flex items-center gap-1.5 font-semibold text-white">
              <Database className="size-3.5 text-saude" /> Dados fictícios
            </p>
            <p className="mt-1">Adaptador simulado no lugar do S+. Sem API real no hackathon.</p>
            <p className="mt-2 flex items-center gap-1.5 font-semibold text-white">
              <ShieldCheck className="size-3.5 text-saude" /> LGPD
            </p>
            <p className="mt-1">RH e direção veem só agregados (grupos de 5+). Liderança vê só horários de liberação. Mensagens sem dado clínico.</p>
          </div>
          <button onClick={() => adapter.reiniciar()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-100/80 hover:bg-white/5">
            <RotateCcw className="size-4" /> Reiniciar demo
          </button>
          <p className="px-3 text-[10px] text-blue-100/40">Café com Bugs · Hackathon+ SESI Saúde 2026</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior em telas menores */}
        <header className="flex items-center justify-between gap-2 bg-navy px-4 py-3 lg:hidden">
          <Logo tamanho="sm" />
          <div className="flex gap-1">
            {NAV.filter((n) => !n.soDesktop).map(({ modo: m, Icone, rotulo }) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                aria-label={rotulo}
                className={`grid size-9 place-items-center rounded-lg ${modo === m ? 'bg-tech text-white' : 'text-blue-100'}`}
              >
                <Icone className="size-4" />
              </button>
            ))}
            <button onClick={() => adapter.reiniciar()} aria-label="Reiniciar demo" className="grid size-9 place-items-center rounded-lg text-blue-100">
              <RotateCcw className="size-4" />
            </button>
          </div>
        </header>

        <main className={`flex min-h-0 flex-1 gap-6 overflow-auto p-4 sm:p-6 ${modo === 'lado' ? 'flex-row' : 'flex-col'}`}>
          {modo === 'totem' && (
            <section className="mx-auto">
              <Totem />
            </section>
          )}
          {modo === 'rh' && (
            <section className="min-w-0 flex-1">
              <PainelRH />
            </section>
          )}
          {modo === 'lideranca' && (
            <section className="min-w-0 flex-1">
              <PainelLideranca />
            </section>
          )}
          {(modo === 'lado' || modo === 'trabalhador') && t && (
            <section className={`flex shrink-0 flex-col items-center gap-3 ${modo === 'trabalhador' ? 'mx-auto' : ''}`}>
              <label className="text-sm text-slate-600">
                Simulando o celular de{' '}
                <select value={t.id} onChange={(e) => setSelecionado(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-navy">
                  {trabalhadores.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                      {x.id === 't1' ? ' (persona)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="h-[720px] max-h-[calc(100vh-7rem)] w-[360px] max-w-full overflow-hidden rounded-[2.5rem] border-[10px] border-navy bg-white shadow-2xl">
                <TrabalhadorApp key={t.id} trabalhador={t} />
              </div>
            </section>
          )}
          {(modo === 'lado' || modo === 'enfermeira') && (
            <section className="min-h-[600px] min-w-0 flex-1">
              <PainelEnfermeira selecionado={selecionado} onVerTrabalhador={verTrabalhador} compacto={modo === 'lado'} />
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
