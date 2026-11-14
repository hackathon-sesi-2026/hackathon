import type { CategoriaPasso, Dificuldade, Horario, Modalidade, MotivoDificuldade, Risco, StatusPlano, Trabalhador, Turno } from '../data/types'
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

// ---------------------------------------------------------------- "Não consegui": motivos e ação sugerida

export const MOTIVOS: { motivo: MotivoDificuldade; rotulo: string; emoji: string }[] = [
  { motivo: 'tempo', rotulo: 'Não tive tempo / bate com o turno', emoji: '⏰' },
  { motivo: 'transporte', rotulo: 'Transporte / perderia o fretado', emoji: '🚌' },
  { motivo: 'nao_entendi', rotulo: 'Não entendi o que fazer', emoji: '❓' },
  { motivo: 'remedio', rotulo: 'O remédio me fez mal', emoji: '💊' },
  { motivo: 'dinheiro', rotulo: 'Custa caro para mim', emoji: '💸' },
  { motivo: 'outro', rotulo: 'Outro motivo', emoji: '💬' },
]

export const ROTULO_MOTIVO = Object.fromEntries(MOTIVOS.map((m) => [m.motivo, m.rotulo])) as Record<MotivoDificuldade, string>

/** O que a enfermeira pode fazer para cada motivo: agir na causa, não só lembrar de novo. */
export const ACAO_POR_MOTIVO: Record<MotivoDificuldade, string> = {
  tempo: 'Oferecer horário por vídeo ou colado ao turno',
  transporte: 'Oferecer teleatendimento ou horário antes do fretado',
  nao_entendi: 'Ligar e explicar o plano (pedir para a pessoa repetir com as palavras dela)',
  remedio: 'Levar ao médico de referência para avaliar a medicação',
  dinheiro: 'Orientar Farmácia Popular / alternativas sem custo',
  outro: 'Ligar para entender o que aconteceu',
}

/** Resposta automática ao trabalhador, sem dado clínico. */
export const RESPOSTA_MOTIVO: Record<MotivoDificuldade, string> = {
  tempo: 'Obrigado por contar! Dá para fazer por vídeo ou num horário fora do seu turno. A enfermeira também vai te procurar.',
  transporte: 'Entendi. Tem opção por vídeo, de casa, sem perder o fretado. A enfermeira vai combinar com você.',
  nao_entendi: 'Sem problema, é normal ter dúvida. A enfermeira vai te ligar para explicar com calma.',
  remedio: 'Obrigado por avisar. Não pare por conta própria: a equipe vai falar com você ainda hoje.',
  dinheiro: 'Obrigado por contar. A enfermeira vai te mostrar opções sem custo.',
  outro: 'Obrigado por contar. A enfermeira vai entrar em contato para entender e ajudar.',
}

export const dificuldadesAbertas = (t: Trabalhador): Dificuldade[] => t.dificuldades.filter((d) => !d.resolvida)

// ---------------------------------------------------------------- Radar de risco de falta (regras explicáveis, sem IA)

export type NivelRiscoFalta = 'alto' | 'medio' | 'baixo'

export interface RiscoFalta {
  pontos: number
  nivel: NivelRiscoFalta
  motivos: string[]
}

/**
 * Pontuação simples e auditável de quem tende a sair do cuidado.
 * Evidência: modelo de risco + contato humano dirigido reduz faltas (Oikonomidi et al., JAMIA 2023).
 * Pesos são hipótese do time, a calibrar com os dados históricos do S+ no piloto.
 */
export function riscoFalta(t: Trabalhador, hoje = new Date()): RiscoFalta {
  const fatores: [boolean, number, string][] = [
    [t.faltasUltimoAno >= 2, 30, `${t.faltasUltimoAno} faltas no último ano`],
    [t.faltasUltimoAno === 1, 15, '1 falta no último ano'],
    [t.consulta?.status === 'faltou', 15, 'faltou ao último retorno'],
    [dificuldadesAbertas(t).some((d) => d.motivo === 'tempo' || d.motivo === 'transporte'), 20, 'relatou falta de tempo ou transporte'],
    [dificuldadesAbertas(t).some((d) => d.motivo !== 'tempo' && d.motivo !== 'transporte'), 10, 'tem dificuldade aberta no plano'],
    [t.teachBack === 'errou', 10, 'pode não ter entendido o plano'],
    [t.statusPlano !== 'recebido', 10, 'não abriu o plano de cuidado'],
    [ultimoLembreteSemResposta(t, hoje), 15, 'lembrete sem resposta há 3+ dias'],
    [t.consulta?.status === 'agendada', 5, 'retorno ainda não confirmado'],
    [t.turno.inicio > t.turno.fim, 10, 'trabalha no turno da noite'],
    [diasEntre(hoje, prazoRetorno(t)) < 0 && !t.consulta, 10, 'prazo do risco vencido'],
  ]
  const ativos = fatores.filter(([cond]) => cond)
  const pontos = Math.min(100, ativos.reduce((s, [, p]) => s + p, 0))
  return { pontos, nivel: pontos >= 45 ? 'alto' : pontos >= 25 ? 'medio' : 'baixo', motivos: ativos.map(([, , m]) => m) }
}

function ultimoLembreteSemResposta(t: Trabalhador, hoje: Date): boolean {
  const ultimoLembrete = [...t.eventos].reverse().find((e) => e.tipo === 'lembrete')
  if (!ultimoLembrete) return false
  const respondeuDepois = t.eventos.some(
    (e) => e.data > ultimoLembrete.data && ['confirmou', 'pediu_remarcar', 'agendou', 'checkin_ok', 'checkin_ajuda', 'dificuldade'].includes(e.tipo),
  )
  return !respondeuDepois && diasEntre(ultimoLembrete.data, hoje) >= 3
}

export type CodigoSituacao =
  | 'dificuldade'
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

  const abertas = dificuldadesAbertas(t)
  if (abertas.length > 0) {
    const d = abertas[abertas.length - 1]
    const passo = d.passoId ? t.plano.find((p) => p.id === d.passoId)?.titulo : undefined
    return s('dificuldade', 0, `${ROTULO_MOTIVO[d.motivo]}${passo ? ` · ${passo}` : ''}`, ACAO_POR_MOTIVO[d.motivo])
  }
  if (t.pediuContato) return s('pediu_ajuda', 0, 'Pediu para falar com a enfermeira no check-in', 'Ligar ou responder no WhatsApp em até 2 dias úteis')
  if (t.consulta?.status === 'remarcar') return s('remarcar', 1, 'Não pode ir na data marcada', 'Aguardar a escolha pelo link ou oferecer horário')
  if (t.consulta?.status === 'faltou' && !contatoRecente)
    return s('faltou', 1, `Faltou ao retorno há ${diasEntre(t.consulta.data, hoje)} dia(s)`, 'Entrar em contato e reagendar')
  if (!consultaFutura && diasParaPrazo < 0 && !contatoRecente)
    return s('fora_do_prazo', 2, `${-diasParaPrazo} dia(s) além do prazo do risco`, 'Convocar para retorno (enviar lembrete)')

  if (t.statusPlano === 'enviado' && t.dataEnvioPlano && diasEntre(t.dataEnvioPlano, hoje) >= 3)
    return s('plano_nao_recebido', 3, `Plano enviado há ${diasEntre(t.dataEnvioPlano, hoje)} dias e ainda não aberto`, 'Reenviar o plano ou confirmar o número')
  if (t.statusPlano === 'nao_enviado') return s('plano_nao_recebido', 3, 'Plano de cuidado ainda não enviado', 'Enviar o plano pelo WhatsApp')

  if (ultimoLembreteSemResposta(t, hoje)) return s('sem_resposta', 3, 'Lembrete sem resposta há 3 dias ou mais', 'Tentar contato por telefone')

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
export function gerarHorarios(t: Trabalhador, hoje = new Date(), quantidade = 15): Horario[] {
  const candidatos: { h: number; modalidade: Modalidade }[] = [
    ...[7, 8, 9, 10, 11, 13, 14, 15, 16, 17].map((h) => ({ h, modalidade: 'presencial' as const })),
    ...[12, 18, 19].map((h) => ({ h, modalidade: 'online' as const })),
  ].sort((a, b) => a.h - b.h)

  const resultado: Horario[] = []
  for (let d = 1; d <= 21 && resultado.length < quantidade; d++) {
    const dia = addDias(inicioDoDia(hoje), d)
    const semana = dia.getDay()
    if (semana === 0) continue // domingo fechado
    // Microconsulta de 20 min no ambulatório da empresa, DENTRO do turno, com liberação (dias úteis, turnos diurnos).
    if (semana !== 6 && t.turno.inicio < t.turno.fim && t.unidade !== 'Unidade única') {
      const h = t.turno.inicio + 2 + (d % 3)
      if (!ocupado(d, h + 99, t.id))
        resultado.push({ inicio: emDias(hoje, d, h, 30), modalidade: 'no_turno', duracaoMin: 20, local: 'Ambulatório SESI na empresa', dica: 'no turno · 20 min' })
    }
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
        duracaoMin: 30,
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
