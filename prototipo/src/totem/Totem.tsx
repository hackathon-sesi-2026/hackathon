import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarCheck, Flame, IdCard, Lock, MessageCircleHeart } from 'lucide-react'
import type { Pulso, Trabalhador } from '../data/types'
import { useDados } from '../data/store'
import { UNIDADES, MINIMO_GRUPO } from '../data/unidades'
import { inicioDoDia, diaSemana, horaCurta } from '../lib/datas'
import { primeiroNome } from '../domain/regras'
import { LogoMarca } from '../components/Logo'
import { MetaTurno, QrFalso, turnoAgora } from '../components/comum'

// Totem "Ponto de Cuidado" na unidade. Tela pública: nada clínico, nada que identifique quem respondeu o pulso.

type Tela = 'inicio' | 'pulso' | 'obrigado' | 'cracha' | 'meu'
type Resposta = 1 | 2 | 3

const PERGUNTAS: { chave: 'energia' | 'dor' | 'sono'; titulo: string; opcoes: [string, string][] }[] = [
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

const UNIDADES_TOTEM = UNIDADES.filter((u) => u.vidas >= MINIMO_GRUPO).map((u) => u.unidade)

export function Totem() {
  const { adapter, pulsos, trabalhadores } = useDados()
  const [unidade, setUnidade] = useState(UNIDADES_TOTEM[0])
  const [tela, setTela] = useState<Tela>('inicio')
  const [respostas, setRespostas] = useState<Partial<Record<'energia' | 'dor' | 'sono', Resposta>>>({})
  const [pessoa, setPessoa] = useState<string | null>(null)
  const turno = turnoAgora()

  const hoje = inicioDoDia(new Date()).toISOString()
  const responderamHoje = pulsos.filter((p) => p.unidade === unidade && p.turno === turno && p.data >= hoje).length

  // Privacidade: telas pessoais saem sozinhas.
  const [restante, setRestante] = useState(20)
  useEffect(() => {
    if (tela !== 'meu' && tela !== 'obrigado') return
    setRestante(20)
    const id = setInterval(() => setRestante((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [tela, pessoa])
  useEffect(() => {
    if (restante <= 0 && (tela === 'meu' || tela === 'obrigado')) sair()
  }, [restante, tela])

  function sair() {
    setTela('inicio')
    setRespostas({})
    setPessoa(null)
  }

  const passo = PERGUNTAS.findIndex((q) => respostas[q.chave] === undefined)

  async function responder(chave: 'energia' | 'dor' | 'sono', v: Resposta) {
    const novas = { ...respostas, [chave]: v }
    setRespostas(novas)
    if (PERGUNTAS.every((q) => novas[q.chave] !== undefined)) {
      // Na pergunta de dor, a opção 3 é "Forte"; nas outras, 1 é a pior. Guardamos no formato do Pulso.
      await adapter.registrarPulso({ unidade, turno, energia: novas.energia!, dor: novas.dor!, sono: novas.sono! } as Omit<Pulso, 'id' | 'data'>)
      setTela('obrigado')
    }
  }

  const t = trabalhadores.find((x) => x.id === pessoa)

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="text-sm text-slate-600">
        Totem da unidade{' '}
        <select
          value={unidade}
          onChange={(e) => {
            setUnidade(e.target.value)
            sair()
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-navy"
        >
          {UNIDADES_TOTEM.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </label>

      {/* Moldura do totem */}
      <div className="w-[440px] max-w-full rounded-[2rem] bg-slate-800 p-3 shadow-2xl">
        <div className="flex h-[700px] max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-[1.4rem] bg-navy text-white">
          <header className="flex items-center justify-between px-5 pt-5">
            <span className="flex items-center gap-2">
              <LogoMarca className="size-8" />
              <span className="leading-tight">
                <span className="block text-sm font-extrabold">
                  Ponto de Cuidado <span className="text-saude">SESI</span>
                </span>
                <span className="block text-[11px] text-blue-100/70">
                  {unidade} · {turno} agora
                </span>
              </span>
            </span>
            {tela !== 'inicio' && (
              <button onClick={sair} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-100 hover:bg-white/10">
                <ArrowLeft className="size-4" /> Início
              </button>
            )}
          </header>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
            {tela === 'inicio' && (
              <div className="flex flex-1 flex-col gap-4">
                <p className="text-2xl font-bold leading-tight">
                  Bom turno! <span className="text-saude">1 minuto</span> para você.
                </p>
                <button
                  onClick={() => setTela('pulso')}
                  className="flex items-center gap-4 rounded-2xl bg-saude p-5 text-left text-navy shadow-lg transition active:scale-[0.98]"
                >
                  <MessageCircleHeart className="size-10 shrink-0" />
                  <span>
                    <span className="block text-lg font-extrabold">Como você está hoje?</span>
                    <span className="block text-sm">3 toques · anônimo · sem crachá</span>
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
                  👥 <b className="text-white">{responderamHoje}</b> {responderamHoje === 1 ? 'colega' : 'colegas'} do {turno} já {responderamHoje === 1 ? 'respondeu' : 'responderam'} hoje.
                </p>
                <MetaTurno unidade={unidade} turno={turno} escuro />
                <p className="mt-auto flex items-center gap-1.5 text-[11px] text-blue-100/60">
                  <Lock className="size-3" /> Respostas sem nome. Sua empresa vê só o total da unidade.
                </p>
              </div>
            )}

            {tela === 'pulso' && passo >= 0 && (
              <div className="flex flex-1 flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-saude">
                  Pergunta {passo + 1} de {PERGUNTAS.length}
                </p>
                <p className="mt-2 text-2xl font-bold leading-tight">{PERGUNTAS[passo].titulo}</p>
                <div className="mt-6 grid gap-3">
                  {PERGUNTAS[passo].opcoes.map(([emoji, rotulo], i) => {
                    // Dor: "Nenhuma" = 1, "Forte" = 3. Energia/sono: "Baixa/Mal" = 1, "Boa/Bem" = 3.
                    const valor = (i + 1) as Resposta
                    return (
                      <button
                        key={rotulo}
                        onClick={() => responder(PERGUNTAS[passo].chave, valor)}
                        className="flex items-center gap-4 rounded-2xl bg-white p-4 text-left text-navy shadow transition hover:ring-4 hover:ring-saude/50 active:scale-[0.98]"
                      >
                        <span className="text-4xl">{emoji}</span>
                        <span className="text-xl font-bold">{rotulo}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-auto pt-4 text-[11px] text-blue-100/60">Anônimo: não pedimos crachá nem nome.</p>
              </div>
            )}

            {tela === 'obrigado' && <Obrigado r={respostas} unidade={unidade} turno={turno} restante={restante} />}

            {tela === 'cracha' && (
              <div className="flex flex-1 flex-col">
                <div className="grid place-items-center rounded-2xl bg-white/5 py-6 ring-1 ring-dashed ring-white/30">
                  <IdCard className="size-14 text-saude" />
                  <p className="mt-2 text-lg font-bold">Aproxime seu crachá</p>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-blue-100/60">Simulação do crachá (demo)</p>
                <div className="mt-2 grid gap-2">
                  {trabalhadores
                    .filter((x) => x.unidade === unidade)
                    .map((x) => (
                      <button
                        key={x.id}
                        onClick={() => {
                          setPessoa(x.id)
                          setTela('meu')
                        }}
                        className="rounded-xl bg-white/10 px-4 py-2.5 text-left text-sm font-medium hover:bg-white/15"
                      >
                        Crachá de {x.nome}
                      </button>
                    ))}
                  {trabalhadores.filter((x) => x.unidade === unidade).length === 0 && (
                    <p className="text-sm text-blue-100/70">Nenhum trabalhador desta unidade nos dados fictícios.</p>
                  )}
                </div>
              </div>
            )}

            {tela === 'meu' && t && <MeuCuidado t={t} restante={restante} sair={sair} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Obrigado({ r, unidade, turno, restante }: { r: Partial<Record<'energia' | 'dor' | 'sono', Resposta>>; unidade: string; turno: string; restante: number }) {
  const dicas: { titulo: string; texto: string }[] = []
  if (r.dor === 3)
    dicas.push({ titulo: 'Alongamento de 2 minutos', texto: 'Ombros para trás 10x, braços acima da cabeça por 20 s, gire o tronco devagar para cada lado. Pare se doer.' })
  if (r.sono === 1) dicas.push({ titulo: 'Sono depois do turno', texto: 'Quarto escuro, celular longe 30 min antes de deitar e o mesmo horário todo dia ajudam.' })
  if (r.energia === 1) dicas.push({ titulo: 'Energia no turno', texto: 'Um copo de água agora e uma pausa curta de pé, olhando para longe, já fazem diferença.' })
  if (dicas.length === 0) dicas.push({ titulo: 'Que bom!', texto: 'Continue assim. Beber água ao longo do turno mantém a energia.' })

  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-3xl font-bold">Obrigado! 💚</p>
      <p className="text-sm text-blue-100">Sua resposta entra só no total do {turno} da {unidade}.</p>
      {dicas.map((d) => (
        <div key={d.titulo} className="rounded-2xl bg-white p-4 text-navy">
          <p className="font-bold">{d.titulo}</p>
          <p className="mt-1 text-sm text-slate-600">{d.texto}</p>
        </div>
      ))}
      {r.dor === 3 && (
        <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
          <QrFalso tamanho={88} semente="enfermagem" />
          <p className="text-sm">
            <b>A dor continua?</b> Fale com a enfermagem pelo seu celular. É privado: escaneie o código.
          </p>
        </div>
      )}
      <p className="mt-auto text-center text-xs text-blue-100/60">Voltando ao início em {Math.max(0, restante)} s</p>
    </div>
  )
}

/** Tela pessoal no totem: só data e hora, nunca o que é o atendimento. Passos só em número. */
function MeuCuidado({ t, restante, sair }: { t: Trabalhador; restante: number; sair: () => void }) {
  const { adapter } = useDados()
  const [remarcar, setRemarcar] = useState(false)
  const c = t.consulta && t.consulta.status !== 'faltou' ? t.consulta : null
  const feitos = t.plano.filter((p) => p.feito).length

  return (
    <div className="flex flex-1 flex-col gap-4">
      <p className="text-2xl font-bold">Olá, {primeiroNome(t.nome)}!</p>

      <div className="rounded-2xl bg-white p-4 text-navy">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Próximo retorno</p>
        {c ? (
          <>
            <p className="mt-1 text-xl font-bold capitalize">{diaSemana(c.data)}</p>
            <p className="text-sm text-slate-600">
              às {horaCurta(c.data)} · {c.modalidade === 'online' ? 'por vídeo' : c.modalidade === 'no_turno' ? 'no turno, 20 min' : c.local}
            </p>
            {c.status === 'confirmada' ? (
              <p className="mt-2 text-sm font-semibold text-saude-700">✓ Confirmado</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => adapter.confirmarConsulta(t.id)} className="rounded-xl bg-navy py-3 font-semibold text-white">
                  Confirmar
                </button>
                <button onClick={() => setRemarcar(true)} className="rounded-xl border border-slate-200 py-3 font-semibold">
                  Remarcar
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Você ainda não tem retorno marcado.</p>
            <button onClick={() => setRemarcar(true)} className="mt-3 w-full rounded-xl bg-navy py-3 font-semibold text-white">
              Escolher horário
            </button>
          </>
        )}
        {remarcar && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-cinza p-3">
            <QrFalso tamanho={80} semente={t.id} />
            <p className="text-xs text-slate-600">Escaneie para escolher o horário no seu celular, com calma e em particular.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="text-2xl font-bold">
            {feitos}/{t.plano.length}
          </p>
          <p className="text-xs text-blue-100">passos do plano feitos</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3">
          <p className="flex items-center gap-1 text-2xl font-bold">
            <Flame className="size-5 text-orange-400" /> {t.semanasSeguidas}
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
