import { useEffect, useState } from 'react'
import { BarChart3, Building2, CalendarClock, Home, Menu, MessageCircle, MonitorSmartphone, PanelLeftClose, PanelLeftOpen, RotateCcw, Users, X, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { api } from '../../api/cliente'
import { FUNDO_DA_MARCA, OndasDaMarca } from '../../componentes/FundoDaMarca'
import { Logo, LogoMarca } from '../../componentes/Logo'

const PAINEIS: { grupo: string; para: string; rotulo: string; Icone: LucideIcon }[] = [
  { grupo: 'Equipe de saúde', para: '/painel/aps', rotulo: 'Painel da APS', Icone: Users },
  { grupo: 'Equipe de saúde', para: '/painel/whatsapp', rotulo: 'WhatsApp', Icone: MessageCircle },
  { grupo: 'Equipe de saúde', para: '/painel/totens', rotulo: 'Métricas dos totens', Icone: BarChart3 },
  { grupo: 'Empresa', para: '/painel/lideranca', rotulo: 'Liderança do turno', Icone: CalendarClock },
  { grupo: 'Empresa', para: '/painel/rh', rotulo: 'RH e Direção', Icone: Building2 },
]

const reiniciarDemonstracao = () => api.post('/demonstracao/reinicio')

const CHAVE_RECOLHIDA = 'selo:barra-recolhida'

function lerRecolhida(): boolean {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDA) === '1'
  } catch {
    return false
  }
}

/** O conteúdo da barra lateral. Recolhida, mostra só os ícones (com o nome ao passar o mouse). */
function Barra({ recolhida, alternar, fechar }: { recolhida: boolean; alternar?: () => void; fechar?: () => void }) {
  const item = 'flex items-center rounded-full text-sm transition'
  const forma = recolhida ? 'size-11 shrink-0 justify-center' : 'w-full gap-3 px-4 py-2.5'
  return (
    <>
      <OndasDaMarca />
      <div className={`relative flex ${recolhida ? 'flex-col items-center gap-3' : 'items-start justify-between gap-2 px-2'}`}>
        {recolhida ? <LogoMarca className="size-10" /> : <Logo tamanho="md" />}
        {alternar && (
          <button
            onClick={alternar}
            aria-label={recolhida ? 'Abrir a barra lateral' : 'Recolher a barra lateral'}
            title={recolhida ? 'Abrir a barra lateral' : 'Recolher a barra lateral'}
            className={`grid size-11 shrink-0 place-items-center rounded-full text-blue-100/90 hover:bg-white/10 hover:text-white ${recolhida ? 'ring-1 ring-white/20' : ''}`}
          >
            {recolhida ? <PanelLeftOpen className="size-5 shrink-0" /> : <PanelLeftClose className="size-5 shrink-0" />}
          </button>
        )}
        {fechar && (
          <button onClick={fechar} aria-label="Fechar o menu" className="grid size-11 shrink-0 place-items-center rounded-full text-blue-100/80 hover:bg-white/10">
            <X className="size-5 shrink-0" />
          </button>
        )}
      </div>
      {!recolhida && <p className="relative mt-3 px-2 text-xs text-blue-100/70">com a APS do SESI Saúde Acolhe</p>}

      <nav className={`relative mt-6 space-y-1 ${recolhida ? 'flex flex-col items-center' : ''}`}>
        {PAINEIS.map(({ grupo, para, rotulo, Icone }, i) => (
          <div key={para} className={recolhida ? 'flex flex-col items-center' : ''}>
            {(i === 0 || PAINEIS[i - 1].grupo !== grupo) &&
              (recolhida ? (
                i > 0 && <span className="my-2 h-px w-6 bg-white/20" aria-hidden />
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
              <Icone className="size-5 shrink-0" /> {!recolhida && rotulo}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className={`relative mt-auto space-y-1 ${recolhida ? 'flex flex-col items-center' : ''}`}>
        {recolhida && <span className="mb-2 h-px w-6 bg-white/20" aria-hidden />}
        <Link to="/" title={recolhida ? 'Página inicial' : undefined} aria-label="Página inicial" className={`${item} ${forma} text-blue-50/85 hover:bg-white/10`}>
          <Home className="size-5 shrink-0" aria-hidden /> {!recolhida && 'Página inicial'}
        </Link>
        <Link to="/totem" target="_blank" title={recolhida ? 'Abrir um totem' : undefined} aria-label="Abrir um totem" className={`${item} ${forma} text-blue-50/85 hover:bg-white/10`}>
          <MonitorSmartphone className="size-5 shrink-0" aria-hidden /> {!recolhida && 'Abrir um totem'}
        </Link>
        <button onClick={reiniciarDemonstracao} title={recolhida ? 'Reiniciar demonstração' : undefined} aria-label="Reiniciar demonstração" className={`${item} ${forma} text-blue-50/85 hover:bg-white/10`}>
          <RotateCcw className="size-5 shrink-0" /> {!recolhida && 'Reiniciar demonstração'}
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
