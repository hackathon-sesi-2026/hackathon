import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'

export interface OpcaoDoFiltro<V extends string | number = string> {
  valor: V
  rotulo: string
  /** Linha menor abaixo do rótulo (ex.: o que o risco significa). */
  detalhe?: string
  /** Quantidade à direita (ex.: pessoas nesse nível). */
  quantidade?: number
}

/** Botão de filtro da barra: mesma cara para empresa, enfermeira, risco, falta e ordenação. */
export const ESTILO_BOTAO_FILTRO = (ativo: boolean, aberto: boolean) =>
  `flex w-full min-h-11 items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-left text-sm shadow-sm ring-1 transition ${
    aberto ? 'ring-2 ring-tech' : ativo ? 'ring-tech' : 'ring-slate-200 hover:ring-tech/40'
  } ${ativo ? 'font-semibold text-navy' : 'text-slate-600'}`

/**
 * Filtro em lista suspensa, no padrão da barra do painel. Com `multiplo`, cada opção é uma caixa de marcar
 * e o botão mostra quantas estão marcadas; sem, é escolha única. Teclado: setas, Enter/Espaço, Esc, clique fora.
 */
export function Filtro<V extends string | number>({
  rotulo,
  Icone,
  opcoes,
  valor,
  aoMudar,
  multiplo = false,
  textoTodos,
  largura = 'lg:w-52',
  rodape,
  neutro = false,
  alinhar = 'esquerda',
}: {
  rotulo: string
  Icone: LucideIcon
  opcoes: OpcaoDoFiltro<V>[]
  /** Com `multiplo`, a lista marcada; sem, o valor escolhido ('' ou o valor vazio significa "todos"). */
  valor: V[] | V
  aoMudar: (valor: V[] | V) => void
  multiplo?: boolean
  /** O que o botão mostra quando nada está escolhido. */
  textoTodos: string
  largura?: string
  rodape?: ReactNode
  /** Para ordenação: sempre há um valor, então o botão não se pinta como filtro ativo. */
  neutro?: boolean
  /** Lado em que a lista abre; 'direita' para o último filtro da linha, para não vazar da tela. */
  alinhar?: 'esquerda' | 'direita'
}) {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const [ativa, setAtiva] = useState(0)
  const caixa = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLUListElement>(null)

  const marcados: V[] = multiplo ? (valor as V[]) : valor === '' || valor === undefined ? [] : [valor as V]
  const estaMarcada = (v: V) => marcados.includes(v)
  const temFiltro = marcados.length > 0
  const destacado = temFiltro && !neutro
  const primeira = !multiplo && !neutro ? -1 : 0
  const indiceAtivo = Math.max(primeira, Math.min(ativa, opcoes.length - 1))

  useEffect(() => {
    if (aberto) document.getElementById(`${id}-opcao-${indiceAtivo}`)?.scrollIntoView({ block: 'nearest' })
  }, [aberto, id, indiceAtivo])

  useEffect(() => {
    if (!aberto) return
    lista.current?.focus()
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function alternar(v: V) {
    if (multiplo) {
      aoMudar(estaMarcada(v) ? marcados.filter((x) => x !== v) : [...marcados, v])
    } else {
      aoMudar(v)
      setAberto(false)
      botao.current?.focus()
    }
  }
  function limpar() {
    aoMudar(multiplo ? [] : ('' as V))
    if (!multiplo) {
      setAberto(false)
      botao.current?.focus()
    }
  }

  function teclaNoBotao(e: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      setAberto(true)
    }
  }
  function teclaNaLista(e: KeyboardEvent) {
    const ultimo = opcoes.length - 1
    const mover: Record<string, number> = { ArrowDown: Math.min(ultimo, indiceAtivo + 1), ArrowUp: Math.max(primeira, indiceAtivo - 1), Home: primeira, End: ultimo }
    if (e.key in mover) {
      e.preventDefault()
      setAtiva(mover[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (indiceAtivo === -1 && primeira === -1) limpar()
      else if (opcoes[indiceAtivo]) alternar(opcoes[indiceAtivo].valor)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setAberto(false)
      botao.current?.focus()
    }
  }

  const textoDoBotao = !temFiltro
    ? textoTodos
    : multiplo
      ? marcados.length === 1
        ? `${rotulo} ${opcoes.find((o) => o.valor === marcados[0])?.rotulo ?? ''}`
        : rotulo
      : (opcoes.find((o) => o.valor === marcados[0])?.rotulo ?? textoTodos)

  return (
    <div ref={caixa} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setAberto(false) }} className={`relative min-w-0 ${largura}`}>
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((a) => !a)}
        onKeyDown={teclaNoBotao}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-label={`${rotulo}: ${temFiltro ? textoDoBotao : 'sem filtro'}`}
        className={ESTILO_BOTAO_FILTRO(destacado, aberto)}
      >
        <Icone className={`size-4 shrink-0 ${destacado ? 'text-tech' : 'text-slate-500'}`} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{textoDoBotao}</span>
        {multiplo && marcados.length > 1 && (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-tech text-[11px] font-bold text-white">{marcados.length}</span>
        )}
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${aberto ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {aberto && (
        <div className={`absolute top-full z-40 mt-1 w-[min(20rem,85vw)] min-w-full ${alinhar === 'direita' ? 'right-0' : 'left-0'}`+ " overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"}>
          <p className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {rotulo}
            {temFiltro && !neutro && (
              <button type="button" onClick={limpar} className="text-[11px] font-semibold normal-case tracking-normal text-tech hover:underline">
                Limpar
              </button>
            )}
          </p>
          <ul
            ref={lista}
            id={`${id}-lista`}
            role="listbox"
            aria-multiselectable={multiplo}
            aria-label={rotulo}
            aria-activedescendant={opcoes.length || primeira === -1 ? `${id}-opcao-${indiceAtivo}` : undefined}
            tabIndex={-1}
            onKeyDown={teclaNaLista}
            className="max-h-72 overflow-y-auto p-1.5 outline-none"
          >
            {!multiplo && !neutro && (
              <li
                role="option"
                id={`${id}-opcao--1`}
                onMouseEnter={() => setAtiva(-1)}
                aria-selected={!temFiltro}
                onMouseDown={(e) => e.preventDefault()}
                onClick={limpar}
                className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${indiceAtivo === -1 ? 'bg-slate-50' : ''} ${!temFiltro ? 'font-semibold text-navy' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="flex-1">{textoTodos}</span>
                {!temFiltro && <Check className="size-4 text-tech" aria-hidden />}
              </li>
            )}
            {opcoes.map((o, i) => {
              const marcada = estaMarcada(o.valor)
              return (
                <li
                  key={String(o.valor)}
                  id={`${id}-opcao-${i}`}
                  role="option"
                  aria-selected={marcada}
                  onMouseEnter={() => setAtiva(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => alternar(o.valor)}
                  className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${i === indiceAtivo ? 'bg-slate-50' : ''} ${
                    marcada ? 'font-semibold text-navy' : 'text-slate-700'
                  }`}
                >
                  {multiplo ? (
                    <span
                      className={`grid size-4.5 shrink-0 place-items-center rounded-[0.3rem] ring-1 transition ${marcada ? 'bg-tech text-white ring-tech' : 'bg-white ring-slate-300'}`}
                      aria-hidden
                    >
                      {marcada && <Check className="size-3" strokeWidth={3} />}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.rotulo}</span>
                    {o.detalhe && <span className="block truncate text-xs font-normal text-slate-500">{o.detalhe}</span>}
                  </span>
                  {o.quantidade !== undefined && <span className="shrink-0 text-xs tabular-nums text-slate-500">{o.quantidade.toLocaleString('pt-BR')}</span>}
                  {!multiplo && marcada && <Check className="size-4 shrink-0 text-tech" aria-hidden />}
                </li>
              )
            })}
          </ul>
          {rodape && <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{rodape}</div>}
        </div>
      )}
    </div>
  )
}
