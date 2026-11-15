import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'

export interface OpcaoDaEscolha {
  valor: string
  rotulo: string
  detalhe?: string
}

/**
 * Lista de escolha estilizada, no lugar do <select> nativo (cuja lista aberta o navegador não deixa estilizar).
 * Segue o padrão de listbox: setas, Home/End, Enter ou Espaço escolhem, Esc fecha, clique fora fecha.
 */
export function Escolha({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
  Icone,
}: {
  rotulo: string
  valor: string
  opcoes: OpcaoDaEscolha[]
  aoEscolher: (valor: string) => void
  Icone: LucideIcon
}) {
  const id = useId()
  const [aberta, setAberta] = useState(false)
  const [ativa, setAtiva] = useState(0)
  const caixa = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const atual = opcoes.find((o) => o.valor === valor) ?? opcoes[0]

  useEffect(() => {
    if (!aberta) return
    setAtiva(Math.max(0, opcoes.findIndex((o) => o.valor === valor)))
    lista.current?.focus()
    const aoClicarFora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberta(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberta, opcoes, valor])

  function escolher(indice: number) {
    aoEscolher(opcoes[indice].valor)
    setAberta(false)
    botao.current?.focus()
  }

  function teclaNoBotao(e: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      setAberta(true)
    }
  }

  function teclaNaLista(e: KeyboardEvent) {
    const ultimo = opcoes.length - 1
    const mover: Record<string, number> = { ArrowDown: Math.min(ultimo, ativa + 1), ArrowUp: Math.max(0, ativa - 1), Home: 0, End: ultimo }
    if (e.key in mover) {
      e.preventDefault()
      setAtiva(mover[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      escolher(ativa)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setAberta(false)
      botao.current?.focus()
    } else if (e.key === 'Tab') {
      setAberta(false)
    }
  }

  return (
    <div ref={caixa} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberta((a) => !a)}
        onKeyDown={teclaNoBotao}
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-controls={`${id}-lista`}
        aria-label={`${rotulo}: ${atual?.rotulo ?? ''}`}
        className={`group flex items-center gap-3 rounded-full bg-white py-1 pl-1 pr-3 text-left shadow-sm ring-1 transition ${
          aberta ? 'ring-2 ring-tech' : 'ring-slate-200 hover:ring-tech/40'
        }`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-white">
          <Icone className="size-4" />
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] text-slate-400">{rotulo}</span>
          <span className="block text-sm font-semibold text-navy">{atual?.rotulo}</span>
        </span>
        <ChevronDown className={`ml-2 size-4 text-slate-400 transition group-hover:text-navy ${aberta ? 'rotate-180 text-navy' : ''}`} />
      </button>

      {aberta && (
        <ul
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          tabIndex={-1}
          aria-label={rotulo}
          aria-activedescendant={`${id}-opcao-${ativa}`}
          onKeyDown={teclaNaLista}
          className="absolute left-0 z-30 mt-2 min-w-full origin-top overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200 outline-none"
        >
          <li className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400" role="presentation">
            {rotulo}
          </li>
          {opcoes.map((o, i) => {
            const escolhida = o.valor === valor
            return (
              <li
                key={o.valor}
                id={`${id}-opcao-${i}`}
                role="option"
                aria-selected={escolhida}
                onMouseEnter={() => setAtiva(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  i === ativa ? 'bg-slate-100' : ''
                } ${escolhida ? 'font-semibold text-navy' : 'text-slate-700'}`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${escolhida ? 'bg-navy text-white' : 'bg-cinza text-slate-500'}`}>
                  <Icone className="size-4" />
                </span>
                <span className="min-w-0 flex-1 whitespace-nowrap">
                  {o.rotulo}
                  {o.detalhe && <span className="block text-xs font-normal text-slate-500">{o.detalhe}</span>}
                </span>
                {escolhida && <Check className="size-4 shrink-0 text-tech" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
