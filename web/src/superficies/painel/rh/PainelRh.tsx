import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarCheck,
  FileCheck2,
  Lightbulb,
  Lock,
  MessagesSquare,
  Moon,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import type { ItemContado, LocalDor, PainelDaEmpresa } from '../../../api/tipos'
import { useRecurso } from '../../../api/useRecurso'
import { Cartao } from '../../../componentes/Cartao'
import { MapaDeCalor } from '../../totem/BonecoDaDor'

// Visão de RH e Direção: SÓ agregados e anônimos. A API já omite grupos pequenos; nenhum dado individual chega aqui.
// Não usar "adesão" para uso do canal: adesão é verificada pela equipe de saúde.

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const numero = (n: number) => n.toLocaleString('pt-BR')

export function PainelRh() {
  const [unidade, setUnidade] = useState<string>('todas')
  const { dados: p, erro } = useRecurso<PainelDaEmpresa>(`/rh/painel?unidade=${encodeURIComponent(unidade)}`, '/rh/eventos')

  if (!p) return <p className="p-6 text-sm text-slate-500">{erro ? `Não foi possível carregar os indicadores: ${erro}` : 'Carregando os indicadores…'}</p>

  const unidadesFiltro = unidade === 'todas' ? p.unidades : p.unidades.filter((u) => u.unidade === unidade)
  // Leituras do pulso que sugerem ação sobre as condições de trabalho, não sobre pessoas.
  const alertas = p.turnos.flatMap((x) => x.alertas.map((a) => ({ onde: `${x.turno}${unidade === 'todas' ? ` · ${x.unidade}` : ''}`, texto: a })))
  const dor = Object.fromEntries(p.locaisDeDor.map((i) => [i.codigo, i.vezes])) as Partial<Record<LocalDor, number>>

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-tech">RH e Direção</p>
          <h2 className="truncate text-xl font-bold tracking-tight text-navy sm:text-2xl">{p.empresa}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="size-3.5" /> Só números agregados e anônimos · grupos com menos de {p.minimoDoGrupo} pessoas não aparecem
          </p>
        </div>
        <div className="flex max-w-full overflow-x-auto rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-slate-200" role="tablist" aria-label="Unidade">
          {['todas', ...p.unidades.map((u) => u.unidade)].map((u) => (
            <button
              key={u}
              role="tab"
              aria-selected={unidade === u}
              onClick={() => setUnidade(u)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 transition ${unidade === u ? 'bg-navy text-white shadow' : 'text-slate-600 hover:text-navy'}`}
            >
              {u === 'todas' ? 'Todas as unidades' : u}
            </button>
          ))}
        </div>
      </div>

      {/* Números principais */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Numero Icone={Building2} cor="bg-tech" rotulo="Vidas no programa" valor={numero(p.vidas)} detalhe={`${unidadesFiltro.length} unidade(s) da empresa`} />
        <Numero Icone={CalendarCheck} cor="bg-saude" rotulo="Comparecimento aos retornos" valor={`${p.comparecimentoAgora}%`} detalhe="simulação de piloto">
          <AntesEDepois antes={p.comparecimentoAntes} depois={p.comparecimentoAgora} />
        </Numero>
        <Numero Icone={FileCheck2} cor="bg-orange-500" rotulo="Planos de cuidado recebidos" valor={`${p.planosRecebidos}%`} detalhe="abriram o plano enviado">
          <Barra valor={p.planosRecebidos} cor="bg-orange-500" />
        </Numero>
        <Numero Icone={MessagesSquare} cor="bg-fuchsia-600" rotulo="Respostas no totem" valor={numero(p.pulso.respostas)} detalhe="últimas 4 semanas · anônimas">
          <MiniBarras valores={p.semanas.map((s) => s.respostas)} />
        </Numero>
      </div>

      {/* Como as pessoas chegam ao trabalho */}
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Cartao titulo="Como as pessoas estão chegando" subtitulo={`Pulso do totem · ${unidade === 'todas' ? 'todas as unidades' : unidade} · últimas 4 semanas`}>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Anel valor={p.pulso.cansados} cor="#f59e0b" rotulo="chegam cansados" />
            <Anel valor={p.pulso.maisOuMenos} cor="#0ea5e9" rotulo="mais ou menos" />
            <Anel valor={p.pulso.comDor} cor="#ef4444" rotulo="sentem dor" />
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-slate-500">Respostas por semana</p>
            <Semanas semanas={p.semanas} />
          </div>
        </Cartao>

        <Cartao titulo="O que vale olhar" subtitulo="Sinais por turno · sobre condições de trabalho, nunca sobre pessoas" acao={<Lightbulb className="size-5 text-amber-500" />}>
          {alertas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum turno com sinal de atenção agora. 👏</p>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a) => (
                <li key={`${a.onde}-${a.texto}`} className="flex gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-amber-600 shadow-sm">
                    {a.texto.toLowerCase().includes('cansad') ? <Moon className="size-4" /> : <Activity className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-900">{a.onde}</p>
                    <p className="text-xs leading-snug text-amber-900/90">{a.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      {/* Dor e especialidades */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Onde mais dói" subtitulo="Local tocado no boneco do totem · últimos 28 dias · anônimo" acao={<Activity className="size-5 text-orange-500" />}>
          {p.locaisDeDor.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Ainda sem relatos suficientes para mostrar.</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
              <MapaDeCalor valores={dor} className="mx-auto h-56 w-auto sm:h-64" />
              <Ranking itens={p.locaisDeDor} cor="bg-orange-500" unidade="relatos" />
            </div>
          )}
        </Cartao>
        <Cartao titulo="Especialidades mais procuradas" subtitulo="Consultas por especialidade · últimos 30 dias · agregado, sem nomes" acao={<Stethoscope className="size-5 text-tech" />}>
          {p.especialidades.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Ainda sem consultas suficientes para mostrar.</p>
          ) : (
            <Ranking itens={p.especialidades} cor="bg-tech" unidade="consultas" />
          )}
        </Cartao>
      </div>

      {/* Acompanhamento */}
      <Cartao titulo="Acompanhamento do cuidado" subtitulo="Quantas pessoas avançaram em cada etapa · últimos 30 dias">
        <div className="space-y-5">
          {unidadesFiltro.map((u) => {
            const etapas = [
              ['Respondeu o WhatsApp', u.funil.whatsapp],
              ['Fez os exames', u.funil.exame],
              ['Foi à consulta', u.funil.consulta],
              ['Reavaliação', u.funil.reavaliacao],
            ] as const
            return (
              <div key={u.unidade}>
                {unidade === 'todas' && <p className="mb-2 text-sm font-semibold text-navy">{u.unidade}</p>}
                <ol className="grid gap-2 sm:grid-cols-4">
                  {etapas.map(([rotulo, valor], i) => (
                    <li key={rotulo} className="relative rounded-xl bg-cinza p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {i + 1}. {rotulo}
                      </p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-navy">{numero(valor)}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-tech" style={{ width: `${pct(valor, u.funil.whatsapp)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {i === 0 ? 'ponto de partida' : `${pct(valor, etapas[i - 1][1])}% da etapa anterior`}
                      </p>
                      {i < etapas.length - 1 && (
                        <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-white p-0.5 text-slate-400 shadow sm:block" />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>
      </Cartao>
    </div>
  )
}

function Numero({ Icone, cor, rotulo, valor, detalhe, children }: { Icone: LucideIcon; cor: string; rotulo: string; valor: string; detalhe: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm ${cor}`}>
          <Icone className="size-5" />
        </span>
        <p className="text-sm font-medium leading-tight text-slate-600">{rotulo}</p>
      </div>
      <p className="mt-3 text-3xl font-bold leading-none tabular-nums text-navy">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.min(100, valor)}%` }} />
    </div>
  )
}

/** Antes e depois lado a lado, com a diferença em pontos percentuais. */
function AntesEDepois({ antes, depois }: { antes: number; depois: number }) {
  return (
    <div className="space-y-1.5 text-[11px] text-slate-500">
      <div className="flex items-center gap-2">
        <span className="w-12">Antes</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-300" style={{ width: `${antes}%` }} />
        </div>
        <span className="w-8 text-right tabular-nums">{antes}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12">Piloto</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-saude" style={{ width: `${depois}%` }} />
        </div>
        <span className="w-8 text-right font-semibold tabular-nums text-saude-700">+{depois - antes}</span>
      </div>
    </div>
  )
}

function MiniBarras({ valores }: { valores: number[] }) {
  const maior = Math.max(1, ...valores)
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden>
      {valores.map((v, i) => (
        <div key={i} className="flex-1 rounded-t bg-fuchsia-500/80" style={{ height: `${Math.max(8, (v / maior) * 100)}%`, opacity: 0.45 + (0.55 * (i + 1)) / valores.length }} />
      ))}
    </div>
  )
}

/** Anel de porcentagem. */
function Anel({ valor, cor, rotulo }: { valor: number; cor: string; rotulo: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center rounded-xl bg-cinza px-1 py-3 text-center">
      <svg viewBox="0 0 80 80" className="size-20 sm:size-24" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={cor} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(valor / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
        <text x="40" y="45" textAnchor="middle" fontSize="17" fontWeight="700" fill="#071f5f">
          {valor}%
        </text>
      </svg>
      <p className="mt-1 text-xs font-medium leading-tight text-slate-600">{rotulo}</p>
    </div>
  )
}

function Semanas({ semanas }: { semanas: { rotulo: string; respostas: number }[] }) {
  const maior = Math.max(1, ...semanas.map((s) => s.respostas))
  return (
    <div className="flex h-32 items-end gap-2 sm:gap-3">
      {semanas.map((s, i) => (
        <div key={s.rotulo} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold tabular-nums text-navy">{numero(s.respostas)}</span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-tech to-sky-400"
            style={{ height: `${(s.respostas / maior) * 75}%`, opacity: 0.55 + (0.45 * (i + 1)) / semanas.length }}
          />
          <span className="text-[10px] text-slate-400">{s.rotulo}</span>
        </div>
      ))}
    </div>
  )
}

/** Os 5 primeiros, do mais citado ao menos citado. A API já tira os itens com menos de 5 ocorrências. */
function Ranking({ itens, cor, unidade }: { itens: ItemContado[]; cor: string; unidade: string }) {
  const maior = Math.max(1, ...itens.map((i) => i.vezes))
  return (
    <ol className="space-y-3">
      {itens.map((item, posicao) => (
        <li key={item.codigo} className="flex items-center gap-3 text-sm">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cinza text-xs font-bold text-navy">{posicao + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 font-medium leading-snug text-slate-800">{item.rotulo}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                <b className="text-navy">{numero(item.vezes)}</b> {unidade}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${cor}`} style={{ width: `${(item.vezes / maior) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
