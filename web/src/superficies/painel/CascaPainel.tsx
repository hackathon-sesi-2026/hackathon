import { useEffect, useState } from 'react'
import { BarChart3, Building2, CalendarClock, Menu, MessageCircle, MonitorSmartphone, PanelLeftClose, PanelLeftOpen, RotateCcw, Users, X, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { api } from '../../api/cliente'
import { Logo, LogoMarca } from '../../componentes/Logo'

const PAINEIS: { grupo: string; para: string; rotulo: string; Icone: LucideIcon }[] = [
  { grupo: 'Equipe de saúde', para: '/painel/aps', rotulo: 'Painel da APS', Icone: Users },
  { grupo: 'Equipe de saúde', para: '/painel/whatsapp', rotulo: 'WhatsApp', Icone: MessageCircle },
  { grupo: 'Equipe de saúde', para: '/painel/totens', rotulo: 'Métricas dos totens', Icone: BarChart3 },
  { grupo: 'Empresa', para: '/painel/lideranca', rotulo: 'Liderança do turno', Icone: CalendarClock },
  { grupo: 'Empresa', para: '/painel/rh', rotulo: 'RH e Direção', Icone: Building2 },
]

const reiniciarDemonstracao = () => api.post('/demonstracao/reinicio')

/** O mesmo fundo do totem (superficies/totem/Moldura.tsx): azul profundo com brilhos nos cantos. */
const FUNDO_DA_MARCA =
  'radial-gradient(120% 40% at 100% 0%, #1a50c2 0%, rgba(26,80,194,0) 62%), radial-gradient(110% 35% at 0% 100%, #0e50cc 0%, rgba(14,80,204,0) 65%), linear-gradient(170deg, #0a3090 0%, #071f5f 40%, #05154a 72%, #07267a 100%)'

const CHAVE_RECOLHIDA = 'selo:barra-recolhida'

function lerRecolhida(): boolean {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDA) === '1'
  } catch {
    return false
  }
}

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

/** O conteúdo da barra lateral. Recolhida, mostra só os ícones (com o nome ao passar o mouse). */
function Barra({ recolhida, alternar, fechar }: { recolhida: boolean; alternar?: () => void; fechar?: () => void }) {
  const item = 'flex w-full items-center rounded-full text-sm transition'
  const forma = recolhida ? 'size-11 justify-center' : 'gap-3 px-4 py-2.5'
  return (
    <>
      <Ondas />
      <div className={`relative flex items-start ${recolhida ? 'flex-col items-center gap-3' : 'justify-between gap-2 px-2'}`}>
        {recolhida ? <LogoMarca className="size-10" /> : <Logo tamanho="md" />}
        {alternar && (
          <button
            onClick={alternar}
            aria-label={recolhida ? 'Abrir a barra lateral' : 'Recolher a barra lateral'}
            title={recolhida ? 'Abrir a barra lateral' : 'Recolher a barra lateral'}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-blue-100/80 hover:bg-white/10 hover:text-white"
          >
            {recolhida ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
        {fechar && (
          <button onClick={fechar} aria-label="Fechar o menu" className="grid size-8 shrink-0 place-items-center rounded-lg text-blue-100/80 hover:bg-white/10">
            <X className="size-4" />
          </button>
        )}
      </div>
      {!recolhida && <p className="relative mt-3 px-2 text-xs text-blue-100/70">com a APS do SESI Saúde Acolhe</p>}

      <nav className={`relative mt-6 space-y-1 ${recolhida ? 'flex flex-col items-center' : ''}`}>
        {PAINEIS.map(({ grupo, para, rotulo, Icone }, i) => (
          <div key={para} className={recolhida ? 'flex flex-col items-center' : ''}>
            {(i === 0 || PAINEIS[i - 1].grupo !== grupo) &&
              (recolhida ? (
                <span className="my-2 h-px w-8 bg-white/15" aria-hidden />
              ) : (
                <p className="mb-1.5 mt-5 px-3 text-xs font-semibold uppercase tracking-wider text-blue-100/55">{grupo}</p>
              ))}
            <NavLink
              to={para}
              title={recolhida ? rotulo : undefined}
              aria-label={rotulo}
              className={({ isActive }) =>
                `${item} ${forma} font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-[#1fe0b0] to-[#10c795] font-semibold text-[#06204f] shadow-[0_0.3rem_1.2rem_rgba(25,211,162,0.35)]'
                    : 'text-blue-50/85 hover:bg-white/10'
                }`
              }
            >
              <Icone className="size-[18px] shrink-0" /> {!recolhida && rotulo}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className={`relative mt-auto space-y-1 ${recolhida ? 'flex flex-col items-center' : ''}`}>
        <Link to="/totem" target="_blank" title={recolhida ? 'Abrir um totem' : undefined} className={`${item} ${forma} text-blue-50/85 hover:bg-white/10`}>
          <MonitorSmartphone className="size-4 shrink-0" /> {!recolhida && 'Abrir um totem'}
        </Link>
        <button onClick={reiniciarDemonstracao} title={recolhida ? 'Reiniciar demonstração' : undefined} className={`${item} ${forma} text-blue-50/85 hover:bg-white/10`}>
          <RotateCcw className="size-4 shrink-0" /> {!recolhida && 'Reiniciar demonstração'}
        </button>
        {!recolhida && <p className="px-4 pt-2 text-xs text-blue-100/50">Café com Bugs · Hackathon+ SESI Saúde 2026</p>}
      </div>
    </>
  )
}

/** Casca comum dos três painéis. No produto, cada perfil entraria só na sua área. */
export function CascaPainel() {
  const [recolhida, setRecolhida] = useState(lerRecolhida)
  const [menuAberto, setMenuAberto] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RECOLHIDA, recolhida ? '1' : '0')
    } catch {
      // sem armazenamento: só não lembra a escolha
    }
  }, [recolhida])
  useEffect(() => setMenuAberto(false), [pathname])

  const atual = PAINEIS.find((p) => pathname.startsWith(p.para))

  return (
    <div className="flex h-full">
      {/* Computador: barra lateral fixa, que recolhe para só os ícones */}
      <aside
        className={`relative hidden shrink-0 flex-col overflow-hidden py-6 text-white transition-[width] duration-200 lg:flex ${recolhida ? 'w-[4.75rem] px-2' : 'w-64 px-3'}`}
        style={{ background: FUNDO_DA_MARCA }}
      >
        <Barra recolhida={recolhida} alternar={() => setRecolhida((r) => !r)} />
      </aside>

      {/* Celular e tablet: menu que abre por cima */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuAberto(false)} aria-label="Fechar o menu" />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-hidden px-3 py-6 text-white shadow-2xl" style={{ background: FUNDO_DA_MARCA }}>
            <Barra recolhida={false} fechar={() => setMenuAberto(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 py-3 lg:hidden" style={{ background: FUNDO_DA_MARCA }}>
          <button onClick={() => setMenuAberto(true)} aria-label="Abrir o menu" className="grid size-9 place-items-center rounded-lg text-white hover:bg-white/10">
            <Menu className="size-5" />
          </button>
          <Logo tamanho="sm" />
          {atual && <span className="ml-auto truncate text-xs font-semibold text-blue-100">{atual.rotulo}</span>}
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
