import { Building2, CalendarClock, Database, MonitorSmartphone, RotateCcw, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { api } from '../../api/cliente'
import { Logo } from '../../componentes/Logo'

const PAINEIS: { grupo: string; para: string; rotulo: string; Icone: LucideIcon }[] = [
  { grupo: 'Equipe de saúde', para: '/painel/aps', rotulo: 'Painel da APS', Icone: Users },
  { grupo: 'Empresa', para: '/painel/lideranca', rotulo: 'Liderança do turno', Icone: CalendarClock },
  { grupo: 'Empresa', para: '/painel/rh', rotulo: 'RH e Direção', Icone: Building2 },
]

const reiniciarDemonstracao = () => api.post('/demonstracao/reinicio')

/** Casca comum dos três painéis. No produto, cada perfil entraria só na sua área. */
export function CascaPainel() {
  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col bg-navy px-3 py-5 text-white lg:flex">
        <div className="px-2">
          <Logo />
          <p className="mt-1 text-[11px] text-blue-100/70">
            Cuidar hoje. <span className="text-saude">Trabalhar melhor</span> amanhã.
          </p>
          <p className="text-[10px] text-blue-100/50">com a APS do SESI Saúde Acolhe</p>
        </div>

        <nav className="mt-6 space-y-1">
          {PAINEIS.map(({ grupo, para, rotulo, Icone }, i) => (
            <div key={para}>
              {(i === 0 || PAINEIS[i - 1].grupo !== grupo) && (
                <p className="mb-1 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wider text-blue-100/50">{grupo}</p>
              )}
              <NavLink
                to={para}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-tech text-white shadow' : 'text-blue-100/80 hover:bg-white/5'
                  }`
                }
              >
                <Icone className="size-4" /> {rotulo}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-white/5 p-3 text-[11px] leading-snug text-blue-100/80">
            <p className="flex items-center gap-1.5 font-semibold text-white">
              <Database className="size-3.5 text-saude" /> Dados fictícios
            </p>
            <p className="mt-1">S+ e WhatsApp simulados atrás da API. Sem integração real no hackathon.</p>
            <p className="mt-2 flex items-center gap-1.5 font-semibold text-white">
              <ShieldCheck className="size-3.5 text-saude" /> LGPD
            </p>
            <p className="mt-1">RH e direção recebem só agregados (grupos de 5+). Liderança recebe só horários de liberação. Mensagens sem dado clínico.</p>
          </div>
          <Link to="/totem" target="_blank" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-100/80 hover:bg-white/5">
            <MonitorSmartphone className="size-4" /> Abrir um totem
          </Link>
          <button onClick={reiniciarDemonstracao} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-blue-100/80 hover:bg-white/5">
            <RotateCcw className="size-4" /> Reiniciar demonstração
          </button>
          <p className="px-3 text-[10px] text-blue-100/40">Café com Bugs · Hackathon+ SESI Saúde 2026</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior em telas menores */}
        <header className="flex items-center justify-between gap-2 bg-navy px-4 py-3 lg:hidden">
          <Logo tamanho="sm" />
          <div className="flex gap-1">
            {PAINEIS.map(({ para, Icone, rotulo }) => (
              <NavLink
                key={para}
                to={para}
                aria-label={rotulo}
                className={({ isActive }) => `grid size-9 place-items-center rounded-lg ${isActive ? 'bg-tech text-white' : 'text-blue-100'}`}
              >
                <Icone className="size-4" />
              </NavLink>
            ))}
            <button onClick={reiniciarDemonstracao} aria-label="Reiniciar demonstração" className="grid size-9 place-items-center rounded-lg text-blue-100">
              <RotateCcw className="size-4" />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
