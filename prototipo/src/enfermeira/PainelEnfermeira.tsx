import { Fragment, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  Clock,
  Eye,
  FileWarning,
  MessageCircleQuestion,
  MessageCircleWarning,
  Radar,
  Search,
  Send,
  Smartphone,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { MotivoDificuldade, TipoEvento, Trabalhador } from '../data/types'
import { useDados } from '../data/store'
import {
  ACAO_POR_MOTIVO,
  FREQUENCIA_RISCO,
  MOTIVOS,
  ROTULO_MOTIVO,
  ROTULO_RISCO,
  ROTULO_SITUACAO,
  ROTULO_STATUS_PLANO,
  iniciais,
  prazoRetorno,
  riscoFalta,
  situacao,
  type CodigoSituacao,
  type NivelRiscoFalta,
  type RiscoFalta,
  type Situacao,
} from '../domain/regras'
import { addDias, data, dataCurta, faixaTurno, horaCurta, relativo } from '../lib/datas'
import { IconeCategoria } from '../components/categorias'

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

const ROTULO_EVENTO: Record<TipoEvento, string> = {
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
  dificuldade: 'Relatou dificuldade',
  dificuldade_resolvida: 'Dificuldade resolvida',
  teach_back: 'Pergunta de checagem do plano',
  compromisso: 'Combinou como vai (se-então)',
  lembrete_auto: 'Lembrete automático',
  selo: 'Ganhou selo',
}

type Filtro = 'acao' | 'todos' | CodigoSituacao | 'faltou_remarcar' | 'ajuda' | 'risco_alto'
type Ordem = 'prioridade' | 'risco'

export function PainelEnfermeira({
  selecionado,
  onVerTrabalhador,
  compacto = false,
}: {
  selecionado: string
  onVerTrabalhador: (id: string) => void
  /** Modo lado a lado: esconde colunas secundárias (continuam na gaveta de detalhe). */
  compacto?: boolean
}) {
  const { adapter, trabalhadores } = useDados()
  const [filtro, setFiltro] = useState<Filtro>('acao')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [ordem, setOrdem] = useState<Ordem>('prioridade')

  const linhas = useMemo(
    () =>
      trabalhadores
        .map((t) => ({ t, s: situacao(t), r: riscoFalta(t) }))
        .sort((a, b) =>
          ordem === 'risco'
            ? b.r.pontos - a.r.pontos || a.s.prioridade - b.s.prioridade
            : a.s.prioridade - b.s.prioridade || b.r.pontos - a.r.pontos || prazoRetorno(a.t).getTime() - prazoRetorno(b.t).getTime(),
        ),
    [trabalhadores, ordem],
  )

  const conta = (c: CodigoSituacao[]) => linhas.filter((l) => c.includes(l.s.codigo)).length

  const visiveis = linhas.filter(({ t, s, r }) => {
    const q = busca.trim().toLowerCase()
    if (q && !t.nome.toLowerCase().includes(q) && !t.matricula.includes(q)) return false
    if (filtro === 'acao') return s.precisaAcao
    if (filtro === 'todos') return true
    if (filtro === 'risco_alto') return r.nivel === 'alto'
    if (filtro === 'ajuda') return s.codigo === 'dificuldade' || s.codigo === 'pediu_ajuda'
    if (filtro === 'faltou_remarcar') return s.codigo === 'faltou' || s.codigo === 'remarcar'
    if (filtro === 'em_dia') return s.codigo === 'em_dia' || s.codigo === 'em_contato'
    return s.codigo === filtro
  })

  const cartoes: { rotulo: string; valor: number; filtro: Filtro; Icone: LucideIcon; cor: string }[] = [
    { rotulo: 'Precisam de ação', valor: linhas.filter((l) => l.s.precisaAcao).length, filtro: 'acao', Icone: AlertTriangle, cor: 'bg-red-50 text-alerta' },
    { rotulo: 'Relataram dificuldade ou pediram contato', valor: conta(['dificuldade', 'pediu_ajuda']), filtro: 'ajuda', Icone: MessageCircleQuestion, cor: 'bg-violet-50 text-violet-600' },
    { rotulo: 'Alto risco de falta', valor: linhas.filter((l) => l.r.nivel === 'alto').length, filtro: 'risco_alto', Icone: Radar, cor: 'bg-rose-50 text-rose-600' },
    { rotulo: 'Faltaram ou remarcar', valor: conta(['faltou', 'remarcar']), filtro: 'faltou_remarcar', Icone: CalendarX, cor: 'bg-orange-50 text-orange-600' },
    { rotulo: 'Fora do prazo do risco', valor: conta(['fora_do_prazo']), filtro: 'fora_do_prazo', Icone: Clock, cor: 'bg-red-50 text-alerta' },
    { rotulo: 'Plano não recebido', valor: conta(['plano_nao_recebido']), filtro: 'plano_nao_recebido', Icone: FileWarning, cor: 'bg-amber-50 text-amber-600' },
  ]

  // Motivos relatados por todos (agregado, sem nome): mostra POR QUE as pessoas saem do cuidado.
  const motivos = MOTIVOS.map((m) => ({ ...m, n: trabalhadores.reduce((s, t) => s + t.dificuldades.filter((d) => d.motivo === m.motivo).length, 0) }))
    .filter((m) => m.n > 0)
    .sort((a, b) => b.n - a.n)
  const maxMotivo = Math.max(1, ...motivos.map((m) => m.n))

  const linhaAberta = linhas.find((l) => l.t.id === aberto)

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy">Acompanhamento do cuidado</h2>
          <p className="text-sm text-slate-500">Quem saiu do ritmo do cuidado, pelo prazo do risco. Substitui a planilha de contatos mês a mês; o prontuário continua no S+.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200">Fonte: {adapter.nome}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
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

      {motivos.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
          <p className="text-xs font-semibold text-navy">
            Por que estão saindo do cuidado <span className="font-normal text-slate-400">(motivos relatados no "não consegui", sem nomes)</span>
          </p>
          {motivos.map((m) => (
            <span key={m.motivo} className="flex items-center gap-2 text-xs text-slate-600">
              <span>{m.emoji}</span>
              <span className="hidden sm:inline">{m.rotulo}</span>
              <span className="h-1.5 rounded-full bg-violet-400" style={{ width: `${(m.n / maxMotivo) * 48}px` }} />
              <span className="font-semibold tabular-nums text-navy">{m.n}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="flex w-72 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
          <Search className="size-4 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou matrícula" className="w-full bg-transparent outline-none" />
        </label>
        <button
          onClick={() => setFiltro('todos')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filtro === 'todos' ? 'bg-navy text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
        >
          Ver todos ({linhas.length})
        </button>
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
        <table className={`w-full text-left text-sm ${compacto ? 'min-w-[700px]' : 'min-w-[900px]'}`}>
          <thead className="sticky top-0 z-10 bg-white text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">Paciente</th>
              {!compacto && <th className="px-3 py-3 font-semibold">Médico de referência</th>}
              <th className="px-3 py-3 font-semibold">Risco</th>
              <th className="px-3 py-3 font-semibold">Risco de falta</th>
              {!compacto && <th className="px-3 py-3 font-semibold">Retorno previsto</th>}
              <th className="px-3 py-3 font-semibold">Plano de cuidado</th>
              <th className="px-3 py-3 font-semibold">Situação</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={compacto ? 6 : 8} className="px-4 py-12 text-center text-slate-500">
                  Ninguém nesta situação. 👏
                </td>
              </tr>
            )}
            {visiveis.map(({ t, s, r }) => (
              <Fragment key={t.id}>
                <tr
                  onClick={() => setAberto(t.id)}
                  className={`cursor-pointer border-b border-slate-50 align-middle hover:bg-slate-50 ${
                    t.id === aberto ? 'bg-blue-50/60' : t.id === selecionado ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{iniciais(t.nome)}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{t.nome}</p>
                        <p className="truncate text-xs text-slate-500">
                          Mat. {t.matricula} · {t.empresa}
                        </p>
                      </div>
                    </div>
                  </td>
                  {!compacto && <td className="px-3 py-3 text-slate-600">{t.medicoReferencia}</td>}
                  <td className="px-3 py-3">
                    <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${COR_RISCO[t.risco]}`} title={ROTULO_RISCO[t.risco]}>
                      Risco {t.risco}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <ChipRiscoFalta r={r} />
                  </td>
                  {!compacto && (
                    <td className="whitespace-nowrap px-3 py-3">
                      <p className="text-slate-800">{data(prazoRetorno(t).toISOString())}</p>
                      <p className="text-xs text-slate-500">{relativo(prazoRetorno(t).toISOString())}</p>
                    </td>
                  )}
                  <td className={`whitespace-nowrap px-3 py-3 text-xs font-medium ${COR_PLANO[t.statusPlano]}`}>{ROTULO_STATUS_PLANO[t.statusPlano]}</td>
                  <td className="px-3 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${COR_SITUACAO[s.codigo]}`}>{s.rotulo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <BotaoIcone titulo="Enviar lembrete pelo WhatsApp" onClick={() => adapter.enviarLembrete(t.id)} Icone={Send} />
                      <BotaoIcone titulo="Ver o celular deste trabalhador na simulação" onClick={() => onVerTrabalhador(t.id)} Icone={Smartphone} />
                      <BotaoIcone titulo="Abrir detalhes" onClick={() => setAberto(t.id)} Icone={Eye} />
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {linhaAberta && (
        <Gaveta key={linhaAberta.t.id} t={linhaAberta.t} s={linhaAberta.s} r={linhaAberta.r} fechar={() => setAberto(null)} onVerTrabalhador={onVerTrabalhador} />
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

// ---------------------------------------------------------------- Gaveta de detalhe (ficha Gestão de Retorno)

type Aba = 'resumo' | 'historico' | 'plano'

function Gaveta({
  t,
  s,
  r,
  fechar,
  onVerTrabalhador,
}: {
  t: Trabalhador
  s: Situacao
  r: RiscoFalta
  fechar: () => void
  onVerTrabalhador: (id: string) => void
}) {
  const { adapter } = useDados()
  const [aba, setAba] = useState<Aba>('resumo')
  const [registrando, setRegistrando] = useState(false)

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-tech text-sm font-bold text-white">{iniciais(t.nome)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-navy">{t.nome}</p>
          <p className="text-xs text-slate-500">
            Mat. {t.matricula} · {t.funcao}
          </p>
        </div>
        <button onClick={fechar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
          <X className="size-5" />
        </button>
      </header>

      <nav className="flex gap-5 border-b border-slate-100 px-4 text-sm">
        {(
          [
            ['resumo', 'Resumo'],
            ['historico', 'Histórico'],
            ['plano', 'Plano de Cuidado'],
          ] as const
        ).map(([v, r]) => (
          <button key={v} onClick={() => setAba(v)} className={`-mb-px border-b-2 py-2.5 font-medium ${aba === v ? 'border-tech text-tech' : 'border-transparent text-slate-500'}`}>
            {r}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        {aba === 'resumo' && !registrando && (
          <div className="space-y-4">
            <div className={`rounded-xl p-3 ring-1 ${COR_SITUACAO[s.codigo]}`}>
              <p className="flex items-center gap-1.5 text-sm font-bold">
                {s.precisaAcao ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />} {s.rotulo}
              </p>
              <p className="mt-0.5 text-xs opacity-90">{s.detalhe}</p>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Próxima ação sugerida</p>
              <p className="text-sm font-medium text-slate-800">{s.sugestao}</p>
            </div>

            <Dificuldades t={t} />

            <LembretesAuto t={t} />

            <div className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Radar de risco de falta</p>
                <ChipRiscoFalta r={r} />
              </div>
              {r.motivos.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                  {r.motivos.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Nenhum fator de risco agora.</p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">Regras simples e explicáveis, a calibrar com o histórico do S+ no piloto.</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-xl bg-cinza p-3 text-xs">
              <Campo rotulo="Médico de referência">{t.medicoReferencia}</Campo>
              <Campo rotulo="Classificação de risco">{ROTULO_RISCO[t.risco]}</Campo>
              <Campo rotulo="Verificação de adesão">{FREQUENCIA_RISCO[t.risco]}</Campo>
              <Campo rotulo="Última consulta médica">{data(t.ultimaConsultaMedica)}</Campo>
              <Campo rotulo="Retorno previsto">{data(prazoRetorno(t).toISOString())}</Campo>
              <Campo rotulo="Retorno marcado">
                {t.consulta ? `${dataCurta(t.consulta.data)} ${horaCurta(t.consulta.data)} · ${t.consulta.modalidade === 'online' ? 'vídeo' : t.consulta.modalidade === 'no_turno' ? 'no turno' : 'presencial'}` : '—'}
              </Campo>
              <Campo rotulo="Status do plano">{ROTULO_STATUS_PLANO[t.statusPlano]}</Campo>
              <Campo rotulo="Próximo monitoramento">{data(t.proximoMonitoramento)}</Campo>
              <Campo rotulo="Turno informado">
                {t.turno.nome} ({faixaTurno(t.turno.inicio, t.turno.fim)})
              </Campo>
              <Campo rotulo="Empresa">{t.empresa}</Campo>
            </dl>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => adapter.enviarLembrete(t.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
                <Send className="size-3.5" /> Enviar lembrete
              </button>
              <button onClick={() => adapter.enviarPlano(t.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
                <FileWarning className="size-3.5" /> {t.statusPlano === 'nao_enviado' ? 'Enviar plano' : 'Reenviar plano'}
              </button>
              <button onClick={() => adapter.enviarCheckinHabito(t.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
                <MessageCircleWarning className="size-3.5" /> Check-in do plano
              </button>
              <button onClick={() => onVerTrabalhador(t.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-navy hover:bg-slate-50">
                <Smartphone className="size-3.5" /> Ver celular
              </button>
              <button onClick={() => setRegistrando(true)} className="col-span-2 rounded-xl bg-navy py-2 text-xs font-semibold text-white hover:bg-navy-700">
                Registrar monitoramento
              </button>
            </div>
            <p className="text-[11px] leading-snug text-slate-400">Abrir o plano e responder mensagens é uso do canal, não adesão ao plano. Adesão é verificada pela equipe na consulta.</p>
          </div>
        )}

        {aba === 'resumo' && registrando && <FormMonitoramento t={t} fechar={() => setRegistrando(false)} />}

        {aba === 'historico' && (
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {t.eventos.length === 0 && <li className="text-sm text-slate-400">Sem eventos registrados.</li>}
            {[...t.eventos].reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-tech ring-4 ring-white" />
                <p className="text-sm font-medium text-slate-800">{ROTULO_EVENTO[e.tipo]}</p>
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
              {ROTULO_STATUS_PLANO[t.statusPlano]}
              {t.dataEnvioPlano && ` · enviado em ${data(t.dataEnvioPlano)}`}. Passos marcados pelo próprio trabalhador (autorrelato).
            </p>
            <ul className="space-y-2">
              {t.plano.map((p) => (
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

/** Lembretes automáticos D-3 e D-1 (gatilho com mais respaldo) e o plano se-então que a pessoa combinou. */
function LembretesAuto({ t }: { t: Trabalhador }) {
  const { adapter } = useDados()
  const c = t.consulta
  if (!c || c.status === 'faltou') return null
  const enviados = c.lembretesAutoEnviados ?? []
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
              <button onClick={() => adapter.simularLembreteAuto(t.id, q)} className="font-semibold text-tech underline" title="No produto, o envio é automático">
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
function Dificuldades({ t }: { t: Trabalhador }) {
  const { adapter } = useDados()
  const [notas, setNotas] = useState<Record<string, string>>({})
  if (t.dificuldades.length === 0) return null
  const ordenadas = [...t.dificuldades].sort((a, b) => Number(a.resolvida) - Number(b.resolvida) || b.data.localeCompare(a.data))
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">"Não consegui" relatado pelo trabalhador</p>
      <ul className="space-y-2">
        {ordenadas.map((d) => {
          const passo = t.plano.find((p) => p.id === d.passoId)
          return (
            <li key={d.id} className={`rounded-xl p-3 text-xs ring-1 ${d.resolvida ? 'bg-slate-50 text-slate-500 ring-slate-100' : 'bg-violet-50 ring-violet-200'}`}>
              <p className="font-semibold text-slate-800">
                {MOTIVOS.find((m) => m.motivo === d.motivo)?.emoji} {ROTULO_MOTIVO[d.motivo as MotivoDificuldade]}
              </p>
              <p className="mt-0.5">
                {passo ? `Passo: ${passo.titulo}` : 'Plano de cuidado'} · {d.origem === 'teach_back' ? 'errou a pergunta de checagem' : d.origem === 'checkin' ? 'no check-in' : 'na página do plano'} ·{' '}
                {relativo(d.data)}
              </p>
              {d.resolvida ? (
                <p className="mt-1 font-medium text-saude-700">✓ Resolvida{d.nota ? `: ${d.nota}` : ''}</p>
              ) : (
                <>
                  <p className="mt-1.5 font-medium text-violet-800">Ação sugerida: {ACAO_POR_MOTIVO[d.motivo]}</p>
                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={notas[d.id] ?? ''}
                      onChange={(e) => setNotas({ ...notas, [d.id]: e.target.value })}
                      placeholder="O que foi feito (sem dado clínico)"
                      className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-xs"
                    />
                    <button onClick={() => adapter.resolverDificuldade(t.id, d.id, (notas[d.id] ?? '').trim())} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white">
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
function FormMonitoramento({ t, fechar }: { t: Trabalhador; fechar: () => void }) {
  const { adapter } = useDados()
  const sugestaoProximo = addDias(new Date(), t.risco >= 3 ? 30 : 60).toISOString().slice(0, 10)
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
        await adapter.registrarMonitoramento(t.id, {
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
