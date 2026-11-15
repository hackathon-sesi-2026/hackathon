import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Factory,
  MessageCircle,
  MessageSquareText,
  Briefcase,
  Cake,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Eye,
  List as ListIcon,
  Loader2,
  FileWarning,
  HeartHandshake,
  HeartPulse,
  Users,
  MessageCircleQuestion,
  MessageCircleWarning,
  Radar,
  Search,
  Send,
  X,
  type LucideIcon,
} from 'lucide-react'
import type {
  CodigoSituacao,
  EmpresaNaCarteira,
  LinhaDaFila,
  NivelRiscoFalta,
  OrdemDaFila,
  PaginaDaFila,
  PessoaNaCarteira,
  PipelineDaFila,
  ResumoDaFila,
  RiscoFalta,
  Situacao,
  TipoRegistro,
} from '../../../api/tipos'
import { Link } from 'react-router'
import { useRecurso } from '../../../api/useRecurso'
import { IconeCategoria } from '../../../componentes/IconeCategoria'
import { AvisoDeFalha } from '../../../componentes/TelaCheia'
import { addDias, data, dataCurta, dataSimples, faixaTurno, horaCurta, idade, relativo } from '../../../lib/datas'
import { FREQUENCIA_RISCO, ROTULO_MOTIVO, ROTULO_RISCO, ROTULO_STATUS_PLANO, iniciais } from '../../../lib/rotulos'
import { ContextoDasAcoes, criarAcoes, useAcoes } from './acoes'

const COR_RISCO_FALTA: Record<NivelRiscoFalta, string> = {
  alto: 'bg-red-50 text-alerta ring-red-200',
  medio: 'bg-amber-50 text-amber-700 ring-amber-200',
  baixo: 'bg-slate-50 text-slate-500 ring-slate-200',
}
const ROTULO_RISCO_FALTA: Record<NivelRiscoFalta, string> = { alto: 'Alto', medio: 'Médio', baixo: 'Baixo' }

const COR_SITUACAO: Record<CodigoSituacao, string> = {
  dificuldade: 'bg-violet-50 text-violet-700 ring-violet-200',
  pediu_ajuda: 'bg-rose-50 text-rose-700 ring-rose-200',
  faltou: 'bg-orange-50 text-orange-700 ring-orange-200',
  remarcar: 'bg-orange-50 text-orange-700 ring-orange-200',
  fora_do_prazo: 'bg-red-50 text-alerta ring-red-200',
  plano_nao_recebido: 'bg-amber-50 text-amber-700 ring-amber-200',
  sem_resposta: 'bg-amber-50 text-amber-700 ring-amber-200',
  vence_logo: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  em_contato: 'bg-blue-50 text-tech ring-blue-200',
  em_dia: 'bg-emerald-50 text-saude-700 ring-emerald-200',
}

const COR_RISCO = ['', 'bg-slate-100 text-slate-600', 'bg-slate-100 text-slate-600', 'bg-amber-50 text-amber-700', 'bg-red-50 text-alerta']

const COR_PLANO = {
  nao_enviado: 'text-alerta',
  enviado: 'text-amber-600',
  recebido: 'text-saude-700',
}

const ROTULO_REGISTRO: Record<TipoRegistro, string> = {
  lembrete: 'Lembrete enviado',
  plano_enviado: 'Plano de cuidado enviado',
  plano_recebido: 'Abriu o plano de cuidado',
  confirmou: 'Confirmou o retorno',
  pediu_remarcar: 'Pediu para remarcar',
  agendou: 'Agendou novo horário',
  passo_feito: 'Marcou passo como feito',
  checkin_ok: 'Check-in: tudo bem',
  checkin_ajuda: 'Check-in: pediu contato',
  monitoramento: 'Monitoramento registrado',
  faltou: 'Faltou ao retorno',
  turno_atualizado: 'Atualizou o turno',
  checkin_habito: 'Check-in do plano',
  checkin_enviado: 'Perguntou como está',
  dificuldade: 'Relatou dificuldade',
  dificuldade_resolvida: 'Dificuldade resolvida',
  teach_back: 'Pergunta de checagem do plano',
  compromisso: 'Combinou como vai (se-então)',
  exame_coletado: 'Fez a coleta dos exames',
  resultado_liberado: 'Resultado de exames liberado',
  resultado_visto: 'Abriu o resultado dos exames',
  lembrete_auto: 'Lembrete automático',
  selo: 'Ganhou selo',
}

type Visao = 'lista' | 'pipeline' | 'empresas'

/** Atalhos dos números do topo: cada um vira um filtro de situação na lista. */
type Atalho = 'todos' | 'acao' | 'ajuda' | 'faltou_remarcar' | 'fora_do_prazo' | 'plano_nao_recebido' | 'sem_resposta' | 'vence_logo' | 'em_dia'

const SITUACOES_DO_ATALHO: Record<Atalho, CodigoSituacao[]> = {
  todos: [],
  acao: [],
  ajuda: ['dificuldade', 'pediu_ajuda'],
  faltou_remarcar: ['faltou', 'remarcar'],
  fora_do_prazo: ['fora_do_prazo'],
  plano_nao_recebido: ['plano_nao_recebido'],
  sem_resposta: ['sem_resposta'],
  vence_logo: ['vence_logo'],
  em_dia: ['em_dia', 'em_contato'],
}

const ROTULO_ATALHO: Record<Atalho, string> = {
  todos: 'Toda a carteira',
  acao: 'Precisam de ação',
  ajuda: 'Pediram ajuda',
  faltou_remarcar: 'Faltaram ou remarcar',
  fora_do_prazo: 'Fora do prazo do risco',
  plano_nao_recebido: 'Plano não recebido',
  sem_resposta: 'Sem resposta',
  vence_logo: 'Prazo vence logo',
  em_dia: 'Em dia ou em contato',
}

/** Colunas do pipeline, da mais urgente para a mais tranquila. Duas situações parecidas dividem a coluna. */
const COLUNAS: { atalho: Atalho; titulo: string; codigos: CodigoSituacao[]; cor: string; dica: string }[] = [
  { atalho: 'ajuda', titulo: 'Pediram ajuda', codigos: ['dificuldade', 'pediu_ajuda'], cor: '#8b5cf6', dica: 'Disseram "não consegui" ou pediram contato' },
  { atalho: 'faltou_remarcar', titulo: 'Faltaram ou remarcar', codigos: ['faltou', 'remarcar'], cor: '#f97316', dica: 'Reagendar o retorno' },
  { atalho: 'fora_do_prazo', titulo: 'Fora do prazo', codigos: ['fora_do_prazo'], cor: '#ef4444', dica: 'Passou do prazo do risco' },
  { atalho: 'plano_nao_recebido', titulo: 'Plano não recebido', codigos: ['plano_nao_recebido'], cor: '#f59e0b', dica: 'Plano sem abrir ou sem enviar' },
  { atalho: 'sem_resposta', titulo: 'Sem resposta', codigos: ['sem_resposta'], cor: '#eab308', dica: 'Lembrete sem resposta há 3+ dias' },
  { atalho: 'vence_logo', titulo: 'Vence logo', codigos: ['vence_logo'], cor: '#84cc16', dica: 'Prazo em até 15 dias, sem retorno marcado' },
  { atalho: 'em_dia', titulo: 'Em contato', codigos: ['em_contato'], cor: '#1c63e6', dica: 'Enfermagem falou nos últimos 7 dias' },
  { atalho: 'em_dia', titulo: 'Em dia', codigos: ['em_dia'], cor: '#19d3a2', dica: 'Retorno marcado ou dentro do prazo' },
]

const ROTULO_ORDEM: Record<OrdemDaFila, string> = {
  prioridade: 'Prioridade',
  risco_falta: 'Risco de falta',
  prazo: 'Prazo do retorno',
  nome: 'Nome',
}

/** Como o último envio aparece na coluna "Último contato". */
const ENVIO_CURTO: Partial<Record<TipoRegistro, string>> = {
  lembrete: 'Lembrete do retorno',
  lembrete_auto: 'Lembrete automático',
  checkin_enviado: '"Como você está?"',
  checkin_habito: 'Pergunta do plano',
  plano_enviado: 'Plano de cuidado',
  resultado_liberado: 'Aviso de resultado',
}

const numero = (n: number) => n.toLocaleString('pt-BR')
const semSufixo = (empresa: string) => empresa.replace(/ (Ltda|S\.A\.)$/, '')

interface Filtros {
  busca: string
  risco: number[]
  riscoFalta: NivelRiscoFalta[]
  empresa: string
  enfermeira: string
}

const SEM_FILTROS: Filtros = { busca: '', risco: [], riscoFalta: [], empresa: '', enfermeira: '' }

function parametros(f: Filtros, ordem: OrdemDaFila, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams({ ordem, ...extra })
  if (f.busca.trim()) p.set('busca', f.busca.trim())
  if (f.risco.length) p.set('risco', f.risco.join(','))
  if (f.riscoFalta.length) p.set('riscoFalta', f.riscoFalta.join(','))
  if (f.empresa) p.set('empresa', f.empresa)
  if (f.enfermeira) p.set('enfermeira', f.enfermeira)
  return p.toString()
}

/** Carteira da enfermagem: quem saiu do ritmo do cuidado e o que fazer por cada pessoa. Substitui a planilha. */
export function PainelAps() {
  // A lista é a visão principal: é onde a enfermeira trabalha a fila do dia.
  const [visao, setVisao] = useState<Visao>('lista')
  const [atalho, setAtalho] = useState<Atalho>('acao')
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS)
  const [buscaDigitada, setBuscaDigitada] = useState('')
  const [ordem, setOrdem] = useState<OrdemDaFila>('prioridade')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(50)
  const [aberta, setAberta] = useState<string | null>(null)

  // A busca vai para a API depois de uma pausa na digitação.
  useEffect(() => {
    const id = setTimeout(() => setFiltros((f) => (f.busca === buscaDigitada ? f : { ...f, busca: buscaDigitada })), 300)
    return () => clearTimeout(id)
  }, [buscaDigitada])
  useEffect(() => setPagina(1), [filtros, atalho, ordem, porPagina])

  const situacoes = SITUACOES_DO_ATALHO[atalho]
  const caminho =
    visao === 'pipeline'
      ? `/aps/pipeline?${parametros(filtros, ordem, { porColuna: '12' })}`
      : `/aps/lista?${parametros(filtros, ordem, {
          pagina: String(pagina),
          porPagina: String(visao === 'empresas' ? 1 : porPagina),
          ...(atalho === 'acao' ? { precisaAcao: 'true' } : {}),
          ...(situacoes.length ? { situacao: situacoes.join(',') } : {}),
        })}`
  const { dados, erro, falha, carregando, enviar } = useRecurso<PipelineDaFila | PaginaDaFila>(caminho, '/aps/eventos')
  const acoes = useMemo(() => criarAcoes(enviar), [enviar])
  const abrir = (p: PessoaNaCarteira) => setAberta(p.trabalhador.id)

  if (!dados) return <p className="p-6 text-sm text-slate-500">{erro ? `Não foi possível carregar a carteira: ${erro}` : 'Carregando a carteira…'}</p>

  const resumo = dados.resumo
  const irParaLista = (a: Atalho) => {
    setAtalho(a)
    setVisao('lista')
  }
  const escolherEmpresa = (empresa: string) => {
    setFiltros((f) => ({ ...f, empresa }))
    setAtalho('acao')
    setVisao('lista')
  }

  return (
    <ContextoDasAcoes.Provider value={acoes}>
      <div className="relative flex h-full min-h-0 flex-col">
        {/* Título, empresa escolhida e troca de visão */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">Acompanhamento do cuidado</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              <span>
                {numero(resumo.total)} pessoas · {numero(resumo.precisamAcao)} precisam de ação
              </span>
              {filtros.empresa && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-2.5 py-0.5 text-xs font-semibold text-white">
                  <Building2 className="size-3.5" /> {semSufixo(filtros.empresa)}
                  <button onClick={() => setFiltros((f) => ({ ...f, empresa: '' }))} aria-label="Ver todas as empresas" className="-mr-1 rounded-full p-0.5 hover:bg-white/20">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {carregando && (
                <span className="inline-flex items-center gap-1 text-tech">
                  <Loader2 className="size-3.5 animate-spin" /> atualizando
                </span>
              )}
            </p>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2">
          <Link
            to="/painel/whatsapp"
            className="flex items-center gap-1.5 rounded-full bg-[#25d366] px-4 py-2 text-sm font-bold text-[#073b24] shadow-[0_0.3rem_1rem_rgba(37,211,102,0.35)] transition hover:brightness-105"
          >
            <MessageCircle className="size-4" /> Testar no meu WhatsApp
          </Link>
          <div className="flex max-w-full overflow-x-auto rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-slate-200" role="tablist" aria-label="Visão da carteira">
            {(
              [
                ['lista', 'Lista', ListIcon],
                ['pipeline', 'Pipeline', Columns3],
                ['empresas', 'Empresas', Building2],
              ] as const
            ).map(([v, rotulo, Icone]) => (
              <button
                key={v}
                role="tab"
                aria-selected={visao === v}
                onClick={() => setVisao(v)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 transition sm:px-4 ${visao === v ? 'bg-navy text-white shadow' : 'text-slate-600 hover:text-navy'}`}
              >
                <Icone className="size-4" /> {rotulo}
              </button>
            ))}
          </div>
          </div>
        </div>

        {visao === 'empresas' ? (
          <Empresas filtros={filtros} escolher={escolherEmpresa} />
        ) : (
          <>
            <NumerosDoTopo resumo={resumo} atalho={visao === 'lista' ? atalho : null} escolher={irParaLista} />
            <BarraDeFiltros
              resumo={resumo}
              filtros={filtros}
              setFiltros={setFiltros}
              buscaDigitada={buscaDigitada}
              setBuscaDigitada={setBuscaDigitada}
              ordem={ordem}
              setOrdem={setOrdem}
            />
            {'colunas' in dados ? (
              <Pipeline dados={dados} abrir={abrir} verTodos={irParaLista} />
            ) : (
              <Lista
                dados={dados}
                atalho={atalho}
                limparAtalho={() => setAtalho('todos')}
                abrir={abrir}
                aberta={aberta}
                setPagina={setPagina}
                porPagina={porPagina}
                setPorPagina={setPorPagina}
              />
            )}
          </>
        )}

        {aberta && <FichaAberta key={aberta} id={aberta} fechar={() => setAberta(null)} />}
        <AvisoDeFalha mensagem={falha} />
      </div>
    </ContextoDasAcoes.Provider>
  )
}

/** A ficha da pessoa aberta: busca a pessoa completa (histórico, plano, exames) só agora, e se atualiza sozinha. */
function FichaAberta({ id, fechar }: { id: string; fechar: () => void }) {
  const { dados: t, erro } = useRecurso<LinhaDaFila>(`/aps/trabalhadores/${id}`, '/aps/eventos')
  if (!t)
    return (
      <div className="fixed inset-0 z-30 grid place-items-center bg-white/80 sm:absolute sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md sm:rounded-3xl sm:bg-white sm:shadow-2xl sm:ring-1 sm:ring-slate-200">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          {erro ? (
            `Não foi possível abrir a ficha: ${erro}`
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" /> Abrindo a ficha…
            </>
          )}
        </p>
      </div>
    )
  return <Gaveta t={t} s={t.situacao} r={t.riscoFalta} fechar={fechar} />
}

/** Os números do topo, clicáveis: cada um abre a lista já filtrada. */
function NumerosDoTopo({ resumo, atalho, escolher }: { resumo: ResumoDaFila; atalho: Atalho | null; escolher: (a: Atalho) => void }) {
  const s = resumo.porSituacao
  const cartoes: { atalho: Atalho; valor: number; Icone: LucideIcon; cor: string }[] = [
    { atalho: 'todos', valor: resumo.total, Icone: Users, cor: 'bg-blue-50 text-tech' },
    { atalho: 'acao', valor: resumo.precisamAcao, Icone: AlertTriangle, cor: 'bg-red-50 text-alerta' },
    { atalho: 'ajuda', valor: s.dificuldade + s.pediu_ajuda, Icone: MessageCircleQuestion, cor: 'bg-violet-50 text-violet-600' },
    { atalho: 'faltou_remarcar', valor: s.faltou + s.remarcar, Icone: CalendarX, cor: 'bg-orange-50 text-orange-600' },
    { atalho: 'fora_do_prazo', valor: s.fora_do_prazo, Icone: Clock, cor: 'bg-red-50 text-alerta' },
    { atalho: 'plano_nao_recebido', valor: s.plano_nao_recebido, Icone: FileWarning, cor: 'bg-amber-50 text-amber-600' },
  ]
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
      {cartoes.map((c) => (
        <button
          key={c.atalho}
          onClick={() => escolher(c.atalho)}
          title={`Ver na lista: ${ROTULO_ATALHO[c.atalho]}`}
          className={`flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
            atalho === c.atalho ? 'ring-2 ring-tech' : 'ring-1 ring-slate-200/70'
          }`}
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${c.cor}`}>
            <c.Icone className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold tabular-nums leading-none text-navy sm:text-2xl">{numero(c.valor)}</span>
            <span className="mt-1 block text-xs leading-tight text-slate-500">{ROTULO_ATALHO[c.atalho]}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${ativo ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  )
}

function BarraDeFiltros({
  resumo,
  filtros,
  setFiltros,
  buscaDigitada,
  setBuscaDigitada,
  ordem,
  setOrdem,
}: {
  resumo: ResumoDaFila
  filtros: Filtros
  setFiltros: (f: (f: Filtros) => Filtros) => void
  buscaDigitada: string
  setBuscaDigitada: (b: string) => void
  ordem: OrdemDaFila
  setOrdem: (o: OrdemDaFila) => void
}) {
  const alternar = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor])
  const algum = filtros.busca || buscaDigitada || filtros.risco.length || filtros.riscoFalta.length || filtros.empresa || filtros.enfermeira
  const caixa = 'rounded-xl bg-white px-2.5 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-tech'

  return (
    <div className="mt-3 grid gap-2 rounded-2xl bg-white/70 p-2 ring-1 ring-slate-200/70 lg:flex lg:flex-wrap lg:items-center">
      <label className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-tech lg:min-w-52 lg:flex-1">
        <Search className="size-4 shrink-0 text-slate-400" />
        <input value={buscaDigitada} onChange={(e) => setBuscaDigitada(e.target.value)} placeholder="Nome, matrícula ou CPF" className="w-full min-w-0 bg-transparent outline-none" />
      </label>
      <div className="grid grid-cols-2 gap-2 lg:flex">
        <SeletorDeEmpresa empresas={resumo.empresas} valor={filtros.empresa} escolher={(empresa) => setFiltros((f) => ({ ...f, empresa }))} />
        <select value={filtros.enfermeira} onChange={(e) => setFiltros((f) => ({ ...f, enfermeira: e.target.value }))} className={`${caixa} min-w-0 lg:max-w-[11rem]`} aria-label="Enfermeira">
          <option value="">Todas as enfermeiras</option>
          {resumo.enfermeiras.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Risco clínico">
        <span className="shrink-0 px-1 text-xs font-semibold text-slate-400">Risco</span>
        {[1, 2, 3, 4].map((r) => (
          <Chip key={r} ativo={filtros.risco.includes(r)} onClick={() => setFiltros((f) => ({ ...f, risco: alternar(f.risco, r) }))}>
            {r}
          </Chip>
        ))}
        <span className="ml-2 shrink-0 px-1 text-xs font-semibold text-slate-400">Falta</span>
        {(['alto', 'medio', 'baixo'] as const).map((n) => (
          <Chip key={n} ativo={filtros.riscoFalta.includes(n)} onClick={() => setFiltros((f) => ({ ...f, riscoFalta: alternar(f.riscoFalta, n) }))}>
            {ROTULO_RISCO_FALTA[n]} <span className="opacity-70">{numero(resumo.porRiscoFalta[n])}</span>
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemDaFila)} className={`${caixa} flex-1 lg:flex-none`} aria-label="Ordenar por">
          {(Object.keys(ROTULO_ORDEM) as OrdemDaFila[]).map((o) => (
            <option key={o} value={o}>
              ↕ {ROTULO_ORDEM[o]}
            </option>
          ))}
        </select>
        {algum ? (
          <button
            onClick={() => {
              setBuscaDigitada('')
              setFiltros(() => SEM_FILTROS)
            }}
            className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 hover:text-navy"
          >
            <X className="size-3.5" /> Limpar
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** 104 empresas: um botão que abre uma caixa com busca e lista curta, rolável. Nada de lista gigante na tela. */
function SeletorDeEmpresa({ empresas, valor, escolher }: { empresas: string[]; valor: string; escolher: (empresa: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const q = busca.trim().toLowerCase()
  const achadas = q ? empresas.filter((e) => e.toLowerCase().includes(q)) : empresas
  const escolherE = (e: string) => {
    escolher(e)
    setAberto(false)
    setBusca('')
  }
  return (
    <div className="relative min-w-0 lg:w-60">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        className={`flex w-full items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-left text-sm shadow-sm ring-1 ${valor ? 'font-semibold text-navy ring-tech' : 'text-slate-500 ring-slate-200'}`}
      >
        <Building2 className="size-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">{valor ? semSufixo(valor) : `Todas as empresas (${empresas.length})`}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>
      {aberto && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" onClick={() => setAberto(false)} aria-label="Fechar" tabIndex={-1} />
          <div className="absolute left-0 top-full z-40 mt-1 w-[min(22rem,85vw)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <label className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-sm">
              <Search className="size-4 text-slate-400" />
              <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa" className="w-full bg-transparent outline-none" />
            </label>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1 text-sm">
              <li>
                <button onClick={() => escolherE('')} className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${!valor ? 'font-semibold text-tech' : 'text-slate-600'}`}>
                  Todas as empresas
                </button>
              </li>
              {achadas.map((e) => (
                <li key={e}>
                  <button onClick={() => escolherE(e)} className={`w-full truncate px-3 py-2 text-left hover:bg-slate-50 ${e === valor ? 'font-semibold text-tech' : 'text-slate-700'}`} title={e}>
                    {semSufixo(e)}
                  </button>
                </li>
              ))}
              {achadas.length === 0 && <li className="px-3 py-3 text-xs text-slate-400">Nenhuma empresa com esse nome.</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

/** As 104 indústrias da carteira, das que mais precisam de ação para as que menos. Tocar abre a lista dela. */
function Empresas({ filtros, escolher }: { filtros: Filtros; escolher: (empresa: string) => void }) {
  const [busca, setBusca] = useState('')
  const { dados, erro } = useRecurso<EmpresaNaCarteira[]>(`/aps/empresas?${parametros(filtros, 'prioridade')}`, '/aps/eventos')
  if (!dados) return <p className="mt-6 text-sm text-slate-500">{erro ? `Não foi possível carregar as empresas: ${erro}` : 'Carregando as empresas…'}</p>
  const q = busca.trim().toLowerCase()
  const visiveis = q ? dados.filter((e) => e.empresa.toLowerCase().includes(q)) : dados
  const maior = Math.max(1, ...dados.map((e) => e.precisamAcao))

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-tech sm:max-w-sm">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa" className="w-full min-w-0 bg-transparent outline-none" />
        </label>
        <p className="text-xs text-slate-500">
          {numero(dados.length)} empresas parceiras · {numero(dados.reduce((s, e) => s + e.total, 0))} pessoas
        </p>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 auto-rows-max gap-2.5 overflow-y-auto pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visiveis.map((e) => {
          const emDia = e.total ? Math.round((e.emDia / e.total) * 100) : 0
          return (
            <button
              key={e.empresa}
              onClick={() => escolher(e.empresa)}
              className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow hover:ring-tech/40"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-tech">
                  <Factory className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy" title={e.empresa}>
                    {semSufixo(e.empresa)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {numero(e.total)} pessoas · {emDia}% em dia
                  </p>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-slate-300" />
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-slate-600">Precisam de ação</span>
                  <span className="font-bold tabular-nums text-alerta">{numero(e.precisamAcao)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-alerta" style={{ width: `${(e.precisamAcao / maior) * 100}%` }} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                {(
                  [
                    ['Ajuda', e.pediramAjuda, 'text-violet-600'],
                    ['Faltaram', e.faltaram, 'text-orange-600'],
                    ['Fora prazo', e.foraDoPrazo, 'text-alerta'],
                    ['Alto risco', e.altoRisco, 'text-rose-600'],
                  ] as const
                ).map(([rotulo, valor, cor]) => (
                  <div key={rotulo} className="rounded-lg bg-slate-50 py-1.5">
                    <p className={`text-sm font-bold tabular-nums ${cor}`}>{numero(valor)}</p>
                    <p className="text-[10px] leading-tight text-slate-500">{rotulo}</p>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
        {visiveis.length === 0 && <p className="text-sm text-slate-500">Nenhuma empresa com esse nome.</p>}
      </div>
    </div>
  )
}

/** Visão em pipeline: uma coluna por situação, da mais urgente à mais tranquila, com as primeiras de cada. */
function Pipeline({ dados, abrir, verTodos }: { dados: PipelineDaFila; abrir: (l: PessoaNaCarteira) => void; verTodos: (a: Atalho) => void }) {
  const porCodigo = Object.fromEntries(dados.colunas.map((c) => [c.situacao, c]))
  return (
    <div className="mt-3 min-h-0 flex-1 snap-x overflow-x-auto pb-2">
      <div className="flex h-full min-h-[24rem] gap-3">
        {COLUNAS.map((c) => {
          const total = c.codigos.reduce((soma, cod) => soma + (porCodigo[cod]?.total ?? 0), 0)
          const linhas = c.codigos
            .flatMap((cod) => porCodigo[cod]?.linhas ?? [])
            .sort((a, b) => a.situacao.prioridade - b.situacao.prioridade || b.riscoFalta.pontos - a.riscoFalta.pontos)
            .slice(0, 12)
          return (
            <section key={c.titulo} className="flex w-[85vw] max-w-72 shrink-0 snap-start flex-col rounded-2xl bg-slate-100/80 ring-1 ring-slate-200/70 sm:w-72" aria-label={c.titulo}>
              <header className="rounded-t-2xl border-t-4 bg-white px-3 pb-2 pt-2.5" style={{ borderColor: c.cor }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{c.titulo}</p>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums text-white" style={{ background: c.cor }}>
                    {numero(total)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{c.dica}</p>
              </header>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                {linhas.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">Ninguém aqui. 👏</p>}
                {linhas.map((l) => (
                  <CartaoDaPessoa key={l.trabalhador.id} l={l} abrir={() => abrir(l)} />
                ))}
              </div>
              {total > linhas.length && (
                <button onClick={() => verTodos(c.atalho)} className="m-2 mt-0 rounded-xl bg-white py-2 text-xs font-semibold text-tech shadow-sm ring-1 ring-slate-200 hover:bg-blue-50">
                  Ver todas as {numero(total)} na lista
                </button>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** Próximo passo: o que a enfermagem faz agora por esta pessoa. É o destaque de cada linha. */
function ProximoPasso({ s, compacto = false }: { s: Situacao; compacto?: boolean }) {
  return (
    <p className={`flex items-start gap-1.5 font-semibold ${s.precisaAcao ? 'text-navy' : 'text-slate-500'} ${compacto ? 'text-xs' : 'text-[13px]'}`}>
      <ArrowRight className={`mt-0.5 shrink-0 ${compacto ? 'size-3' : 'size-3.5'} ${s.precisaAcao ? 'text-tech' : 'text-slate-400'}`} />
      <span className="leading-snug">{s.sugestao}</span>
    </p>
  )
}

/** Último contato: a última mensagem que o SESI mandou, e quando. */
function UltimoContato({ p, compacto = false }: { p: PessoaNaCarteira; compacto?: boolean }) {
  const e = p.ultimoEnvio
  if (!e) return <span className={`text-slate-400 ${compacto ? 'text-[11px]' : 'text-xs'}`}>Nenhuma mensagem enviada</span>
  return (
    <span className={`inline-flex items-start gap-1.5 ${compacto ? 'text-[11px]' : 'text-xs'}`} title={new Date(e.data).toLocaleString('pt-BR')}>
      <MessageSquareText className={`mt-0.5 shrink-0 text-saude-700 ${compacto ? 'size-3' : 'size-3.5'}`} />
      <span>
        <span className="font-semibold text-slate-700">{relativo(e.data)}</span>
        <span className="block text-slate-500">{ENVIO_CURTO[e.tipo] ?? ROTULO_REGISTRO[e.tipo]}</span>
      </span>
    </span>
  )
}

function CartaoDaPessoa({ l, abrir }: { l: PessoaNaCarteira; abrir: () => void }) {
  const t = l.trabalhador
  return (
    <button onClick={abrir} className="block w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow hover:ring-tech/40">
      <div className="flex items-start gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{iniciais(t.nome)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{t.nome}</p>
          <p className="truncate text-[11px] text-slate-500">{semSufixo(t.empresa)}</p>
        </div>
        <ChipRiscoFalta r={l.riscoFalta} />
      </div>
      <p className="mt-2 text-xs leading-snug text-slate-600">{l.situacao.detalhe}</p>
      <div className="mt-2 rounded-lg bg-blue-50/60 px-2 py-1.5">
        <ProximoPasso s={l.situacao} compacto />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <UltimoContato p={l} compacto />
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${COR_RISCO[t.risco]}`}>Risco {t.risco}</span>
      </div>
    </button>
  )
}

/** Visão em lista: a tabela da carteira, paginada no servidor. No celular, vira uma lista de cartões. */
function Lista({
  dados,
  atalho,
  limparAtalho,
  abrir,
  aberta,
  setPagina,
  porPagina,
  setPorPagina,
}: {
  dados: PaginaDaFila
  atalho: Atalho
  limparAtalho: () => void
  abrir: (l: PessoaNaCarteira) => void
  aberta: string | null
  setPagina: (p: number) => void
  porPagina: number
  setPorPagina: (n: number) => void
}) {
  const acoes = useAcoes()
  const paginas = Math.max(1, Math.ceil(dados.total / dados.porPagina))
  const de = dados.total ? (dados.pagina - 1) * dados.porPagina + 1 : 0
  const ate = Math.min(dados.total, dados.pagina * dados.porPagina)

  return (
    <>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-navy/5 px-2.5 py-1 font-semibold text-navy">{ROTULO_ATALHO[atalho]}</span>
        {atalho !== 'todos' && (
          <button onClick={limparAtalho} className="flex items-center gap-1 hover:text-navy">
            <X className="size-3" /> ver toda a carteira
          </button>
        )}
        <span className="ml-auto tabular-nums">
          {numero(de)}–{numero(ate)} de {numero(dados.total)}
        </span>
      </div>

      {/* Celular: cartões */}
      <div className="mt-2 space-y-2 md:hidden">
        {dados.linhas.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Ninguém nesta situação. 👏</p>}
        {dados.linhas.map((p) => (
          <CartaoDaPessoa key={p.trabalhador.id} l={p} abrir={() => abrir(p)} />
        ))}
      </div>

      {/* Computador e tablet: tabela */}
      <div className="mt-2 hidden min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-3 py-3 font-semibold">Situação e próximo passo</th>
              <th className="px-3 py-3 font-semibold">Riscos</th>
              <th className="px-3 py-3 font-semibold">Último contato</th>
              <th className="px-3 py-3 font-semibold">Retorno previsto</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {dados.linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Ninguém nesta situação. 👏
                </td>
              </tr>
            )}
            {dados.linhas.map((p) => {
              const t = p.trabalhador
              return (
                <tr
                  key={t.id}
                  onClick={() => abrir(p)}
                  className={`cursor-pointer border-b border-slate-50 align-top hover:bg-slate-50 ${t.id === aberta ? 'bg-blue-50/60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{iniciais(t.nome)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{t.nome}</p>
                        <p className="max-w-[16rem] truncate text-xs text-slate-500" title={`${t.funcao} · ${t.empresa}`}>
                          {t.funcao} · {semSufixo(t.empresa)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[22rem] px-3 py-3">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${COR_SITUACAO[p.situacao.codigo]}`}>{p.situacao.rotulo}</span>
                    <div className="mt-1.5">
                      <ProximoPasso s={p.situacao} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${COR_RISCO[t.risco]}`} title={ROTULO_RISCO[t.risco]}>
                        Risco {t.risco}
                      </span>
                      <ChipRiscoFalta r={p.riscoFalta} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <UltimoContato p={p} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="text-slate-800">{data(p.prazoRetorno)}</p>
                    <p className="text-xs text-slate-500">{relativo(p.prazoRetorno)}</p>
                    <p className={`mt-0.5 text-[11px] font-medium ${COR_PLANO[p.statusPlano]}`}>Plano {ROTULO_STATUS_PLANO[p.statusPlano].toLowerCase()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <BotaoIcone titulo="Enviar lembrete pelo WhatsApp" onClick={() => acoes.enviarLembrete(t.id)} Icone={Send} />
                      <BotaoIcone titulo="Abrir detalhes" onClick={() => abrir(p)} Icone={Eye} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
        <label className="flex items-center gap-1">
          Por página
          <select value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))} className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
            {[25, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button disabled={dados.pagina <= 1} onClick={() => setPagina(dados.pagina - 1)} className="grid size-8 place-items-center rounded-lg bg-white ring-1 ring-slate-200 disabled:opacity-40" aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </button>
        <span className="tabular-nums">
          Página {numero(dados.pagina)} de {numero(paginas)}
        </span>
        <button disabled={dados.pagina >= paginas} onClick={() => setPagina(dados.pagina + 1)} className="grid size-8 place-items-center rounded-lg bg-white ring-1 ring-slate-200 disabled:opacity-40" aria-label="Próxima página">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </>
  )
}

function ChipRiscoFalta({ r }: { r: RiscoFalta }) {
  return (
    <span
      title={r.motivos.length ? `Por quê: ${r.motivos.join('; ')}` : 'Nenhum fator de risco'}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${COR_RISCO_FALTA[r.nivel]}`}
    >
      <Radar className="size-3" /> {ROTULO_RISCO_FALTA[r.nivel]} · {r.pontos}
    </span>
  )
}

function BotaoIcone({ titulo, onClick, Icone }: { titulo: string; onClick: () => void; Icone: LucideIcon }) {
  return (
    <button onClick={onClick} title={titulo} aria-label={titulo} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy">
      <Icone className="size-4" />
    </button>
  )
}

// ---------------------------------------------------------------- Ficha da pessoa (resumo da Gestão de Retorno)

type Aba = 'resumo' | 'historico' | 'plano'

const DOENCA_CRONICA = {
  nao: { texto: 'Não', detalhe: 'Pelo risco do SESI', cor: 'text-saude-700' },
  compensada: { texto: 'Sim, compensada', detalhe: 'Risco 3 · detalhes no S+', cor: 'text-amber-700' },
  descompensada: { texto: 'Sim, descompensada', detalhe: 'Risco 4 · detalhes no S+', cor: 'text-alerta' },
} as const

const COR_ENGAJAMENTO = {
  alto: { traco: '#10b981', texto: 'text-saude-700', rotulo: 'Alto' },
  medio: { traco: '#f59e0b', texto: 'text-amber-700', rotulo: 'Médio' },
  baixo: { traco: '#ef4444', texto: 'text-alerta', rotulo: 'Baixo' },
} as const

function Gaveta({ t, s, r, fechar }: { t: LinhaDaFila; s: Situacao; r: RiscoFalta; fechar: () => void }) {
  const acoes = useAcoes()
  const [aba, setAba] = useState<Aba>('resumo')
  const [registrando, setRegistrando] = useState(false)
  const pessoa = t.trabalhador
  const dc = DOENCA_CRONICA[t.doencaCronica]

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[440px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
      <header className="flex items-center gap-3 px-5 pb-3 pt-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tech text-base font-bold text-white">{iniciais(pessoa.nome)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight text-navy">{pessoa.nome}</p>
          <p className="truncate text-xs text-slate-500">
            Mat. {pessoa.matricula} · {pessoa.empresa}
          </p>
        </div>
        <button onClick={fechar} className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Fechar">
          <X className="size-5" />
        </button>
      </header>

      <nav className="mx-5 flex gap-1 rounded-full bg-slate-100 p-1 text-sm">
        {(
          [
            ['resumo', 'Resumo'],
            ['historico', 'Histórico'],
            ['plano', 'Plano de cuidado'],
          ] as const
        ).map(([v, rotulo]) => (
          <button
            key={v}
            onClick={() => setAba(v)}
            className={`flex-1 rounded-full py-1.5 font-semibold transition ${aba === v ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy'}`}
          >
            {rotulo}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
        {aba === 'resumo' && !registrando && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Dado Icone={Briefcase} rotulo="Função">
                {pessoa.funcao}
              </Dado>
              <Dado Icone={Cake} rotulo="Idade">
                {idade(pessoa.dataNascimento)} anos
                <span className="block text-xs font-normal text-slate-500">nasceu em {dataSimples(pessoa.dataNascimento)}</span>
              </Dado>
              <Dado Icone={HeartPulse} rotulo="Doença crônica">
                <span className={dc.cor}>{dc.texto}</span>
                <span className="block text-xs font-normal text-slate-500">{dc.detalhe}</span>
              </Dado>
              <Dado Icone={Clock} rotulo="Turno">
                {pessoa.turno.nome}
                <span className="block text-xs font-normal text-slate-500">{faixaTurno(pessoa.turno.inicio, pessoa.turno.fim)}</span>
              </Dado>
            </div>

            <CartaoEngajamento e={t.engajamento} />

            {/* Quem relatou dificuldade não ganha bloco aqui: o "não consegui" e o "Resolvida" ficam em "Mais detalhes". */}
            {s.codigo !== 'dificuldade' && (
              <div className={`rounded-2xl p-4 ring-1 ${COR_SITUACAO[s.codigo]}`}>
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  {s.precisaAcao ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />} {s.rotulo}
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  <b>O que fazer:</b> {s.sugestao}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button onClick={() => setRegistrando(true)} className="w-full rounded-full bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-700">
                Registrar monitoramento
              </button>
              <div className="grid grid-cols-2 gap-2">
                <BotaoPilula onClick={() => acoes.enviarLembrete(pessoa.id)} Icone={Send}>
                  Lembrete
                </BotaoPilula>
                <BotaoPilula onClick={() => acoes.enviarPlano(pessoa.id)} Icone={FileWarning}>
                  {t.plano.status === 'nao_enviado' ? 'Plano' : 'Reenviar'}
                </BotaoPilula>
                <BotaoPilula onClick={() => acoes.enviarCheckinHabito(pessoa.id)} Icone={MessageCircleWarning}>
                  Check-in
                </BotaoPilula>
                <BotaoPilula onClick={() => acoes.enviarCheckin(pessoa.id)} Icone={HeartHandshake}>
                  Como está?
                </BotaoPilula>
              </div>
            </div>

            <details className="group rounded-2xl bg-cinza">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
                Mais detalhes
                <ChevronDown className="size-4 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-4 px-4 pb-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risco de falta</p>
                    <ChipRiscoFalta r={r} />
                  </div>
                  {r.motivos.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                      {r.motivos.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Nenhum fator de risco agora.</p>
                  )}
                </div>
                <Dificuldades t={t} />
                <LembretesAuto t={t} />
                <ExamesStatus t={t} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  <Campo rotulo="Médico de referência">{pessoa.medicoReferencia}</Campo>
                  <Campo rotulo="Classificação de risco">{ROTULO_RISCO[pessoa.risco]}</Campo>
                  <Campo rotulo="Última consulta médica">{data(pessoa.ultimaConsultaMedica)}</Campo>
                  <Campo rotulo="Retorno previsto">{data(t.prazoRetorno)}</Campo>
                  <Campo rotulo="Retorno marcado">
                    {t.consulta ? `${dataCurta(t.consulta.data)} ${horaCurta(t.consulta.data)}` : '—'}
                  </Campo>
                  <Campo rotulo="Próximo monitoramento">{data(t.proximoMonitoramento)}</Campo>
                  <Campo rotulo="Frequência de verificação">{FREQUENCIA_RISCO[pessoa.risco]}</Campo>
                  <Campo rotulo="Status do plano">{ROTULO_STATUS_PLANO[t.plano.status]}</Campo>
                </dl>
              </div>
            </details>
          </div>
        )}

        {aba === 'resumo' && registrando && <FormMonitoramento t={t} fechar={() => setRegistrando(false)} />}

        {aba === 'historico' && (
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {t.historico.length === 0 && <li className="text-sm text-slate-400">Sem eventos registrados.</li>}
            {[...t.historico].reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-tech ring-4 ring-white" />
                <p className="text-sm font-medium text-slate-800">{ROTULO_REGISTRO[e.tipo]}</p>
                <p className="text-xs text-slate-500">
                  {data(e.data)} {horaCurta(e.data)}
                  {e.nota && <> · {e.nota}</>}
                </p>
              </li>
            ))}
          </ol>
        )}

        {aba === 'plano' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {ROTULO_STATUS_PLANO[t.plano.status]}
              {t.plano.dataEnvio && ` · enviado em ${data(t.plano.dataEnvio)}`}. Passos marcados pelo próprio trabalhador (autorrelato).
            </p>
            <ul className="space-y-2">
              {t.plano.passos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <IconeCategoria categoria={p.categoria} tamanho="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${p.feito ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.titulo}</p>
                    <p className="text-xs text-slate-500">Até {data(p.prazo)}</p>
                  </div>
                  {p.feito ? <CheckCircle2 className="size-5 text-saude" /> : <span className="size-5 rounded-full border-2 border-slate-200" />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}

function Dado({ Icone, rotulo, children }: { Icone: LucideIcon; rotulo: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-cinza p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icone className="size-3.5" /> {rotulo}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-navy">{children}</p>
    </div>
  )
}

/** Engajamento geral em anel, com as quatro partes que formam a nota. */
function CartaoEngajamento({ e }: { e: LinhaDaFila['engajamento'] }) {
  const cor = COR_ENGAJAMENTO[e.nivel]
  const raio = 34
  const volta = 2 * Math.PI * raio
  return (
    <section className="rounded-2xl p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 80 80" className="size-24 -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r={raio} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle cx="40" cy="40" r={raio} fill="none" stroke={cor.traco} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(e.pontos / 100) * volta} ${volta}`} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center">
            <span>
              <span className="block text-2xl font-bold leading-none text-navy">{e.pontos}</span>
              <span className="text-[10px] text-slate-500">de 100</span>
            </span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Engajamento no programa</p>
          <p className={`text-xl font-bold ${cor.texto}`}>{cor.rotulo}</p>
          <p className="text-xs leading-snug text-slate-500">Participação no programa. Não é adesão ao tratamento, que a equipe verifica na consulta.</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {e.itens.map((i) => (
          <li key={i.rotulo} className="text-xs">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-700">{i.rotulo}</span>
              <span className="shrink-0 text-slate-500">{i.comoEsta}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${(i.pontos / i.maximo) * 100}%`, background: cor.traco }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BotaoPilula({ onClick, Icone, children }: { onClick: () => void; Icone: LucideIcon; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
      <Icone className="size-3.5" /> {children}
    </button>
  )
}

/** Andamento dos exames (sem valores: o laudo fica no S+). Na demo, a enfermeira simula a liberação do laboratório. */
function ExamesStatus({ t }: { t: LinhaDaFila }) {
  const acoes = useAcoes()
  if (t.exames.length === 0) return null
  const rotulo = { pedido: 'Pedido, falta coletar', coletado: 'Coletado, aguardando resultado', resultado: 'Resultado disponível' } as const
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exames</p>
      <ul className="mt-2 space-y-1.5">
        {t.exames.map((ex) => (
          <li key={ex.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0">
              <span className="font-semibold text-navy">{ex.titulo}</span>
              <span className="block text-slate-500">
                {rotulo[ex.status]}
                {ex.status === 'resultado' && (ex.resultadoVisto ? ' · aberto pelo trabalhador' : ' · ainda não aberto')}
              </span>
            </span>
            {ex.status !== 'resultado' && (
              <button onClick={() => acoes.liberarResultado(t.trabalhador.id, ex.id)} className="shrink-0 font-semibold text-tech underline" title="No produto, o resultado vem do laboratório/S+">
                simular resultado
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Lembretes automáticos D-3 e D-1 (gatilho com mais respaldo) e o plano se-então que a pessoa combinou. */
function LembretesAuto({ t }: { t: LinhaDaFila }) {
  const acoes = useAcoes()
  const c = t.consulta
  if (!c || c.status === 'faltou') return null
  const enviados = c.lembretesAutomaticos
  const quando = (dias: number) => dataCurta(new Date(new Date(c.data).getTime() - dias * 86_400_000).toISOString())
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lembretes automáticos</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['D-3', 'D-1'] as const).map((q) => (
          <div key={q} className="flex items-center gap-2 rounded-lg bg-cinza px-2.5 py-1.5 text-xs">
            <span className="font-semibold text-navy">{q}</span>
            <span className="text-slate-500">{quando(q === 'D-3' ? 3 : 1)}</span>
            {enviados.includes(q) ? (
              <span className="font-semibold text-saude-700">enviado</span>
            ) : (
              <button onClick={() => acoes.dispararLembreteAutomatico(t.trabalhador.id, q)} className="font-semibold text-tech underline" title="No produto, o envio é automático">
                simular envio
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {c.compromisso ? `Combinou: ${c.compromisso} (o lembrete D-1 retoma isso).` : 'Ainda não combinou como vai (opcional).'}
      </p>
    </div>
  )
}

/** "Não consegui" do trabalhador: o motivo e a ação na causa. */
function Dificuldades({ t }: { t: LinhaDaFila }) {
  const acoes = useAcoes()
  const [notas, setNotas] = useState<Record<string, string>>({})
  if (t.plano.dificuldades.length === 0) return null
  const ordenadas = [...t.plano.dificuldades].sort((a, b) => Number(a.resolvida) - Number(b.resolvida) || b.data.localeCompare(a.data))
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">"Não consegui" relatado pelo trabalhador</p>
      <ul className="space-y-2">
        {ordenadas.map((d) => {
          const passo = t.plano.passos.find((p) => p.id === d.passoId)
          return (
            <li key={d.id} className={`rounded-xl p-3 text-xs ring-1 ${d.resolvida ? 'bg-slate-50 text-slate-500 ring-slate-100' : 'bg-white ring-slate-200'}`}>
              <p className="font-semibold text-slate-800">
                {ROTULO_MOTIVO[d.motivo]}
              </p>
              <p className="mt-0.5">
                {passo ? `Passo: ${passo.titulo}` : 'Plano de cuidado'} · {d.origem === 'teach_back' ? 'errou a pergunta de checagem' : d.origem === 'checkin' ? 'no check-in' : 'na página do plano'} ·{' '}
                {relativo(d.data)}
              </p>
              {d.resolvida ? (
                <p className="mt-1 font-medium text-saude-700">✓ Resolvida{d.nota ? `: ${d.nota}` : ''}</p>
              ) : (
                <>
                  <p className="mt-1.5 font-medium text-slate-700">Ação sugerida: {d.acaoSugerida}</p>
                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={notas[d.id] ?? ''}
                      onChange={(e) => setNotas({ ...notas, [d.id]: e.target.value })}
                      placeholder="O que foi feito (sem dado clínico)"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    />
                    <button onClick={() => acoes.resolverDificuldade(t.trabalhador.id, d.id, (notas[d.id] ?? '').trim())} className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white">
                      Resolvida
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-slate-400">{rotulo}</dt>
      <dd className="font-medium text-slate-800">{children}</dd>
    </div>
  )
}

/** Mesmos campos do "Desfecho do monitoramento" da ficha Gestão de Retorno. */
function FormMonitoramento({ t, fechar }: { t: LinhaDaFila; fechar: () => void }) {
  const acoes = useAcoes()
  const sugestaoProximo = addDias(new Date(), t.trabalhador.risco >= 3 ? 30 : 60).toISOString().slice(0, 10)
  const [f, setF] = useState({
    feitoContato: true,
    agendamentoRealizado: false,
    mensagemEnviada: false,
    aguardandoRetorno: false,
    observacao: '',
    proximo: sugestaoProximo,
  })
  const marca = (k: 'feitoContato' | 'agendamentoRealizado' | 'mensagemEnviada' | 'aguardandoRetorno', rotulo: string) => (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
      <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="size-4 accent-[#2563eb]" />
      {rotulo}
    </label>
  )

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        await acoes.registrarMonitoramento(t.trabalhador.id, {
          feitoContato: f.feitoContato,
          agendamentoRealizado: f.agendamentoRealizado,
          mensagemEnviada: f.mensagemEnviada,
          aguardandoRetorno: f.aguardandoRetorno,
          observacao: f.observacao.trim(),
          proximoMonitoramento: new Date(`${f.proximo}T09:00:00`).toISOString(),
        })
        fechar()
      }}
    >
      <p className="text-sm font-bold text-navy">Desfecho do monitoramento</p>
      <div className="grid gap-2">
        {marca('feitoContato', 'Feito contato')}
        {marca('agendamentoRealizado', 'Agendamento realizado')}
        {marca('mensagemEnviada', 'Mensagem enviada')}
        {marca('aguardandoRetorno', 'Aguardando retorno')}
      </div>
      <label className="block text-xs text-slate-500">
        Observações do contato
        <textarea
          value={f.observacao}
          onChange={(e) => setF({ ...f, observacao: e.target.value })}
          rows={3}
          placeholder="Ex.: aguardo resposta no WhatsApp. Não registre dados clínicos aqui."
          className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-800"
        />
      </label>
      <label className="block text-xs text-slate-500">
        Data prevista para o próximo monitoramento
        <input type="date" value={f.proximo} onChange={(e) => setF({ ...f, proximo: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-800" />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white">
          Registrar contato
        </button>
        <button type="button" onClick={fechar} className="rounded-xl px-4 text-sm text-slate-600 hover:bg-slate-100">
          Cancelar
        </button>
      </div>
    </form>
  )
}
