import { useState } from 'react'
import { CalendarDays, ClipboardList, Gift, Home, MessageCircle, type LucideIcon } from 'lucide-react'
import type { MeuCuidado } from '../../api/tipos'
import { LogoMarca } from '../../componentes/Logo'
import { useAcoes } from './acoes'

/** Onde a pessoa pode estar no app. Quatro são abas; as outras três são páginas que se abrem por cima de uma aba. */
export type Destino = 'inicio' | 'plano' | 'consultas' | 'beneficios' | 'mensagens' | 'horarios' | 'exames'
type Aba = 'inicio' | 'plano' | 'consultas' | 'beneficios'

const ABA_DE: Record<Destino, Aba> = {
  inicio: 'inicio',
  mensagens: 'inicio',
  plano: 'plano',
  consultas: 'consultas',
  horarios: 'consultas',
  exames: 'consultas',
  beneficios: 'beneficios',
}

const ABAS: { aba: Aba; rotulo: string; Icone: LucideIcon }[] = [
  { aba: 'inicio', rotulo: 'Início', Icone: Home },
  { aba: 'plano', rotulo: 'Plano', Icone: ClipboardList },
  { aba: 'consultas', rotulo: 'Consultas', Icone: CalendarDays },
  { aba: 'beneficios', rotulo: 'Benefícios', Icone: Gift },
]

/** Barra de navegação fixa na parte de baixo, como nos apps de celular. */
export function BarraDeAbas({ tela, irPara, t }: { tela: Destino; irPara: (d: Destino) => void; t: MeuCuidado }) {
  const atual = ABA_DE[tela]
  const novidade: Record<Aba, boolean> = {
    inicio: false,
    plano: false,
    consultas: t.resultadoNaoVisto,
    beneficios: t.beneficios.catalogo.some((b) => b.podeResgatar),
  }
  return (
    <nav aria-label="Navegação do app" className="grid shrink-0 grid-cols-4 border-t border-slate-200 bg-white pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
      {ABAS.map(({ aba, rotulo, Icone }) => {
        const ativa = atual === aba
        return (
          <button
            key={aba}
            onClick={() => irPara(aba)}
            aria-current={ativa ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition ${ativa ? 'text-tech' : 'text-slate-500'}`}
          >
            <span className={`grid h-7 w-14 place-items-center rounded-full transition ${ativa ? 'bg-blue-50' : ''}`}>
              <Icone className="size-5" aria-hidden />
            </span>
            {rotulo}
            {novidade[aba] && <span className="absolute right-[26%] top-0.5 size-2.5 rounded-full bg-saude ring-2 ring-white" aria-label="novidade" />}
          </button>
        )
      })}
    </nav>
  )
}

/**
 * Cabeçalho das abas, com o contato com uma pessoa da equipe. O toque registra o pedido de contato (a enfermeira vê
 * "pediu ajuda" na fila dela) e, se o WhatsApp da equipe estiver configurado, abre a conversa já com um texto pronto.
 */
export function CabecalhoDaAba({ t, titulo, subtitulo }: { t: MeuCuidado; titulo: string; subtitulo?: string }) {
  const acoes = useAcoes()
  const [avisado, setAvisado] = useState(false)

  async function falarComAEquipe() {
    await acoes.responderCheckin(false)
    setAvisado(true)
    if (t.contatoEquipe) {
      const texto = encodeURIComponent('Oi! Preciso falar com a equipe de saúde do SESI.')
      window.open(`https://wa.me/${t.contatoEquipe}?text=${texto}`, '_blank', 'noopener')
    }
  }

  return (
    <header className="shrink-0 bg-navy px-4 pb-4 pt-4 text-white">
      <div className="flex items-center gap-2.5">
        <LogoMarca className="size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">{titulo}</h1>
          {subtitulo && <p className="truncate text-xs text-blue-100/80">{subtitulo}</p>}
        </div>
        <button
          onClick={falarComAEquipe}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#1fe0b0] to-[#10c795] px-3 py-2 text-xs font-semibold text-[#06204f] shadow-sm active:scale-[0.98]"
        >
          <MessageCircle className="size-4" aria-hidden /> Falar com a equipe
        </button>
      </div>
      {avisado && (
        <p role="status" className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs leading-snug text-blue-50">
          Avisamos a enfermagem do SESI. Ela vai te chamar. Só a equipe de saúde vê o seu pedido, a sua empresa não.
        </p>
      )}
    </header>
  )
}
