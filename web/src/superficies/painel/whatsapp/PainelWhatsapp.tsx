import { useState, type FormEvent } from 'react'
import { BellRing, CheckCircle2, HeartHandshake, Link2, Loader2, MessageCircle, MessagesSquare, Reply, Send, ShieldCheck, Smartphone, Users, type LucideIcon } from 'lucide-react'
import { api, ErroDaApi } from '../../../api/cliente'
import type { MensagemDeTeste, MetricasDasMensagens, ResultadoDoTeste, TipoRegistro } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { Cartao } from '../../../componentes/Cartao'
import { relativo } from '../../../lib/datas'

// Módulo WhatsApp da equipe de saúde: o que foi mandado, quanto voltou de resposta, e o "Testar no meu WhatsApp",
// em que qualquer pessoa (o avaliador, por exemplo) recebe no próprio celular a mensagem que o trabalhador recebe.
// Uso do canal não é adesão: estes números dizem se a mensagem chegou e se houve resposta, não se a pessoa se cuidou.

const numero = (n: number) => n.toLocaleString('pt-BR')

const OPCOES: { valor: MensagemDeTeste; titulo: string; descricao: string; Icone: LucideIcon }[] = [
  { valor: 'lembrete', titulo: 'Lembrete do retorno', descricao: 'Dia, hora e local, com os botões Confirmo e Preciso remarcar.', Icone: BellRing },
  { valor: 'como_voce_esta', titulo: '"Como você está?"', descricao: 'O contato da enfermeira, com Tudo bem e Quero ajuda.', Icone: HeartHandshake },
  { valor: 'pergunta_da_semana', titulo: 'Pergunta da semana', descricao: 'Se conseguiu fazer o passo do plano, com Consegui e Não consegui.', Icone: MessageCircle },
  { valor: 'link_pessoal', titulo: 'Link pessoal', descricao: 'O link da página do trabalhador: plano, exames e horários.', Icone: Link2 },
]

const ROTULO_ENVIO: Partial<Record<TipoRegistro, string>> = {
  lembrete: 'Lembrete do retorno',
  lembrete_auto: 'Lembrete automático (D-3, D-1)',
  checkin_enviado: '"Como você está?"',
  checkin_habito: 'Pergunta da semana',
  plano_enviado: 'Plano de cuidado',
  resultado_liberado: 'Aviso de resultado',
}

export function PainelWhatsapp() {
  const { dados: m, erro } = useRecurso<MetricasDasMensagens>('/aps/mensagens', '/aps/eventos')

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-tech">Equipe de saúde</p>
        <h2 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">WhatsApp</h2>
        <p className="text-sm text-slate-500">O canal que o trabalhador já usa: lembretes, contato da enfermeira e o plano em linguagem simples.</p>
      </div>

      <TesteNoMeuWhatsapp />

      {!m ? (
        <p className="text-sm text-slate-500">{erro ? `Não foi possível carregar as métricas: ${erro}` : 'Carregando as métricas…'}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Numero Icone={Send} cor="bg-[#25d366]" rotulo="Mensagens enviadas" valor={numero(m.envios)} detalhe="últimos 30 dias" />
            <Numero Icone={Users} cor="bg-tech" rotulo="Pessoas alcançadas" valor={numero(m.pessoasAlcancadas)} detalhe="receberam ao menos uma" />
            <Numero Icone={Reply} cor="bg-violet-600" rotulo="Respostas" valor={numero(m.respostas)} detalhe="toques nos botões e na página" />
            <Numero
              Icone={MessagesSquare}
              cor="bg-orange-500"
              rotulo="Responderam"
              valor={`${m.pessoasAlcancadas ? Math.round((m.pessoasQueResponderam / m.pessoasAlcancadas) * 100) : 0}%`}
              detalhe="das pessoas alcançadas · uso do canal, não adesão"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
            <Cartao titulo="Envios por dia" subtitulo="Últimos 14 dias">
              <Barras valores={m.porDia} />
            </Cartao>
            <Cartao titulo="O que foi enviado" subtitulo="Por tipo de mensagem · 30 dias">
              <ul className="space-y-2.5">
                {Object.entries(m.porTipo)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tipo, n]) => (
                    <li key={tipo} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-700">{ROTULO_ENVIO[tipo as TipoRegistro] ?? tipo}</span>
                        <b className="tabular-nums text-navy">{numero(n)}</b>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#25d366]" style={{ width: `${(n / Math.max(1, m.envios)) * 100}%` }} />
                      </div>
                    </li>
                  ))}
              </ul>
            </Cartao>
          </div>

          <Cartao titulo="Últimos envios" subtitulo="As mensagens mais recentes que o SESI mandou">
            <ul className="divide-y divide-slate-100">
              {m.ultimos.map((e) => (
                <li key={`${e.trabalhadorId}-${e.data}-${e.tipo}`} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#25d366]/15 text-[#128c4a]">
                    <MessageCircle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{e.nome}</p>
                    <p className="truncate text-xs text-slate-500">
                      {ROTULO_ENVIO[e.tipo] ?? e.tipo} · {e.empresa.replace(/ (Ltda|S\.A\.)$/, '')}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{relativo(e.data)}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        </>
      )}
    </div>
  )
}

/** O fluxo do avaliador: digitar o próprio WhatsApp, escolher a mensagem e receber no celular, como o Marcos. */
function TesteNoMeuWhatsapp() {
  const { dados: situacao } = useRecurso<{ envioReal: boolean }>('/demonstracao/whatsapp')
  const [telefone, setTelefone] = useState('')
  const [mensagem, setMensagem] = useState<MensagemDeTeste>('lembrete')
  const [aceito, setAceito] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoDoTeste | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setFalha(null)
    setResultado(null)
    try {
      setResultado(await api.post<ResultadoDoTeste>('/demonstracao/whatsapp/teste', { numero: telefone, mensagem }))
    } catch (erro) {
      setFalha(erro instanceof ErroDaApi ? erro.message : 'Não foi possível enviar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const passo = 'grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-[#128c4a]'

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b5e3a] via-[#128c4a] to-[#25d366] p-1 shadow-lg">
      <div className="grid gap-5 rounded-[1.35rem] bg-[#0b3d2a]/30 p-4 text-white sm:p-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Smartphone className="size-3.5" /> Teste de verdade, no seu celular
          </span>
          <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">Receba no seu WhatsApp o que o trabalhador recebe</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/90">
            Você recebe como se fosse o <b>Marcos</b>, operador de produção (a persona do desafio). A ação acontece de verdade no sistema: no
            Painel da APS, o histórico e o último contato dele se atualizam na hora.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-white/85">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0" /> Seu número não é guardado. Nenhum dado de saúde vai na mensagem.
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0" /> No máximo 5 mensagens de teste por número a cada 10 minutos.
            </li>
          </ul>
          {situacao && !situacao.envioReal && (
            <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
              O envio real está desligado nesta instalação: a mensagem aparece só no celular simulado do Marcos.
            </p>
          )}
        </div>

        <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-4 text-slate-800 shadow-xl sm:p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-navy">
              <span className={`${passo} bg-[#25d366]/15`}>1</span> Seu WhatsApp
            </p>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(71) 99999-8888"
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-[#25d366]"
            />
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-navy">
              <span className={`${passo} bg-[#25d366]/15`}>2</span> Qual mensagem
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Qual mensagem">
              {OPCOES.map((o) => (
                <button
                  type="button"
                  key={o.valor}
                  role="radio"
                  aria-checked={mensagem === o.valor}
                  onClick={() => setMensagem(o.valor)}
                  className={`flex gap-2.5 rounded-xl p-3 text-left ring-1 transition ${mensagem === o.valor ? 'bg-[#25d366]/10 ring-2 ring-[#25d366]' : 'ring-slate-200 hover:bg-slate-50'}`}
                >
                  <o.Icone className={`mt-0.5 size-4 shrink-0 ${mensagem === o.valor ? 'text-[#128c4a]' : 'text-slate-400'}`} />
                  <span>
                    <span className="block text-sm font-semibold">{o.titulo}</span>
                    <span className="block text-xs leading-snug text-slate-500">{o.descricao}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" required checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5 size-4 accent-[#25d366]" />
            Aceito receber esta mensagem de teste do Selo Saúde no meu WhatsApp.
          </label>
          <button
            type="submit"
            disabled={enviando || !aceito || !telefone.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] py-3 text-base font-bold text-[#073b24] shadow-[0_0.4rem_1.4rem_rgba(37,211,102,0.4)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
          >
            {enviando ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            {enviando ? 'Enviando…' : 'Enviar para o meu WhatsApp'}
          </button>
          {resultado && (
            <div className="flex gap-2.5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200" role="status">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                {resultado.envioReal ? (
                  resultado.enviado ? (
                    <>
                      <b>Enviado para {resultado.numeroMascarado}.</b> Confira o seu WhatsApp. No Painel da APS, o último contato do Marcos já
                      mostra este envio.
                    </>
                  ) : (
                    <>
                      <b>A mensagem foi registrada, mas o WhatsApp não confirmou o envio.</b> Confira o número e tente de novo.
                    </>
                  )
                ) : (
                  <>
                    <b>Registrado no sistema.</b> O envio real está desligado: a mensagem aparece no celular simulado do Marcos.
                  </>
                )}
              </div>
            </div>
          )}
          {falha && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-alerta ring-1 ring-red-200" role="alert">
              {falha}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}

function Numero({ Icone, cor, rotulo, valor, detalhe }: { Icone: LucideIcon; cor: string; rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${cor}`}>
          <Icone className="size-4" />
        </span>
        <p className="text-sm font-medium leading-tight text-slate-600">{rotulo}</p>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-navy sm:text-3xl">{valor}</p>
      <p className="text-xs text-slate-500">{detalhe}</p>
    </div>
  )
}

function Barras({ valores }: { valores: number[] }) {
  const maior = Math.max(1, ...valores)
  return (
    <div className="flex h-40 items-end gap-1 sm:gap-1.5">
      {valores.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-semibold tabular-nums text-slate-500">{v}</span>
          <div className="w-full rounded-t-md bg-gradient-to-t from-[#128c4a] to-[#25d366]" style={{ height: `${Math.max(3, (v / maior) * 80)}%` }} />
          <span className="text-[9px] text-slate-400">{i === valores.length - 1 ? 'hoje' : `-${valores.length - 1 - i}`}</span>
        </div>
      ))}
    </div>
  )
}
