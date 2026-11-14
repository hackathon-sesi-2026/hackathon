import type { Acao, Motivacao, Trabalhador } from '../data/types'
import { diaSemana, horaCurta } from '../lib/datas'
import { primeiroNome } from './regras'

// Regra de privacidade: nenhuma mensagem leva informação clínica (diagnóstico, exame, remédio).
// Gatilhos aplicados (contexto-projeto/pesquisa/gatilhos-mentais.md):
// 1 lembretes bem desenhados (D-3 e D-1) · 4 enquadramento de ganho · 5 plano se-então opcional
// 6 recompensa pequena e imediata (horário garantido) · reciprocidade (mensagem em nome da enfermeira).
// Evitamos medo, culpa, escassez falsa e urgência artificial.

export const ROTULO_ACAO: Record<Acao, string> = {
  confirmar: '✅ Confirmo',
  remarcar: '📅 Preciso remarcar',
  escolher_horario: '📅 Escolher horário',
  plano: '📋 Ver meu plano',
  checkin_ok: '👍 Tudo bem',
  checkin_ajuda: '🙋 Quero falar com a enfermeira',
  habito_sim: '✅ Consegui',
  habito_nao: '😕 Não consegui',
  se_turno: '🏭 Saio do turno e vou direto',
  se_folga: '🏠 Vou no meu dia de folga',
  se_so_lembrete: '🔔 Só me lembre',
}

/** Texto do plano se-então que a pessoa escolheu. */
export const COMPROMISSO: Partial<Record<Acao, string>> = {
  se_turno: 'sair do turno e ir direto',
  se_folga: 'ir no dia de folga',
}

/** Enquadramento de ganho ligado ao que a própria pessoa disse que importa. */
const GANHO: Record<Motivacao, string> = {
  familia: 'estar bem para a sua família',
  energia: 'ter mais energia no dia a dia',
  menos_dor: 'sentir menos dor no corpo',
  sono: 'dormir melhor',
}

export const ganhoDe = (t: Trabalhador) => (t.motivacao ? GANHO[t.motivacao] : 'se manter bem para o que importa')

/** Apresentação humana: a mensagem vem da enfermeira de referência, não de "um sistema". */
const ola = (t: Trabalhador) => `Olá, ${primeiroNome(t.nome)}! Aqui é a ${t.enfermeira}, sua enfermeira no SESI.`

function ondeConsulta(t: Trabalhador): string {
  const c = t.consulta!
  return c.modalidade === 'online' ? 'por vídeo' : c.modalidade === 'no_turno' ? `no ${c.local}, dentro do turno` : `no ${c.local}`
}

export function textoLembrete(t: Trabalhador): { texto: string; acoes: Acao[] } {
  if (t.consulta && t.consulta.status !== 'faltou') {
    return {
      texto: `${ola(t)} Seu retorno está marcado para ${diaSemana(t.consulta.data)}, às ${horaCurta(t.consulta.data)}, ${ondeConsulta(
        t,
      )}. Ele ajuda você a ${ganhoDe(t)}. Você consegue ir?\n\nSe não puder, remarque aqui: assim a vaga fica livre para um colega.`,
      acoes: ['confirmar', 'remarcar', 'plano'],
    }
  }
  return {
    texto: `${ola(t)} Está na hora do seu retorno, para você ${ganhoDe(t)}. Vamos escolher um horário que caiba no seu turno? Tem opção por vídeo também.`,
    acoes: ['escolher_horario', 'plano'],
  }
}

/** Lembretes automáticos: 3 dias antes e 1 dia antes (mais de um lembrete supera um só). */
export function textoLembreteAuto(t: Trabalhador, qual: 'D-3' | 'D-1'): { texto: string; acoes: Acao[] } {
  const c = t.consulta!
  const quando = qual === 'D-1' ? 'Amanhã' : `Na ${diaSemana(c.data)}`
  const compromisso = c.compromisso ? ` Você combinou: ${c.compromisso}. 💪` : ''
  const acoes: Acao[] = c.status === 'confirmada' ? ['remarcar', 'plano'] : ['confirmar', 'remarcar']
  return {
    texto: `${ola(t)} ${quando}, às ${horaCurta(c.data)}, é o seu retorno ${ondeConsulta(t)}.${compromisso}${
      c.status === 'confirmada' ? ' Seu horário está garantido, sem fila.' : ' Confirma para garantir seu horário sem fila?'
    }`,
    acoes,
  }
}

/** Depois de confirmar: recompensa imediata (horário garantido) + convite opcional para o plano se-então. */
export function textoConfirmado(t: Trabalhador): { texto: string; acoes: Acao[] } {
  const c = t.consulta!
  const perguntaSeEntao = c.modalidade === 'online' ? '' : '\n\nQuer combinar como vai? É opcional.'
  return {
    texto: `Combinado! ✅ Seu horário de ${diaSemana(c.data)}, às ${horaCurta(c.data)}, está garantido: você é atendido(a) na hora marcada, sem fila. Eu te lembro 3 dias antes e 1 dia antes.${perguntaSeEntao}`,
    acoes: c.modalidade === 'online' ? [] : ['se_turno', 'se_folga', 'se_so_lembrete'],
  }
}

export function textoPlano(t: Trabalhador): { texto: string; acoes: Acao[] } {
  return {
    texto: `${ola(t)} Seu plano de cuidado está pronto. São poucos passos, em linguagem simples, para você ${ganhoDe(t)}. Só você e a equipe de saúde veem.`,
    acoes: ['plano'],
  }
}

/** Check-in de micro-hábito sobre o próximo passo pendente do plano. Sem nome de exame ou remédio. */
export function textoCheckinHabito(t: Trabalhador): { texto: string; acoes: Acao[]; passoId?: string } | null {
  const indice = t.plano.findIndex((p) => !p.feito)
  if (indice < 0) return null
  const passo = t.plano[indice]
  return {
    // O título do passo pode ser sensível (ex.: psicóloga, remédio): no WhatsApp só o número; o detalhe fica na página.
    texto: `Oi, ${primeiroNome(t.nome)}! Aqui é a ${t.enfermeira}. Passando para saber do seu plano: esta semana você conseguiu fazer o passo ${indice + 1}? (Toque em "Ver meu plano" se quiser lembrar qual é.)`,
    acoes: ['habito_sim', 'habito_nao', 'plano'],
    passoId: passo.id,
  }
}

export function textoCheckin(t: Trabalhador): { texto: string; acoes: Acao[] } {
  return {
    texto: `Oi, ${primeiroNome(t.nome)}! Aqui é a ${t.enfermeira}. Passando para saber: como você está desde o último atendimento?`,
    acoes: ['checkin_ok', 'checkin_ajuda'],
  }
}

// ---------------------------------------------------------------- Selos (reconhecimento, sem ranking)

export interface Selo {
  semanas: number
  nome: string
  emoji: string
}

export const SELOS: Selo[] = [
  { semanas: 3, nome: 'Constância', emoji: '🏅' },
  { semanas: 6, nome: 'Cuidado em dia', emoji: '🏆' },
  { semanas: 12, nome: '3 meses se cuidando', emoji: '🌟' },
]

export const selosDe = (semanas: number) => SELOS.filter((s) => semanas >= s.semanas)
