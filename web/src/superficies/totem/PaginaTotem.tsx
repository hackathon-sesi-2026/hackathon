import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarCheck, Flame, IdCard, Lock, MessageCircle, MessageCircleHeart } from 'lucide-react'
import { useParams } from 'react-router'
import { api } from '../../api/cliente'
import type { Cracha, CuidadoNoTotem, LocalDor, TelaInicialDoTotem } from '../../api/tipos'
import { useRecurso } from '../../api/useRecurso'
import { LogoMarca } from '../../componentes/Logo'
import { MetaTurno } from '../../componentes/MetaTurno'
import { AvisoDeFalha, TelaCheia } from '../../componentes/TelaCheia'
import { diaSemana, horaCurta } from '../../lib/datas'
import { BonecoDaDor } from './BonecoDaDor'

// Totem "Ponto de Cuidado" na unidade. Tela pública: nada clínico, nada que identifique quem respondeu o pulso.

type Tela = 'inicio' | 'pulso' | 'obrigado' | 'cracha' | 'meu'
type Chave = 'energia' | 'dor' | 'sono'
type Resposta = 1 | 2 | 3
type Respostas = Partial<Record<Chave, Resposta>>

/** Telas pessoais saem sozinhas depois deste tempo, para ninguém ver o que ficou aberto. */
const SEGUNDOS_ATE_SAIR = 20

// As opções vão do valor 1 ao 3. Energia e sono: 1 é o pior. Dor: 3 é o pior.
const PERGUNTAS: { chave: Chave; titulo: string; opcoes: [string, string][] }[] = [
  {
    chave: 'energia',
    titulo: 'Como está sua energia hoje?',
    opcoes: [
      ['😫', 'Baixa'],
      ['😐', 'Média'],
      ['😄', 'Boa'],
    ],
  },
  {
    chave: 'dor',
    titulo: 'Sentiu dor no corpo no último turno?',
    opcoes: [
      ['🙂', 'Nenhuma'],
      ['😕', 'Leve'],
      ['😣', 'Forte'],
    ],
  },
  {
    chave: 'sono',
    titulo: 'Como você dormiu?',
    opcoes: [
      ['😴', 'Mal'],
      ['😐', 'Mais ou menos'],
      ['😊', 'Bem'],
    ],
  },
]

export function PaginaTotem() {
  const { unidade: slug = '' } = useParams()
  const base = `/totem/${slug}`
  const { dados: totem, erro, falha, enviar } = useRecurso<TelaInicialDoTotem>(base, `${base}/eventos`)
  const [tela, setTela] = useState<Tela>('inicio')
  const [respostas, setRespostas] = useState<Respostas>({})
  // Onde dói: undefined enquanto não perguntou, null se a pessoa preferiu não dizer.
  const [localDor, setLocalDor] = useState<LocalDor | null | undefined>(undefined)
  const [matricula, setMatricula] = useState<string | null>(null)
  const [cuidado, setCuidado] = useState<CuidadoNoTotem | null>(null)
  const [restante, setRestante] = useState(SEGUNDOS_ATE_SAIR)

  const sair = useCallback(() => {
    setTela('inicio')
    setRespostas({})
    setLocalDor(undefined)
    setMatricula(null)
    setCuidado(null)
  }, [])

  const telaPessoal = tela === 'meu' || tela === 'obrigado'
  useEffect(() => {
    if (!telaPessoal) return
    setRestante(SEGUNDOS_ATE_SAIR)
    const id = setInterval(() => setRestante((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [telaPessoal, matricula])
  useEffect(() => {
    if (restante <= 0 && telaPessoal) sair()
  }, [restante, telaPessoal, sair])

  if (!totem) return <TelaCheia>{erro ? 'Totem não encontrado. Confira o endereço da unidade.' : 'Preparando o totem…'}</TelaCheia>

  const pergunta = PERGUNTAS.find((q) => respostas[q.chave] === undefined)
  // Com dor leve ou forte, o boneco aparece logo depois da pergunta da dor.
  const perguntarOndeDoi = (respostas.dor ?? 0) >= 2 && localDor === undefined

  async function responder(chave: Chave, valor: Resposta) {
    const novas = { ...respostas, [chave]: valor }
    setRespostas(novas)
    if (PERGUNTAS.every((q) => novas[q.chave] !== undefined)) {
      await enviar('post', `${base}/pulsos`, { ...novas, localDor: localDor ?? null })
      setTela('obrigado')
    }
  }

  async function identificar(lida: string) {
    setCuidado(await api.post<CuidadoNoTotem>(`${base}/identificacao`, { matricula: lida }))
    setMatricula(lida)
    setTela('meu')
  }

  async function confirmar() {
    if (!matricula) return
    if (await enviar('post', `${base}/identificacao/confirmacao`, { matricula })) await identificar(matricula)
  }

  /** O link pessoal vai para o WhatsApp da própria pessoa; a tela pública nunca mostra o link. */
  async function mandarLink(): Promise<boolean> {
    if (!matricula) return false
    return enviar('post', `${base}/identificacao/link`, { matricula })
  }

  return (
    <div className="flex h-dvh flex-col bg-navy text-white">
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
        <header className="flex items-center justify-between px-6 pt-6">
          <span className="flex items-center gap-3">
            <LogoMarca className="size-10" />
            <span className="leading-tight">
              <span className="block text-base font-extrabold">
                Ponto de Cuidado <span className="text-saude">SESI</span>
              </span>
              <span className="block text-xs text-blue-100/70">
                {totem.unidade} · {totem.turno} agora
              </span>
            </span>
          </span>
          {tela !== 'inicio' && (
            <button onClick={sair} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-blue-100 hover:bg-white/10">
              <ArrowLeft className="size-4" /> Início
            </button>
          )}
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          {tela === 'inicio' && (
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-3xl font-bold leading-tight">
                Bom turno! <span className="text-saude">1 minuto</span> para você.
              </p>
              <button
                onClick={() => setTela('pulso')}
                className="flex items-center gap-4 rounded-2xl bg-saude p-5 text-left text-navy shadow-lg transition active:scale-[0.98]"
              >
                <MessageCircleHeart className="size-10 shrink-0" />
                <span>
                  <span className="block text-lg font-extrabold">Como você está hoje?</span>
                  <span className="block text-sm">3 perguntas · anônimo · sem crachá</span>
                </span>
              </button>
              <button
                onClick={() => setTela('cracha')}
                className="flex items-center gap-4 rounded-2xl bg-white/10 p-5 text-left ring-1 ring-white/20 transition hover:bg-white/15 active:scale-[0.98]"
              >
                <CalendarCheck className="size-10 shrink-0 text-saude" />
                <span>
                  <span className="block text-lg font-bold">Meu próximo cuidado</span>
                  <span className="block text-sm text-blue-100">Confirme ou remarque com o crachá</span>
                </span>
              </button>
              <p className="rounded-xl bg-white/5 px-4 py-3 text-sm text-blue-100">
                👥 <b className="text-white">{totem.respostasHoje}</b> {totem.respostasHoje === 1 ? 'colega' : 'colegas'} do {totem.turno} já{' '}
                {totem.respostasHoje === 1 ? 'respondeu' : 'responderam'} hoje.
              </p>
              <MetaTurno meta={totem.metaDoTurno} escuro />
              <p className="mt-auto flex items-center gap-1.5 text-xs text-blue-100/60">
                <Lock className="size-3" /> Respostas sem nome. Sua empresa vê só o total da unidade.
              </p>
            </div>
          )}

          {tela === 'pulso' && perguntarOndeDoi && <BonecoDaDor aoResponder={setLocalDor} />}

          {tela === 'pulso' && !perguntarOndeDoi && pergunta && (
            <div className="flex flex-1 flex-col">
              <p className="text-xs font-semibold uppercase tracking-wider text-saude">
                Pergunta {PERGUNTAS.indexOf(pergunta) + 1} de {PERGUNTAS.length}
              </p>
              <p className="mt-2 text-3xl font-bold leading-tight">{pergunta.titulo}</p>
              <div className="mt-6 grid gap-3">
                {pergunta.opcoes.map(([emoji, rotulo], i) => (
                  <button
                    key={rotulo}
                    onClick={() => responder(pergunta.chave, (i + 1) as Resposta)}
                    className="flex items-center gap-4 rounded-2xl bg-white p-5 text-left text-navy shadow transition hover:ring-4 hover:ring-saude/50 active:scale-[0.98]"
                  >
                    <span className="text-4xl">{emoji}</span>
                    <span className="text-xl font-bold">{rotulo}</span>
                  </button>
                ))}
              </div>
              <p className="mt-auto pt-4 text-xs text-blue-100/60">Anônimo: não pedimos crachá nem nome.</p>
            </div>
          )}

          {tela === 'obrigado' && <Obrigado r={respostas} unidade={totem.unidade} turno={totem.turno} restante={restante} />}

          {tela === 'cracha' && <LeitorDeCracha base={base} aoLer={identificar} />}

          {tela === 'meu' && cuidado && <MeuCuidadoNoTotem c={cuidado} restante={restante} confirmar={confirmar} mandarLink={mandarLink} sair={sair} />}
        </div>
      </div>
      <AvisoDeFalha mensagem={falha} />
    </div>
  )
}

/** Na demonstração, uma lista de crachás faz o papel do leitor. */
function LeitorDeCracha({ base, aoLer }: { base: string; aoLer: (matricula: string) => void }) {
  const { dados: crachas } = useRecurso<Cracha[]>(`${base}/crachas`)
  return (
    <div className="flex flex-1 flex-col">
      <div className="grid place-items-center rounded-2xl bg-white/5 py-8 ring-1 ring-dashed ring-white/30">
        <IdCard className="size-16 text-saude" />
        <p className="mt-2 text-xl font-bold">Aproxime seu crachá</p>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-blue-100/60">Simulação do crachá (demonstração)</p>
      <div className="mt-2 grid gap-2">
        {crachas?.map((c) => (
          <button key={c.matricula} onClick={() => aoLer(c.matricula)} className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-medium hover:bg-white/15">
            Crachá de {c.nome}
          </button>
        ))}
        {crachas?.length === 0 && <p className="text-sm text-blue-100/70">Nenhum trabalhador desta unidade nos dados fictícios.</p>}
      </div>
    </div>
  )
}

function Obrigado({ r, unidade, turno, restante }: { r: Respostas; unidade: string; turno: string; restante: number }) {
  const dicas: { titulo: string; texto: string }[] = []
  if (r.dor === 3)
    dicas.push({ titulo: 'Alongamento de 2 minutos', texto: 'Ombros para trás 10x, braços acima da cabeça por 20 s, gire o tronco devagar para cada lado. Pare se doer.' })
  if (r.sono === 1) dicas.push({ titulo: 'Sono depois do turno', texto: 'Quarto escuro, celular longe 30 min antes de deitar e o mesmo horário todo dia ajudam.' })
  if (r.energia === 1) dicas.push({ titulo: 'Energia no turno', texto: 'Um copo de água agora e uma pausa curta de pé, olhando para longe, já fazem diferença.' })
  if (dicas.length === 0) dicas.push({ titulo: 'Que bom!', texto: 'Continue assim. Beber água ao longo do turno mantém a energia.' })

  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-3xl font-bold">Obrigado! 💚</p>
      <p className="text-sm text-blue-100">
        Sua resposta entra só no total do {turno} da {unidade}.
      </p>
      {dicas.map((d) => (
        <div key={d.titulo} className="rounded-2xl bg-white p-4 text-navy">
          <p className="font-bold">{d.titulo}</p>
          <p className="mt-1 text-sm text-slate-600">{d.texto}</p>
        </div>
      ))}
      {r.dor === 3 && (
        <p className="rounded-2xl bg-white/10 p-4 text-sm">
          <b>A dor continua?</b> Fale com a enfermagem pelo link que você recebeu no WhatsApp. É privado: só você e a equipe de saúde veem.
        </p>
      )}
      <p className="mt-auto text-center text-xs text-blue-100/60">Voltando ao início em {Math.max(0, restante)} s</p>
    </div>
  )
}

/** Tela pessoal no totem: só data e hora, nunca o que é o atendimento. Os passos aparecem só em número. */
function MeuCuidadoNoTotem({
  c,
  restante,
  confirmar,
  mandarLink,
  sair,
}: {
  c: CuidadoNoTotem
  restante: number
  confirmar: () => void
  mandarLink: () => Promise<boolean>
  sair: () => void
}) {
  const [noCelular, setNoCelular] = useState(false)
  const [linkEnviado, setLinkEnviado] = useState(false)
  const retorno = c.retorno

  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-3xl font-bold">Olá, {c.primeiroNome}!</p>

      <div className="rounded-2xl bg-white p-5 text-navy">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Próximo retorno</p>
        {retorno ? (
          <>
            <p className="mt-1 text-xl font-bold capitalize">{diaSemana(retorno.data)}</p>
            <p className="text-sm text-slate-600">
              às {horaCurta(retorno.data)} · {retorno.modalidade === 'online' ? 'por vídeo' : retorno.modalidade === 'no_turno' ? 'no turno, 20 min' : retorno.local}
            </p>
            {retorno.status === 'confirmada' ? (
              <p className="mt-2 text-sm font-semibold text-saude-700">✓ Confirmado</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={confirmar} className="rounded-xl bg-navy py-3 font-semibold text-white">
                  Confirmar
                </button>
                <button onClick={() => setNoCelular(true)} className="rounded-xl border border-slate-200 py-3 font-semibold">
                  Remarcar
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Você ainda não tem retorno marcado.</p>
            <button onClick={() => setNoCelular(true)} className="mt-3 w-full rounded-xl bg-navy py-3 font-semibold text-white">
              Escolher horário
            </button>
          </>
        )}
        {noCelular && (
          <div className="mt-3 rounded-xl bg-cinza p-3">
            {linkEnviado ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-saude-700">
                <MessageCircle className="size-5" /> Pronto! O link chegou no seu WhatsApp. Escolha o horário por lá, em particular.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-600">Para escolher com calma e em particular, mandamos o seu link pessoal para o seu WhatsApp.</p>
                <button
                  onClick={async () => setLinkEnviado(await mandarLink())}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-saude py-3 font-semibold text-navy"
                >
                  <MessageCircle className="size-5" /> Mandar o link para o meu WhatsApp
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-2xl font-bold">
            {c.passosFeitos}/{c.passosNoPlano}
          </p>
          <p className="text-xs text-blue-100">passos do plano feitos</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="flex items-center gap-1 text-2xl font-bold">
            <Flame className="size-5 text-orange-400" /> {c.semanasSeguidas}
          </p>
          <p className="text-xs text-blue-100">semanas seguidas se cuidando</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <p className="text-xs text-blue-100/60">Saindo sozinho em {Math.max(0, restante)} s</p>
        <button onClick={sair} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold">
          Sair agora
        </button>
      </div>
    </div>
  )
}
