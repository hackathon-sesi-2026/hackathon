// Textos de apresentação. As regras (situação, risco de falta, horários, mensagens) vivem na API.
import type { Acao, CodigoSituacao, MotivoDificuldade, Risco, StatusPlano } from '../api/tipos'

export const ROTULO_RISCO: Record<Risco, string> = {
  1: 'Risco 1 · Saudável',
  2: 'Risco 2 · Saudável com risco',
  3: 'Risco 3 · Compensado',
  4: 'Risco 4 · Descompensado',
}

export const FREQUENCIA_RISCO: Record<Risco, string> = {
  1: 'a cada 6 meses',
  2: 'a cada 6 meses',
  3: 'a cada 3 meses',
  4: 'a critério médico',
}

export const ROTULO_STATUS_PLANO: Record<StatusPlano, string> = {
  nao_enviado: 'Não enviado',
  enviado: 'Enviado, não recebido',
  recebido: 'Recebido',
}

export const ROTULO_SITUACAO: Record<CodigoSituacao, string> = {
  dificuldade: 'Relatou dificuldade',
  pediu_ajuda: 'Pediu contato',
  faltou: 'Faltou',
  remarcar: 'Pediu remarcação',
  fora_do_prazo: 'Fora do prazo',
  plano_nao_recebido: 'Plano não recebido',
  sem_resposta: 'Sem resposta',
  vence_logo: 'Prazo vence logo',
  em_contato: 'Em contato',
  em_dia: 'Em dia',
}

/** Motivos do "não consegui", na ordem em que aparecem para o trabalhador. */
export const MOTIVOS: { motivo: MotivoDificuldade; rotulo: string; emoji: string }[] = [
  { motivo: 'tempo', rotulo: 'Não tive tempo / bate com o turno', emoji: '⏰' },
  { motivo: 'transporte', rotulo: 'Transporte / perderia o fretado', emoji: '🚌' },
  { motivo: 'nao_entendi', rotulo: 'Não entendi o que fazer', emoji: '❓' },
  { motivo: 'remedio', rotulo: 'O remédio me fez mal', emoji: '💊' },
  { motivo: 'dinheiro', rotulo: 'Custa caro para mim', emoji: '💸' },
  { motivo: 'outro', rotulo: 'Outro motivo', emoji: '💬' },
]

export const ROTULO_MOTIVO = Object.fromEntries(MOTIVOS.map((m) => [m.motivo, m.rotulo])) as Record<MotivoDificuldade, string>

/** Botões de resposta da conversa. */
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

export function primeiroNome(nome: string): string {
  return nome.split(' ')[0]
}

export function iniciais(nome: string): string {
  const partes = nome.split(' ').filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase()
}
