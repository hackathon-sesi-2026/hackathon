import type { CategoriaPasso, Horario, Modalidade, Risco, StatusPlano, Trabalhador, Turno } from '../data/types'
import { addDias, diasEntre, emDias, inicioDoDia } from '../lib/datas'

/** Prazo de retorno por classe de risco (Fluxo do processo da APS). Risco 4 é critério médico; usamos 30 dias na demo. */
export const PRAZO_DIAS: Record<Risco, number> = { 1: 180, 2: 180, 3: 90, 4: 30 }

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

export const ROTULO_CATEGORIA: Record<CategoriaPasso, string> = {
  exames: 'Exames',
  nutricao: 'Nutrição',
  atividade: 'Atividade física',
  vacina: 'Vacinação',
  psicologia: 'Psicologia',
  remedio: 'Medicação',
  retorno: 'Retorno',
  habitos: 'Hábitos',
}

export const TURNOS: Turno[] = [
  { nome: 'Turno A', inicio: 6, fim: 14 },
  { nome: 'Turno B', inicio: 14, fim: 22 },
  { nome: 'Turno C (noite)', inicio: 22, fim: 6 },
  { nome: 'Administrativo', inicio: 8, fim: 17 },
]

export type CodigoSituacao =
  | 'pediu_ajuda'
  | 'faltou'
  | 'remarcar'
  | 'fora_do_prazo'
  | 'plano_nao_recebido'
  | 'sem_resposta'
  | 'vence_logo'
  | 'em_contato'
  | 'em_dia'

export interface Situacao {
  codigo: CodigoSituacao
  rotulo: string
  detalhe: string
  /** Menor = mais urgente. */
  prioridade: number
  /** Precisa de ação da enfermeira? */
  precisaAcao: boolean
  /** Próxima ação sugerida à enfermeira. */
  sugestao: string
}

export const ROTULO_SITUACAO: Record<CodigoSituacao, string> = {
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

export function prazoRetorno(t: Trabalhador): Date {
  return addDias(new Date(t.ultimaConsultaMedica), PRAZO_DIAS[t.risco])
}

/** Situação do trabalhador para a lista da enfermeira. Usa só dados de participação, nada clínico. */
export function situacao(t: Trabalhador, hoje = new Date()): Situacao {
  const prazo = prazoRetorno(t)
  const diasParaPrazo = diasEntre(hoje, prazo)
  const consultaFutura = !!t.consulta && new Date(t.consulta.data) >= inicioDoDia(hoje) && t.consulta.status !== 'faltou'
  const contatoRecente = t.ultimoContatoEnfermagem !== null && diasEntre(t.ultimoContatoEnfermagem, hoje) <= 7

  const s = (codigo: CodigoSituacao, prioridade: number, detalhe: string, sugestao: string, precisaAcao = true): Situacao => ({
    codigo,
    rotulo: ROTULO_SITUACAO[codigo],
    detalhe,
    prioridade,
    precisaAcao,
    sugestao,
  })

  if (t.pediuContato) return s('pediu_ajuda', 0, 'Pediu para falar com a enfermeira no check-in', 'Ligar ou responder no WhatsApp em até 2 dias úteis')
  if (t.consulta?.status === 'remarcar') return s('remarcar', 1, 'Não pode ir na data marcada', 'Aguardar a escolha pelo link ou oferecer horário')
  if (t.consulta?.status === 'faltou' && !contatoRecente)
    return s('faltou', 1, `Faltou ao retorno há ${diasEntre(t.consulta.data, hoje)} dia(s)`, 'Entrar em contato e reagendar')
  if (!consultaFutura && diasParaPrazo < 0 && !contatoRecente)
    return s('fora_do_prazo', 2, `${-diasParaPrazo} dia(s) além do prazo do risco`, 'Convocar para retorno (enviar lembrete)')

  if (t.statusPlano === 'enviado' && t.dataEnvioPlano && diasEntre(t.dataEnvioPlano, hoje) >= 3)
    return s('plano_nao_recebido', 3, `Plano enviado há ${diasEntre(t.dataEnvioPlano, hoje)} dias e ainda não aberto`, 'Reenviar o plano ou confirmar o número')
  if (t.statusPlano === 'nao_enviado') return s('plano_nao_recebido', 3, 'Plano de cuidado ainda não enviado', 'Enviar o plano pelo WhatsApp')

  if (consultaFutura && t.consulta!.status === 'agendada') {
    const ultimoLembrete = [...t.eventos].reverse().find((e) => e.tipo === 'lembrete')
    if (ultimoLembrete && diasEntre(ultimoLembrete.data, hoje) >= 3)
      return s('sem_resposta', 3, `Lembrete enviado há ${diasEntre(ultimoLembrete.data, hoje)} dias, sem resposta`, 'Tentar contato por telefone')
  }

  if (contatoRecente) return s('em_contato', 5, 'Enfermagem fez contato nos últimos 7 dias', 'Aguardar retorno do trabalhador', false)
  if (!consultaFutura && diasParaPrazo <= 15)
    return s('vence_logo', 4, `Prazo vence em ${diasParaPrazo} dia(s), sem retorno marcado`, 'Enviar lembrete para agendar')

  return s(
    'em_dia',
    6,
    consultaFutura ? `Retorno ${t.consulta!.status === 'confirmada' ? 'confirmado' : 'agendado'}` : `Próximo retorno em até ${diasParaPrazo} dia(s)`,
    'Nenhuma ação agora',
    false,
  )
}

function horaNoTurno(h: number, turno: Turno): boolean {
  if (turno.inicio < turno.fim) return h >= turno.inicio && h < turno.fim
  return h >= turno.inicio || h < turno.fim // turno noturno
}

/** Pseudoaleatório determinístico, para a agenda fictícia parecer real sem mudar a cada render. */
function ocupado(dia: number, hora: number, semente: string): boolean {
  let x = dia * 31 + hora * 17
  for (const c of semente) x = (x * 33 + c.charCodeAt(0)) % 9973
  return x % 3 === 0
}

/**
 * Horários livres da APS que não batem com o turno informado pelo trabalhador.
 * Inclui atendimento online (já previsto na ficha Gestão do Cuidado), que evita ficar na empresa depois do turno.
 */
export function gerarHorarios(t: Trabalhador, hoje = new Date(), quantidade = 12): Horario[] {
  const candidatos: { h: number; modalidade: Modalidade }[] = [
    ...[7, 8, 9, 10, 11, 13, 14, 15, 16, 17].map((h) => ({ h, modalidade: 'presencial' as const })),
    ...[12, 18, 19].map((h) => ({ h, modalidade: 'online' as const })),
  ].sort((a, b) => a.h - b.h)

  const resultado: Horario[] = []
  for (let d = 1; d <= 21 && resultado.length < quantidade; d++) {
    const dia = addDias(inicioDoDia(hoje), d)
    const semana = dia.getDay()
    if (semana === 0) continue // domingo fechado
    for (const { h, modalidade } of candidatos) {
      if (semana === 6 && h > 11) continue // sábado só manhã
      if (horaNoTurno(h, t.turno) || horaNoTurno(h + 0.99, t.turno)) continue
      if (ocupado(d, h + (modalidade === 'online' ? 50 : 0), t.id)) continue

      let dica: string | undefined
      if (modalidade === 'online') dica = 'por vídeo, de casa'
      else if (h === t.turno.fim) dica = 'logo após o turno'
      else if (h + 1 === t.turno.inicio) dica = 'antes do turno'
      else if (semana === 6) dica = 'sábado'

      resultado.push({
        inicio: emDias(hoje, d, h),
        modalidade,
        local: modalidade === 'online' ? 'Teleatendimento' : semana === 6 || h < 8 ? 'Unidade SESI Centro' : 'Ambulatório SESI na empresa',
        dica,
      })
      if (resultado.length >= quantidade) break
    }
  }
  return resultado
}

export function primeiroNome(nome: string): string {
  return nome.split(' ')[0]
}

export function iniciais(nome: string): string {
  const p = nome.split(' ').filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase()
}
