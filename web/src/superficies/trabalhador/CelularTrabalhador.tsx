import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ChevronDown, Factory, Flame, Lock, MapPin, ShieldCheck, Sparkles, Video } from 'lucide-react'
import type { Acao, Horario, Mensagem, MeuCuidado, Modalidade, Motivacao, MotivoDificuldade, StatusExame, Turno } from '../../api/tipos'
import { IconeCategoria } from '../../componentes/IconeCategoria'
import { LogoMarca } from '../../componentes/Logo'
import { MetaTurno } from '../../componentes/MetaTurno'
import { dataCurta, diaSemana, faixaTurno, hora, horaCurta, relativo, semanaCurta } from '../../lib/datas'
import { MOTIVOS, ROTULO_ACAO, ROTULO_MOTIVO, primeiroNome } from '../../lib/rotulos'
import { useAcoes } from './acoes'

type Tela = 'chat' | 'plano' | 'horarios' | 'exames'

/** A conversa (o canal que o SESI já usa) e as duas páginas leves que ela abre: plano e horários. */
export function CelularTrabalhador({ trabalhador }: { trabalhador: MeuCuidado }) {
  const [tela, setTela] = useState<Tela>('chat')
  const [pedindoMotivo, setPedindoMotivo] = useState<PedidoMotivo | null>(null)
  const acoes = useAcoes()
  return (
    <div className="relative flex h-full flex-col bg-white">
      {tela === 'chat' && <Chat t={trabalhador} irPara={setTela} pedirMotivo={setPedindoMotivo} />}
      {tela === 'plano' && <Plano t={trabalhador} irPara={setTela} pedirMotivo={setPedindoMotivo} />}
      {tela === 'horarios' && <Horarios t={trabalhador} irPara={setTela} />}
      {tela === 'exames' && <Exames t={trabalhador} irPara={setTela} />}
      {pedindoMotivo && (
        <FolhaMotivo
          fechar={() => setPedindoMotivo(null)}
          escolher={async (m) => {
            await acoes.relatarDificuldade(m, pedindoMotivo.origem, pedindoMotivo.passoId)
            setPedindoMotivo(null)
            setTela('chat')
          }}
        />
      )}
    </div>
  )
}

type PedidoMotivo = { origem: 'plano' | 'checkin'; passoId?: string | null }

/** "Não consegui": o trabalhador diz o motivo em um toque. É o dado que a enfermeira hoje não tem (slide 16). */
function FolhaMotivo({ fechar, escolher }: { fechar: () => void; escolher: (m: MotivoDificuldade) => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end bg-navy/40" onClick={fechar}>
      <div className="rounded-t-3xl bg-white p-4 pb-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
        <p className="font-bold text-navy">Tudo bem, acontece. O que atrapalhou?</p>
        <p className="mt-0.5 text-xs text-slate-500">Só a equipe de saúde vê sua resposta. Sua empresa não.</p>
        <div className="mt-3 grid gap-2">
          {MOTIVOS.map((m) => (
            <button
              key={m.motivo}
              onClick={() => escolher(m.motivo)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:border-tech hover:bg-blue-50"
            >
              <span className="text-lg">{m.emoji}</span> {m.rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Chat (canal WhatsApp que o SESI já usa)

function Chat({ t, irPara, pedirMotivo }: { t: MeuCuidado; irPara: (t: Tela) => void; pedirMotivo: (p: PedidoMotivo) => void }) {
  const acoes = useAcoes()
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [t.mensagens.length])

  async function agir(a: Acao, m: Mensagem) {
    switch (a) {
      case 'habito_sim':
        return m.passoId && acoes.responderHabito(m.passoId, true)
      case 'habito_nao':
        if (m.passoId) await acoes.responderHabito(m.passoId, false)
        return pedirMotivo({ origem: 'checkin', passoId: m.passoId })
      case 'confirmar':
        return acoes.confirmarConsulta()
      case 'remarcar':
        await acoes.pedirRemarcacao()
        return irPara('horarios')
      case 'escolher_horario':
        return irPara('horarios')
      case 'plano':
        return irPara('plano')
      case 'exames':
        return irPara('exames')
      case 'checkin_ok':
        return acoes.responderCheckin(true)
      case 'checkin_ajuda':
        return acoes.responderCheckin(false)
      case 'se_turno':
      case 'se_folga':
      case 'se_so_lembrete':
        return acoes.escolherCompromisso(a)
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 bg-navy px-4 pb-3 pt-4 text-white">
        <span className="grid size-10 place-items-center rounded-full bg-white">
          <LogoMarca className="size-7" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-semibold leading-tight">
            Selo Saúde · SESI <BadgeCheck className="size-4 text-saude" />
          </p>
          <p className="truncate text-xs text-blue-100/80">canal oficial · sem dados de saúde nas mensagens</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-[#ece7df] px-3 py-4">
        {t.mensagens.length === 0 && (
          <p className="mx-auto mt-10 max-w-[80%] rounded-lg bg-white/70 p-3 text-center text-xs text-slate-500">
            Nenhuma mensagem ainda. A enfermeira pode enviar um lembrete pelo painel.
          </p>
        )}
        {t.mensagens.map((m) => (
          <div key={m.id} className={`flex ${m.de === 'trabalhador' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div className={`rounded-xl px-3 py-2 text-[13px] shadow-sm ${m.de === 'trabalhador' ? 'rounded-tr-none bg-[#d9f7e8]' : 'rounded-tl-none bg-white'}`}>
                <p className="whitespace-pre-line leading-snug text-slate-800">{m.texto}</p>
                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {relativo(m.hora) === 'hoje' ? '' : `${dataCurta(m.hora)} · `}
                  {hora(m.hora)}
                </p>
              </div>
              {m.acoes && (
                <div className="mt-1 flex flex-col gap-1">
                  {m.acoes.map((a) => (
                    <button
                      key={a}
                      onClick={() => agir(a, m)}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-tech shadow-sm transition hover:bg-blue-50 active:scale-[0.98]"
                    >
                      {ROTULO_ACAO[a]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={fim} />
      </div>

      <footer className="flex items-center gap-2 bg-[#ece7df] px-3 pb-5 pt-1">
        <div className="flex-1 rounded-full bg-white px-4 py-2 text-sm text-slate-400">Responda pelos botões acima</div>
        <button onClick={() => irPara('plano')} className="rounded-full bg-navy px-3 py-2 text-xs font-semibold text-white">
          Meu plano
        </button>
      </footer>
    </>
  )
}

// ---------------------------------------------------------------- Página leve: cabeçalho comum

function CabecalhoPagina({ titulo, voltar }: { titulo: string; voltar: () => void }) {
  return (
    <header className="bg-navy px-4 pb-4 pt-4 text-white">
      <div className="mb-3 flex items-center justify-center gap-1 rounded-md bg-white/10 py-1 text-[11px] text-blue-100">
        <Lock className="size-3" /> link pessoal · abre sem instalar app
      </div>
      <div className="flex items-center gap-2">
        <button onClick={voltar} className="rounded-lg p-1 text-blue-100 hover:bg-white/10" aria-label="Voltar para a conversa">
          <ArrowLeft className="size-5" />
        </button>
        <LogoMarca className="size-6" />
        <h2 className="text-base font-semibold">{titulo}</h2>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------- Plano (tradução do Plano de Cuidados)

function Plano({ t, irPara, pedirMotivo }: { t: MeuCuidado; irPara: (t: Tela) => void; pedirMotivo: (p: PedidoMotivo) => void }) {
  const acoes = useAcoes()
  const [aberto, setAberto] = useState<string | null>(null)
  const [comemoracao, setComemoracao] = useState<string | null>(null)
  const abertas = t.dificuldades.filter((d) => !d.resolvida)
  // Abrir o plano marca "recebido" para a enfermagem. É uso do canal, não adesão.
  useEffect(() => {
    if (t.statusPlano !== 'recebido') acoes.abrirPlano()
  }, [acoes, t.statusPlano])
  useEffect(() => {
    if (!comemoracao) return
    const id = setTimeout(() => setComemoracao(null), 4000)
    return () => clearTimeout(id)
  }, [comemoracao])

  const motivacao = t.motivacao ? MOTIVACOES.find((m) => m.valor === t.motivacao) : undefined

  async function jaFiz(passoId: string) {
    await acoes.marcarPasso(passoId, true)
    setComemoracao(motivacao ? `Boa! +1 passo ${motivacao.porque}.` : 'Boa! +1 passo no seu cuidado.')
  }

  const pendentes = t.passos.filter((p) => !p.feito)
  const proximos = pendentes.slice(0, 3)
  const depois = pendentes.length - proximos.length
  const feitos = t.passos.filter((p) => p.feito)
  const c = t.consulta && t.consulta.status !== 'faltou' ? t.consulta : null

  const status = c?.status === 'confirmada'
    ? { texto: 'Seu cuidado em dia', cor: 'bg-emerald-50 text-saude-700 ring-emerald-200' }
    : c
      ? { texto: 'Retorno a confirmar', cor: 'bg-amber-50 text-amber-700 ring-amber-200' }
      : { texto: 'Retorno a marcar', cor: 'bg-blue-50 text-tech ring-blue-200' }

  return (
    <>
      <CabecalhoPagina titulo="Meu cuidado" voltar={() => irPara('chat')} />
      <div className="flex-1 space-y-5 overflow-y-auto bg-cinza px-4 py-4">
        <section>
          <p className="text-lg font-bold text-navy">Olá, {primeiroNome(t.nome)}! 👋</p>
          <p className="text-sm text-slate-600">Vamos continuar cuidando da sua saúde?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.cor}`}>
              <CheckCircle2 className="size-3.5" /> {status.texto}
            </span>
            {t.semanasSeguidas > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                <Flame className="size-3.5" /> {t.semanasSeguidas} {t.semanasSeguidas === 1 ? 'semana' : 'semanas seguidas'} se cuidando
              </span>
            )}
            {t.selos.map((s) => (
              <span key={s.nome} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200" title="Selo por manter o acompanhamento">
                {s.emoji} Selo {s.nome}
              </span>
            ))}
          </div>
          {motivacao && (
            <p className="mt-2 text-xs text-slate-600">
              Você se cuida por: <b className="text-navy">{motivacao.rotulo.toLowerCase()} {motivacao.emoji}</b>
            </p>
          )}
        </section>

        {comemoracao && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-saude-700 ring-1 ring-emerald-200">🎉 {comemoracao}</p>}

        {!t.motivacao && <EscolhaMotivacao />}

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-navy">Próximo compromisso</p>
          {c ? (
            <>
              <div className="flex items-center gap-3">
                <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-navy py-2 text-white">
                  <span className="text-xs">{semanaCurta(c.data)}</span>
                  <span className="text-base font-bold leading-tight">{dataCurta(c.data)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Retorno com a enfermagem</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    {c.modalidade === 'online' ? <Video className="size-3.5" /> : c.modalidade === 'no_turno' ? <Factory className="size-3.5" /> : <MapPin className="size-3.5" />}
                    Às {horaCurta(c.data)} · {c.modalidade === 'online' ? 'por vídeo' : c.modalidade === 'no_turno' ? 'no turno, 20 min' : c.local}
                  </p>
                  {c.status === 'remarcar' && <p className="mt-0.5 text-xs font-medium text-amber-600">Você pediu para remarcar</p>}
                </div>
              </div>
              {c.status === 'confirmada' && (
                <p className="mt-3 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-saude-700">
                  ✅ Horário garantido: atendimento na hora marcada, sem fila.
                  {c.compromisso && <span className="block font-medium text-slate-600">Você combinou: {c.compromisso}.</span>}
                </p>
              )}
              {c.status === 'agendada' && <p className="mt-3 text-xs text-slate-500">Confirme para garantir seu horário sem fila.</p>}
              <div className="mt-3 flex gap-2">
                {c.status === 'agendada' && (
                  <button onClick={() => acoes.confirmarConsulta()} className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white">
                    Confirmar presença
                  </button>
                )}
                <button
                  onClick={() => irPara('horarios')}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${c.status === 'agendada' ? 'border border-slate-200 text-navy' : 'bg-navy text-white'}`}
                >
                  {c.status === 'remarcar' ? 'Escolher novo horário' : 'Remarcar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Você ainda não tem retorno marcado.</p>
              <button onClick={() => irPara('horarios')} className="mt-3 w-full rounded-xl bg-navy py-2.5 text-sm font-semibold text-white">
                Escolher horário fora do meu turno
              </button>
            </>
          )}
        </section>

        <ResumoExames t={t} abrir={() => irPara('exames')} />

        {t.checagem && <ChecagemPlano opcoes={t.checagem} />}

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-bold text-navy">Seu plano de cuidado</p>
            <p className="text-xs text-slate-500">
              {feitos.length} de {t.passos.length} feitos
            </p>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-saude transition-all" style={{ width: `${(feitos.length / t.passos.length) * 100}%` }} />
          </div>
          {proximos.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">Tudo feito por enquanto. 🎉</p>}
          <ol className="space-y-2">
            {proximos.map((p) => (
              <li key={p.id} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex gap-3">
                  <IconeCategoria categoria={p.categoria} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-slate-900">{p.titulo}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{p.detalhe}</p>
                    <p className="mt-1 flex items-start gap-1 text-xs font-medium text-saude-700">
                      <Sparkles className="mt-0.5 size-3 shrink-0" /> O que você ganha: {p.ganho}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Até {dataCurta(p.prazo)} · {relativo(p.prazo)}
                    </p>
                  </div>
                </div>
                {p.itensTecnicos && (
                  <div className="mt-2 pl-[3.25rem]">
                    <button onClick={() => setAberto(aberto === p.id ? null : p.id)} className="flex items-center gap-1 text-xs font-medium text-tech">
                      <ChevronDown className={`size-3.5 transition ${aberto === p.id ? 'rotate-180' : ''}`} />
                      {aberto === p.id ? 'Esconder' : 'Ver'} lista do pedido ({p.itensTecnicos.length} itens)
                    </button>
                    {aberto === p.id && (
                      <ul className="mt-1 columns-2 gap-3 text-[11px] leading-snug text-slate-500">
                        {p.itensTecnicos.map((i) => (
                          <li key={i}>• {i}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {abertas.find((d) => d.passoId === p.id) ? (
                  <p className="mt-2 ml-[3.25rem] rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    Você avisou: {ROTULO_MOTIVO[abertas.find((d) => d.passoId === p.id)!.motivo].toLowerCase()}. A enfermeira vai te procurar.
                  </p>
                ) : (
                  <div className="mt-2 flex gap-2 pl-[3.25rem]">
                    <button onClick={() => jaFiz(p.id)} className="rounded-lg bg-saude px-3 py-1.5 text-xs font-semibold text-white hover:bg-saude-700">
                      Já fiz
                    </button>
                    <button
                      onClick={() => pedirMotivo({ origem: 'plano', passoId: p.id })}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Não consegui
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {depois > 0 && <p className="mt-2 text-center text-xs text-slate-500">+ {depois} passo(s) depois desses</p>}
          {feitos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {feitos.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-saude" /> <span className="line-through">{p.titulo}</span>
                  </span>
                  <button onClick={() => acoes.marcarPasso(p.id, false)} className="text-xs underline">
                    desfazer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {t.metaDoTurno && (
          <section className="space-y-2">
            <p className="text-sm font-bold text-navy">Seu turno junto</p>
            <MetaTurno meta={t.metaDoTurno} />
          </section>
        )}

        <p className="flex gap-2 rounded-2xl bg-navy/5 p-3 text-xs text-navy">
          <ShieldCheck className="size-4 shrink-0 text-saude-700" />
          Só você e a equipe de saúde do SESI veem esta página. Sua empresa e sua liderança não têm acesso, e o cuidado é separado do exame ocupacional.
        </p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Meus exames

const ETAPAS: { status: StatusExame; rotulo: string }[] = [
  { status: 'pedido', rotulo: 'Pedido' },
  { status: 'coletado', rotulo: 'Coletado' },
  { status: 'resultado', rotulo: 'Resultado' },
]

const ROTULO_STATUS_EXAME: Record<StatusExame, string> = {
  pedido: 'Falta fazer a coleta',
  coletado: 'Coletado · aguardando resultado',
  resultado: 'Resultado disponível',
}

function ResumoExames({ t, abrir }: { t: MeuCuidado; abrir: () => void }) {
  const ex = t.exames[0]
  if (!ex) return null
  return (
    <button onClick={abrir} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm hover:ring-1 hover:ring-tech">
      <IconeCategoria categoria="exames" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy">Meus exames</span>
        <span className="block text-xs text-slate-600">
          {ex.titulo} · {ROTULO_STATUS_EXAME[ex.status].toLowerCase()}
        </span>
      </span>
      {t.resultadoNaoVisto && <span className="rounded-full bg-tech px-2 py-0.5 text-[11px] font-bold text-white">Novo</span>}
    </button>
  )
}

function Exames({ t, irPara }: { t: MeuCuidado; irPara: (t: Tela) => void }) {
  const acoes = useAcoes()
  const [aberto, setAberto] = useState<string | null>(t.exames.find((e) => e.status === 'resultado')?.id ?? null)
  // Abrir a página some com o aviso de resultado novo.
  useEffect(() => {
    if (t.resultadoNaoVisto) acoes.verResultados()
  }, [acoes, t.resultadoNaoVisto])

  return (
    <>
      <CabecalhoPagina titulo="Meus exames" voltar={() => irPara('plano')} />
      <div className="flex-1 space-y-3 overflow-y-auto bg-cinza px-4 py-4">
        {t.exames.map((ex) => {
          const etapa = ETAPAS.findIndex((e) => e.status === ex.status)
          const atencao = ex.itens.filter((i) => i.situacao === 'atencao').length
          return (
            <section key={ex.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-bold text-navy">{ex.titulo}</p>
              <p className="text-xs text-slate-500">
                Pedido por {ex.pedidoPor} em {dataCurta(ex.dataPedido)}
              </p>

              <ol className="mt-3 flex items-center gap-1">
                {ETAPAS.map((e, i) => (
                  <li key={e.status} className="flex flex-1 items-center gap-1">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        i <= etapa ? 'bg-saude text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {i < etapa || ex.status === 'resultado' ? <CheckCircle2 className="size-3.5" /> : i + 1}
                    </span>
                    <span className={`text-[11px] font-semibold ${i <= etapa ? 'text-saude-700' : 'text-slate-400'}`}>{e.rotulo}</span>
                    {i < ETAPAS.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < etapa ? 'bg-saude' : 'bg-slate-200'}`} />}
                  </li>
                ))}
              </ol>

              {ex.status === 'pedido' && (
                <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-navy">
                  É uma coleta só, de manhã, com jejum de 8 horas. Leve o pedido. Quando fizer, marque “Já fiz” no seu plano.
                </p>
              )}
              {ex.status === 'coletado' && (
                <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-navy">Coleta feita em {dataCurta(ex.dataColeta!)}. Avisamos aqui quando o resultado sair.</p>
              )}

              {ex.status === 'resultado' && (
                <>
                  <p className="mt-3 text-sm text-slate-700">
                    Resultado de {dataCurta(ex.dataResultado!)}: <b>{ex.itens.length - atencao} de {ex.itens.length}</b> dentro do esperado
                    {atencao > 0 && (
                      <>
                        {' · '}
                        <b className="text-amber-700">
                          {atencao} para conversar no retorno
                        </b>
                      </>
                    )}
                    .
                  </p>
                  <button onClick={() => setAberto(aberto === ex.id ? null : ex.id)} className="mt-2 flex items-center gap-1 text-xs font-semibold text-tech">
                    <ChevronDown className={`size-3.5 transition ${aberto === ex.id ? 'rotate-180' : ''}`} />
                    {aberto === ex.id ? 'Esconder' : 'Ver'} cada exame explicado
                  </button>
                  {aberto === ex.id && (
                    <ul className="mt-2 space-y-2">
                      {ex.itens.map((i) => (
                        <li key={i.nome} className={`rounded-xl p-3 ring-1 ${i.situacao === 'atencao' ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-100'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{i.simples}</p>
                              <p className="text-[11px] text-slate-500">{i.nome}</p>
                            </div>
                            <p className="shrink-0 text-right text-sm font-bold text-navy">
                              {i.valor}
                              <span className="block text-[10px] font-normal text-slate-500">esperado: {i.referencia}</span>
                            </p>
                          </div>
                          <p className={`mt-1.5 text-xs font-semibold ${i.situacao === 'atencao' ? 'text-amber-800' : 'text-saude-700'}`}>
                            {i.situacao === 'atencao' ? 'Vale conversar no retorno' : 'Dentro do esperado'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">{i.explicacao}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          )
        })}

        <p className="flex gap-2 rounded-2xl bg-navy/5 p-3 text-xs text-navy">
          <ShieldCheck className="size-4 shrink-0 text-saude-700" />
          Isto não é diagnóstico: a médica explica tudo no retorno. Só você e a equipe de saúde veem seus resultados. Eles nunca vão pelo WhatsApp nem para a empresa.
        </p>
      </div>
    </>
  )
}

/** Motivação pessoal: a pessoa escolhe por que se cuida; o app lembra disso nos momentos certos. */
const MOTIVACOES: { valor: Motivacao; rotulo: string; emoji: string; porque: string }[] = [
  { valor: 'familia', rotulo: 'Estar bem para minha família', emoji: '👨‍👩‍👧', porque: 'para estar bem com a sua família' },
  { valor: 'energia', rotulo: 'Ter mais energia', emoji: '⚡', porque: 'rumo a mais energia' },
  { valor: 'menos_dor', rotulo: 'Sentir menos dor no corpo', emoji: '💪', porque: 'rumo a menos dor' },
  { valor: 'sono', rotulo: 'Dormir melhor', emoji: '😴', porque: 'rumo a um sono melhor' },
]

function EscolhaMotivacao() {
  const acoes = useAcoes()
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-navy">Por que você quer se cuidar?</p>
      <p className="mt-0.5 text-xs text-slate-500">Escolha um. A gente lembra disso com você.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {MOTIVACOES.map((m) => (
          <button
            key={m.valor}
            onClick={() => acoes.definirMotivacao(m.valor)}
            className="rounded-xl border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-800 hover:border-tech hover:bg-blue-50"
          >
            <span className="block text-xl">{m.emoji}</span>
            {m.rotulo}
          </button>
        ))}
      </div>
    </section>
  )
}

/**
 * Teach-back assíncrono: uma pergunta para conferir se o plano foi entendido.
 * Errar não é "reprovar": vira um aviso para a enfermeira explicar.
 */
function ChecagemPlano({ opcoes }: { opcoes: string[] }) {
  const acoes = useAcoes()
  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm font-bold text-navy">Para conferir: qual é o seu primeiro passo?</p>
      <p className="mt-0.5 text-xs text-slate-600">Uma pergunta só. Ajuda a equipe a explicar melhor.</p>
      <div className="mt-3 grid gap-2">
        {opcoes.map((o) => (
          <button
            key={o}
            onClick={() => acoes.responderChecagem(o)}
            className="rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 shadow-sm hover:ring-1 hover:ring-tech"
          >
            {o}
          </button>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- Horários

function Horarios({ t, irPara }: { t: MeuCuidado; irPara: (t: Tela) => void }) {
  const acoes = useAcoes()
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [escolhido, setEscolhido] = useState<Horario | null>(null)
  const [filtro, setFiltro] = useState<'todos' | Modalidade>('todos')
  const [nomeLideranca, setNomeLideranca] = useState(false)

  useEffect(() => {
    setEscolhido(null)
    setNomeLideranca(false)
    acoes.listarHorarios().then((r) => {
      setHorarios(r.horarios)
      setTurnos(r.turnos)
    })
  }, [acoes, t.turno.nome])

  const visiveis = horarios.filter((h) => filtro === 'todos' || h.modalidade === filtro)
  // Facilidade e proximidade + autonomia: duas opções mais próximas em destaque (menos tempo entre marcar e ir).
  const sugeridos = [...visiveis].sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 2)
  const porDia = visiveis.reduce<Record<string, Horario[]>>((acc, h) => {
    const k = diaSemana(h.inicio)
    ;(acc[k] ??= []).push(h)
    return acc
  }, {})

  async function confirmar() {
    if (!escolhido) return
    await acoes.agendar(escolhido, escolhido.modalidade === 'no_turno' && nomeLideranca)
    irPara('chat')
  }

  return (
    <>
      <CabecalhoPagina titulo="Escolher horário" voltar={() => irPara('chat')} />
      <div className="flex-1 overflow-y-auto bg-cinza px-4 py-4">
        <label className="block rounded-2xl bg-white p-3 text-sm shadow-sm">
          <span className="flex items-center gap-1.5 font-semibold text-navy">
            <CalendarClock className="size-4" /> Seu turno de trabalho
          </span>
          <select
            className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={t.turno.nome}
            onChange={(e) => acoes.atualizarTurno(e.target.value)}
          >
            {turnos.map((x) => (
              <option key={x.nome} value={x.nome}>
                {x.nome} · {faixaTurno(x.inicio, x.fim)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">Mostramos horários fora do seu turno, por vídeo e, quando a empresa libera, 20 min dentro do turno.</span>
        </label>

        <div className="mt-3 flex rounded-xl bg-white p-1 text-xs font-semibold shadow-sm">
          {(
            [
              ['todos', 'Todos'],
              ['no_turno', 'No turno'],
              ['presencial', 'Presencial'],
              ['online', 'Por vídeo'],
            ] as const
          ).map(([v, r]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`flex-1 rounded-lg py-1.5 ${filtro === v ? 'bg-navy text-white' : 'text-slate-600'}`}>
              {r}
            </button>
          ))}
        </div>

        {sugeridos.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold text-navy">Mais próximos para você</p>
            <div className="grid grid-cols-2 gap-2">
              {sugeridos.map((h) => {
                const ativo = escolhido?.inicio === h.inicio && escolhido.modalidade === h.modalidade
                return (
                  <button
                    key={`s-${h.inicio}${h.modalidade}`}
                    onClick={() => setEscolhido(h)}
                    className={`rounded-xl border-2 p-2.5 text-left transition ${ativo ? 'border-tech bg-tech text-white' : 'border-tech/30 bg-white hover:border-tech'}`}
                  >
                    <span className="block text-xs capitalize opacity-80">{semanaCurta(h.inicio)} · {dataCurta(h.inicio)}</span>
                    <span className="flex items-center gap-1 text-base font-bold">
                      {h.modalidade === 'online' && <Video className="size-4" />}
                      {h.modalidade === 'no_turno' && <Factory className="size-4" />}
                      {horaCurta(h.inicio)}
                    </span>
                    <span className={`block text-[11px] ${ativo ? 'text-blue-50' : 'text-saude-700'}`}>
                      {h.dica ?? (h.modalidade === 'online' ? 'por vídeo' : 'presencial')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Outros horários</p>
        <div className="mt-2 space-y-4">
          {Object.entries(porDia).map(([dia, hs]) => (
            <div key={dia}>
              <p className="mb-1.5 text-sm font-semibold capitalize text-navy">{dia}</p>
              <div className="grid grid-cols-3 gap-2">
                {hs.map((h) => {
                  const ativo = escolhido?.inicio === h.inicio && escolhido.modalidade === h.modalidade
                  return (
                    <button
                      key={h.inicio + h.modalidade}
                      onClick={() => setEscolhido(h)}
                      className={`rounded-xl border px-1.5 py-2 text-center transition ${
                        ativo ? 'border-tech bg-tech text-white' : 'border-slate-200 bg-white hover:border-tech'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1 text-sm font-semibold">
                        {h.modalidade === 'online' && <Video className="size-3.5" />}
                        {h.modalidade === 'no_turno' && <Factory className="size-3.5" />}
                        {horaCurta(h.inicio)}
                      </span>
                      {h.dica && <span className={`block text-[10px] leading-tight ${ativo ? 'text-blue-50' : 'text-saude-700'}`}>{h.dica}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 pb-6 pt-3">
        {escolhido && (
          <p className="mb-2 text-xs text-slate-600">
            <span className="capitalize">{diaSemana(escolhido.inicio)}</span>, {horaCurta(escolhido.inicio)} ·{' '}
            {escolhido.modalidade === 'online' ? 'por vídeo' : escolhido.modalidade === 'no_turno' ? `${escolhido.local}, no turno (20 min)` : escolhido.local}
          </p>
        )}
        {escolhido?.modalidade === 'no_turno' && (
          <label className="mb-2 flex items-start gap-2 rounded-xl bg-cinza p-2.5 text-xs text-slate-700">
            <input type="checkbox" checked={nomeLideranca} onChange={(e) => setNomeLideranca(e.target.checked)} className="mt-0.5 size-4 accent-[#2563eb]" />
            <span>
              Mostrar meu nome à liderança para organizar a liberação. <b>Nunca o motivo.</b> Se deixar desmarcado, aparece só "Colaborador(a)".
            </span>
          </label>
        )}
        <button disabled={!escolhido} onClick={confirmar} className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white disabled:bg-slate-300">
          Confirmar horário
        </button>
      </div>
    </>
  )
}
