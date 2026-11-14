import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ChevronDown, Lock, MapPin, ShieldCheck, Video } from 'lucide-react'
import type { Acao, Horario, Modalidade, Trabalhador } from '../data/types'
import { useDados } from '../data/store'
import { ROTULO_ACAO } from '../domain/mensagens'
import { TURNOS, primeiroNome } from '../domain/regras'
import { dataCurta, diaSemana, faixaTurno, hora, horaCurta, relativo, semanaCurta } from '../lib/datas'
import { LogoMarca } from '../components/Logo'
import { IconeCategoria } from '../components/categorias'

type Tela = 'chat' | 'plano' | 'horarios'

export function TrabalhadorApp({ trabalhador }: { trabalhador: Trabalhador }) {
  const [tela, setTela] = useState<Tela>('chat')
  return (
    <div className="flex h-full flex-col bg-white">
      {tela === 'chat' && <Chat t={trabalhador} irPara={setTela} />}
      {tela === 'plano' && <Plano t={trabalhador} irPara={setTela} />}
      {tela === 'horarios' && <Horarios t={trabalhador} irPara={setTela} />}
    </div>
  )
}

// ---------------------------------------------------------------- Chat (canal WhatsApp que o SESI já usa)

function Chat({ t, irPara }: { t: Trabalhador; irPara: (t: Tela) => void }) {
  const { adapter } = useDados()
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [t.mensagens.length])

  async function agir(a: Acao) {
    switch (a) {
      case 'confirmar':
        return adapter.confirmarConsulta(t.id)
      case 'remarcar':
        await adapter.pedirRemarcacao(t.id)
        return irPara('horarios')
      case 'escolher_horario':
        return irPara('horarios')
      case 'plano':
        return irPara('plano')
      case 'checkin_ok':
        return adapter.responderCheckin(t.id, true)
      case 'checkin_ajuda':
        return adapter.responderCheckin(t.id, false)
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 bg-navy px-4 pb-3 pt-9 text-white">
        <span className="grid size-10 place-items-center rounded-full bg-white">
          <LogoMarca className="size-7" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-semibold leading-tight">
            SESI Saúde APS <BadgeCheck className="size-4 text-saude" />
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
                      onClick={() => agir(a)}
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
    <header className="bg-navy px-4 pb-4 pt-9 text-white">
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

function Plano({ t, irPara }: { t: Trabalhador; irPara: (t: Tela) => void }) {
  const { adapter } = useDados()
  const [aberto, setAberto] = useState<string | null>(null)
  useEffect(() => {
    adapter.abrirPlano(t.id)
  }, [adapter, t.id])

  const pendentes = t.plano.filter((p) => !p.feito)
  const proximos = pendentes.slice(0, 3)
  const depois = pendentes.length - proximos.length
  const feitos = t.plano.filter((p) => p.feito)
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
          <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.cor}`}>
            <CheckCircle2 className="size-3.5" /> {status.texto}
          </span>
        </section>

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
                    {c.modalidade === 'online' ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                    Às {horaCurta(c.data)} · {c.modalidade === 'online' ? 'por vídeo' : c.local}
                  </p>
                  {c.status === 'remarcar' && <p className="mt-0.5 text-xs font-medium text-amber-600">Você pediu para remarcar</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {c.status === 'agendada' && (
                  <button onClick={() => adapter.confirmarConsulta(t.id)} className="flex-1 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white">
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

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-bold text-navy">Seu plano de cuidado</p>
            <p className="text-xs text-slate-500">
              {feitos.length} de {t.plano.length} feitos
            </p>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-saude transition-all" style={{ width: `${(feitos.length / t.plano.length) * 100}%` }} />
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
                <div className="mt-2 pl-[3.25rem]">
                  <button onClick={() => adapter.marcarPasso(t.id, p.id, true)} className="rounded-lg bg-saude px-3 py-1.5 text-xs font-semibold text-white hover:bg-saude-700">
                    Já fiz
                  </button>
                </div>
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
                  <button onClick={() => adapter.marcarPasso(t.id, p.id, false)} className="text-xs underline">
                    desfazer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="flex gap-2 rounded-2xl bg-navy/5 p-3 text-xs text-navy">
          <ShieldCheck className="size-4 shrink-0 text-saude-700" />
          Só você e a equipe de saúde do SESI veem esta página. Sua empresa e sua liderança não têm acesso, e o cuidado é separado do exame ocupacional.
        </p>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Horários

function Horarios({ t, irPara }: { t: Trabalhador; irPara: (t: Tela) => void }) {
  const { adapter } = useDados()
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [escolhido, setEscolhido] = useState<Horario | null>(null)
  const [filtro, setFiltro] = useState<'todos' | Modalidade>('todos')

  useEffect(() => {
    setEscolhido(null)
    adapter.listarHorarios(t.id).then(setHorarios)
  }, [adapter, t.id, t.turno.nome])

  const visiveis = horarios.filter((h) => filtro === 'todos' || h.modalidade === filtro)
  const porDia = visiveis.reduce<Record<string, Horario[]>>((acc, h) => {
    const k = diaSemana(h.inicio)
    ;(acc[k] ??= []).push(h)
    return acc
  }, {})

  async function confirmar() {
    if (!escolhido) return
    await adapter.agendar(t.id, escolhido)
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
            onChange={(e) => {
              const turno = TURNOS.find((x) => x.nome === e.target.value)
              if (turno) adapter.atualizarTurno(t.id, turno)
            }}
          >
            {TURNOS.map((x) => (
              <option key={x.nome} value={x.nome}>
                {x.nome} · {faixaTurno(x.inicio, x.fim)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">Só mostramos horários fora do seu turno.</span>
        </label>

        <div className="mt-3 flex rounded-xl bg-white p-1 text-xs font-semibold shadow-sm">
          {(
            [
              ['todos', 'Todos'],
              ['presencial', 'Presencial'],
              ['online', 'Por vídeo'],
            ] as const
          ).map(([v, r]) => (
            <button key={v} onClick={() => setFiltro(v)} className={`flex-1 rounded-lg py-1.5 ${filtro === v ? 'bg-navy text-white' : 'text-slate-600'}`}>
              {r}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
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
            {escolhido.modalidade === 'online' ? 'por vídeo' : escolhido.local}
          </p>
        )}
        <button disabled={!escolhido} onClick={confirmar} className="w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white disabled:bg-slate-300">
          Confirmar horário
        </button>
      </div>
    </>
  )
}
