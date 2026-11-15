import { Building2, CalendarClock, MonitorSmartphone, RotateCcw, Users, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { api } from '../../api/cliente'
import { Logo } from '../../componentes/Logo'

const PAINEIS: { grupo: string; para: string; rotulo: string; Icone: LucideIcon }[] = [
  { grupo: 'Equipe de saúde', para: '/painel/aps', rotulo: 'Painel da APS', Icone: Users },
  { grupo: 'Empresa', para: '/painel/lideranca', rotulo: 'Liderança do turno', Icone: CalendarClock },
  { grupo: 'Empresa', para: '/painel/rh', rotulo: 'RH e Direção', Icone: Building2 },
]

const reiniciarDemonstracao = () => api.post('/demonstracao/reinicio')

/** O mesmo fundo do totem (superficies/totem/Moldura.tsx): azul profundo com brilhos nos cantos. */
const FUNDO_DA_MARCA =
  'radial-gradient(120% 40% at 100% 0%, #1a50c2 0%, rgba(26,80,194,0) 62%), radial-gradient(110% 35% at 0% 100%, #0e50cc 0%, rgba(14,80,204,0) 65%), linear-gradient(170deg, #0a3090 0%, #071f5f 40%, #05154a 72%, #07267a 100%)'

/** Ondas luminosas do totem, no pé da barra lateral. */
function Ondas() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full" viewBox="0 0 240 220" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="onda-da-barra" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1c63e6" />
          <stop offset="1" stopColor="#22a6ff" />
        </linearGradient>
      </defs>
      <path d="M0 120 C60 95 130 150 240 110 L240 220 L0 220 Z" fill="#1a47c2" opacity="0.35" />
      <path d="M0 160 C70 135 150 185 240 150 L240 220 L0 220 Z" fill="url(#onda-da-barra)" opacity="0.4" />
      <path d="M0 160 C70 135 150 185 240 150" fill="none" stroke="#8fdcff" strokeOpacity="0.45" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Casca comum dos três painéis. No produto, cada perfil entraria só na sua área. */
export function CascaPainel() {
  return (
    <div className="flex h-full">
      <aside className="relative hidden w-64 shrink-0 flex-col overflow-hidden px-3 py-6 text-white lg:flex" style={{ background: FUNDO_DA_MARCA }}>
        <Ondas />
        <div className="relative px-2">
          <Logo tamanho="md" />
          <p className="mt-3 text-[11px] text-blue-100/70">com a APS do SESI Saúde Acolhe</p>
        </div>

        <nav className="relative mt-6 space-y-1">
          {PAINEIS.map(({ grupo, para, rotulo, Icone }, i) => (
            <div key={para}>
              {(i === 0 || PAINEIS[i - 1].grupo !== grupo) && (
                <p className="mb-1.5 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-100/55">{grupo}</p>
              )}
              <NavLink
                to={para}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1fe0b0] to-[#10c795] font-semibold text-[#06204f] shadow-[0_0.3rem_1.2rem_rgba(25,211,162,0.35)]'
                      : 'text-blue-50/85 hover:bg-white/10'
                  }`
                }
              >
                <Icone className="size-4" /> {rotulo}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="relative mt-auto space-y-1">
          <Link to="/totem" target="_blank" className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-sm text-blue-50/85 hover:bg-white/10">
            <MonitorSmartphone className="size-4" /> Abrir um totem
          </Link>
          <button onClick={reiniciarDemonstracao} className="flex w-full items-center gap-2 rounded-full px-4 py-2 text-sm text-blue-50/85 hover:bg-white/10">
            <RotateCcw className="size-4" /> Reiniciar demonstração
          </button>
          <p className="px-4 pt-2 text-[10px] text-blue-100/50">Café com Bugs · Hackathon+ SESI Saúde 2026</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior em telas menores */}
        <header className="flex items-center justify-between gap-2 px-4 py-3 lg:hidden" style={{ background: FUNDO_DA_MARCA }}>
          <Logo tamanho="sm" />
          <div className="flex gap-1">
            {PAINEIS.map(({ para, Icone, rotulo }) => (
              <NavLink
                key={para}
                to={para}
                aria-label={rotulo}
                className={({ isActive }) => `grid size-9 place-items-center rounded-full ${isActive ? 'bg-[#1fe0b0] text-[#06204f]' : 'text-blue-100'}`}
              >
                <Icone className="size-4" />
              </NavLink>
            ))}
            <button onClick={reiniciarDemonstracao} aria-label="Reiniciar demonstração" className="grid size-9 place-items-center rounded-full text-blue-100">
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
