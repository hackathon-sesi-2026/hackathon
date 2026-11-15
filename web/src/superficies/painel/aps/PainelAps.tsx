import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Briefcase,
  Cake,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  CalendarClock,
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
import { api } from '../../../api/cliente'
import type { CodigoSituacao, EnvioDaCadencia, LinhaDaFila, NivelRiscoFalta, RiscoFalta, Situacao, TipoRegistro } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { IconeCategoria } from '../../../componentes/IconeCategoria'
import { AvisoDeFalha } from '../../../componentes/TelaCheia'
import { addDias, data, dataCurta, dataSimples, faixaTurno, horaCurta, idade, relativo } from '../../../lib/datas'
import { FREQUENCIA_RISCO, ROTULO_MOTIVO, ROTULO_RISCO, ROTULO_SITUACAO, ROTULO_STATUS_PLANO, iniciais } from '../../../lib/rotulos'
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

type Filtro = 'acao' | 'todos' | CodigoSituacao | 'faltou_remarcar' | 'ajuda' | 'risco_alto'
type Ordem = 'prioridade' | 'risco'

/** Fila da enfermagem: quem saiu do ritmo do cuidado e o que fazer por cada pessoa. Substitui a planilha. */
export function PainelAps() {
  const { dados, erro, falha, enviar, recarregar } = useRecurso<LinhaDaFila[]>('/aps/fila', '/aps/eventos')
  const acoes = useMemo(() => criarAcoes(enviar), [enviar])
  const [filtro, setFiltro] = useState<Filtro>('acao')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [ordem, setOrdem] = useState<Ordem>('prioridade')

  // A situação e o risco de falta já vêm calculados da API. Aqui só se ordena.
  const linhas = useMemo(
    () =>
      [...(dados ?? [])]
        .map((t) => ({ t, s: t.situacao, r: t.riscoFalta }))
        .sort((a, b) =>
          ordem === 'risco'
            ? b.r.pontos - a.r.pontos || a.s.prioridade - b.s.prioridade
            : a.s.prioridade - b.s.prioridade || b.r.pontos - a.r.pontos || a.t.prazoRetorno.localeCompare(b.t.prazoRetorno),
        ),
    [dados, ordem],
  )

  if (!dados) return <p className="p-6 text-sm text-slate-500">{erro ? `Não foi possível carregar a fila: ${erro}` : 'Carregando a fila…'}</p>

  const conta = (c: CodigoSituacao[]) => linhas.filter((l) => c.includes(l.s.codigo)).length

  const visiveis = linhas.filter(({ t, s, r }) => {
    const q = busca.trim().toLowerCase()
    if (q && !t.trabalhador.nome.toLowerCase().includes(q) && !t.trabalhador.matricula.includes(q)) return false
    if (filtro === 'acao') return s.precisaAcao
    if (filtro === 'todos') return true
    if (filtro === 'risco_alto') return r.nivel === 'alto'
    if (filtro === 'ajuda') return s.codigo === 'dificuldade' || s.codigo === 'pediu_ajuda'
    if (filtro === 'faltou_remarcar') return s.codigo === 'faltou' || s.codigo === 'remarcar'
    if (filtro === 'em_dia') return s.codigo === 'em_dia' || s.codigo === 'em_contato'
    return s.codigo === filtro
  })

  const cartoes: { rotulo: string; valor: number; filtro: Filtro; Icone: LucideIcon; cor: string }[] = [
    { rotulo: 'Ver todos', valor: linhas.length, filtro: 'todos', Icone: Users, cor: 'bg-blue-50 text-tech' },
    { rotulo: 'Precisam de ação', valor: linhas.filter((l) => l.s.precisaAcao).length, filtro: 'acao', Icone: AlertTriangle, cor: 'bg-red-50 text-alerta' },
    { rotulo: 'Relataram dificuldade ou pediram contato', valor: conta(['dificuldade', 'pediu_ajuda']), filtro: 'ajuda', Icone: MessageCircleQuestion, cor: 'bg-violet-50 text-violet-600' },
    { rotulo: 'Alto risco de falta', valor: linhas.filter((l) => l.r.nivel === 'alto').length, filtro: 'risco_alto', Icone: Radar, cor: 'bg-rose-50 text-rose-600' },
    { rotulo: 'Faltaram ou remarcar', valor: conta(['faltou', 'remarcar']), filtro: 'faltou_remarcar', Icone: CalendarX, cor: 'bg-orange-50 text-orange-600' },
    { rotulo: 'Fora do prazo do risco', valor: conta(['fora_do_prazo']), filtro: 'fora_do_prazo', Icone: Clock, cor: 'bg-red-50 text-alerta' },
    { rotulo: 'Plano não recebido', valor: conta(['plano_nao_recebido']), filtro: 'plano_nao_recebido', Icone: FileWarning, cor: 'bg-amber-50 text-amber-600' },
  ]

  const linhaAberta = linhas.find((l) => l.t.trabalhador.id === aberto)

  return (
    <ContextoDasAcoes.Provider value={acoes}>
      <div className="relative flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Acompanhamento do cuidado</h2>
        </div>
        <div className="flex items-center gap-2">
          <CadenciaDoDia aoEnviar={recarregar} />
          <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200">Dados fictícios · S+ simulado</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-7">
        {cartoes.map((c) => (
          <button
            key={c.rotulo}
            onClick={() => setFiltro(c.filtro)}
            className={`flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition hover:shadow ${
              filtro === c.filtro ? 'ring-2 ring-tech' : 'ring-1 ring-slate-200/70'
            }`}
          >
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${c.cor}`}>
              <c.Icone className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-bold tabular-nums leading-none text-navy">{c.valor}</span>
              <span className="mt-1 block text-xs leading-tight text-slate-500">{c.rotulo}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex w-72 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
          <Search className="size-4 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou matrícula" className="w-full bg-transparent outline-none" />
        </label>
        <span className="text-xs text-slate-500">
          {visiveis.length} na lista ·{' '}
          {filtro === 'acao'
            ? 'precisam de ação'
            : filtro === 'todos'
              ? 'todos'
              : filtro === 'faltou_remarcar'
                ? 'faltaram ou pediram remarcação'
                : filtro === 'ajuda'
                  ? 'relataram dificuldade ou pediram contato'
                  : filtro === 'risco_alto'
                    ? 'alto risco de falta'
                    : ROTULO_SITUACAO[filtro]}
        </span>
        <div className="ml-auto flex items-center gap-1 rounded-xl bg-white p-1 text-xs font-semibold shadow-sm ring-1 ring-slate-200">
          <span className="px-2 text-slate-400">Ordenar</span>
          {(
            [
              ['prioridade', 'Prioridade'],
              ['risco', 'Risco de falta'],
            ] as const
          ).map(([v, r]) => (
            <button key={v} onClick={() => setOrdem(v)} className={`rounded-lg px-2.5 py-1 ${ordem === v ? 'bg-navy text-white' : 'text-slate-600'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-3 py-3 font-semibold">Médico de referência</th>
              <th className="px-3 py-3 font-semibold">Risco</th>
              <th className="px-3 py-3 font-semibold">Risco de falta</th>
              <th className="px-3 py-3 font-semibold">Retorno previsto</th>
              <th className="px-3 py-3 font-semibold">Plano de cuidado</th>
              <th className="px-3 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Ninguém nesta situação. 👏
                </td>
              </tr>
            )}
            {visiveis.map(({ t, s, r }) => (
                <tr
                  key={t.trabalhador.id}
                  onClick={() => setAberto(t.trabalhador.id)}
                  className={`cursor-pointer border-b border-slate-50 align-middle hover:bg-slate-50 ${
                    t.trabalhador.id === aberto ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{iniciais(t.trabalhador.nome)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{t.trabalhador.nome}</p>
                        <p className="truncate text-xs text-slate-500">
                          Mat. {t.trabalhador.matricula} · {t.trabalhador.empresa}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{t.trabalhador.medicoReferencia}</td>
                  <td className="px-3 py-3">
                    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${COR_RISCO[t.trabalhador.risco]}`} title={ROTULO_RISCO[t.trabalhador.risco]}>
                      Risco {t.trabalhador.risco}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <ChipRiscoFalta r={r} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="text-slate-800">{data(t.prazoRetorno)}</p>
                    <p className="text-xs text-slate-500">{relativo(t.prazoRetorno)}</p>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 text-xs font-medium ${COR_PLANO[t.plano.status]}`}>{ROTULO_STATUS_PLANO[t.plano.status]}</td>
                  <td className="px-3 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${COR_SITUACAO[s.codigo]}`}>{s.rotulo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <BotaoIcone titulo="Enviar lembrete pelo WhatsApp" onClick={() => acoes.enviarLembrete(t.trabalhador.id)} Icone={Send} />
                      <BotaoIcone titulo="Abrir detalhes" onClick={() => setAberto(t.trabalhador.id)} Icone={Eye} />
                    </div>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {linhaAberta && (
        <Gaveta key={linhaAberta.t.trabalhador.id} t={linhaAberta.t} s={linhaAberta.s} r={linhaAberta.r} fechar={() => setAberto(null)} />
      )}
      <AvisoDeFalha mensagem={falha} />
      </div>
    </ContextoDasAcoes.Provider>
  )
}

/**
 * Roda o agendador do WhatsApp uma vez. No produto ele roda sozinho todo dia; aqui a enfermeira aperta
 * para ver a cadência: quem recebe o quê hoje, no máximo uma mensagem por pessoa (docs/whatsapp.md).
 */
function CadenciaDoDia({ aoEnviar }: { aoEnviar: () => Promise<void> }) {
  const [envios, setEnvios] = useState<EnvioDaCadencia[] | null>(null)
  const [rodando, setRodando] = useState(false)
  const [falhou, setFalhou] = useState<string | null>(null)

  async function rodar() {
    setRodando(true)
    setFalhou(null)
    try {
      setEnvios(await api.post<EnvioDaCadencia[]>('/aps/cadencia'))
      await aoEnviar()
    } catch (e) {
      setFalhou(e instanceof Error ? e.message : 'Não foi possível rodar a cadência.')
    } finally {
      setRodando(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={rodar}
        disabled={rodando}
        className="flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-navy-700 disabled:opacity-60"
        title="No produto, o agendador roda sozinho todo dia"
      >
        <CalendarClock className="size-3.5" /> {rodando ? 'Enviando…' : 'Rodar as mensagens de hoje'}
      </button>
      {(envios || falhou) && (
        <div className="absolute left-0 top-full z-30 mt-2 w-80 rounded-2xl bg-white p-3 text-xs shadow-lg ring-1 ring-slate-200">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="font-semibold text-navy">
              {falhou ? 'Não deu certo' : envios!.length === 0 ? 'Nenhuma mensagem para hoje' : `${envios!.length} mensagem(ns) enviada(s) hoje`}
            </p>
            <button onClick={() => (setEnvios(null), setFalhou(null))} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          </div>
          {falhou && <p className="text-alerta">{falhou}</p>}
          {envios && envios.length > 0 && (
            <ul className="max-h-64 space-y-1.5 overflow-auto">
              {envios.map((e) => (
                <li key={e.trabalhadorId} className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">{e.nome}</span>
                  <span className="shrink-0 text-slate-500">{e.rotulo}</span>
                </li>
              ))}
            </ul>
          )}
          {envios && (
            <p className="mt-2 border-t border-slate-100 pt-2 leading-snug text-slate-400">
              No máximo uma por pessoa por dia. Quem está com a enfermagem (dificuldade, pediu contato, faltou) não recebe nada automático.
            </p>
          )}
        </div>
      )}
    </div>
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
