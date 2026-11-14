import type { Acao, Horario, Liberacao, Monitoramento, Motivacao, MotivoDificuldade, Pulso, Trabalhador, Turno } from './types'

/**
 * Interface única de dados. O núcleo da solução só conhece esta interface.
 * Hoje: adaptador simulado (dados fictícios). Depois: adaptador S+ e, se confirmado, Klingo.
 * Trocar a implementação não altera as telas.
 */
export interface DataAdapter {
  /** Nome exibido na interface, para deixar claro de onde vêm os dados. */
  readonly nome: string

  listarTrabalhadores(): Promise<Trabalhador[]>
  /** Respostas anônimas do totem (sem identificação). */
  listarPulsos(): Promise<Pulso[]>
  /** Compromissos no turno que precisam de liberação (visão da liderança). */
  listarLiberacoes(): Promise<Liberacao[]>

  // Totem (público, anônimo)
  registrarPulso(p: Omit<Pulso, 'id' | 'data'>): Promise<void>

  // Ações do trabalhador (canal WhatsApp + página leve)
  confirmarConsulta(id: string): Promise<void>
  pedirRemarcacao(id: string): Promise<void>
  listarHorarios(id: string): Promise<Horario[]>
  /** nomeParaLideranca: só vale para horário no turno; a liderança nunca vê o motivo. */
  agendar(id: string, horario: Horario, nomeParaLideranca?: boolean): Promise<void>
  definirMotivacao(id: string, m: Motivacao): Promise<void>
  /** Plano se-então opcional depois de confirmar (ex.: "saio do turno e vou direto"). */
  escolherCompromisso(id: string, acao: Acao): Promise<void>
  /** O trabalhador abriu "Meus exames" (some o aviso de resultado novo). */
  verResultados(id: string): Promise<void>
  /** Laboratório/S+ libera o resultado. Na demo, a enfermeira simula pelo painel. */
  liberarResultado(id: string, exameId: string): Promise<void>
  /** Demo: dispara o lembrete automático D-3 ou D-1 (no produto, um agendador faz isso sozinho). */
  simularLembreteAuto(id: string, qual: 'D-3' | 'D-1'): Promise<void>
  atualizarTurno(id: string, turno: Turno): Promise<void>
  abrirPlano(id: string): Promise<void>
  marcarPasso(id: string, passoId: string, feito: boolean): Promise<void>
  responderCheckin(id: string, tudoBem: boolean): Promise<void>
  /** Check-in de hábito: "conseguiu fazer este passo?" — sim marca o passo como feito. */
  responderHabito(id: string, passoId: string, fez: boolean): Promise<void>
  /** "Não consegui": registra o motivo e avisa a enfermeira. */
  relatarDificuldade(id: string, motivo: MotivoDificuldade, origem: 'plano' | 'checkin', passoId?: string): Promise<void>
  /** Pergunta de checagem do plano (teach-back assíncrono). */
  responderTeachBack(id: string, acertou: boolean): Promise<void>

  // Ações da equipe de APS (enfermagem)
  enviarLembrete(id: string): Promise<void>
  enviarPlano(id: string): Promise<void>
  enviarCheckinHabito(id: string): Promise<void>
  resolverDificuldade(id: string, dificuldadeId: string, nota: string): Promise<void>
  registrarMonitoramento(id: string, m: Monitoramento): Promise<void>

  /** Notifica quando qualquer dado muda. Retorna a função para cancelar. */
  assinar(callback: () => void): () => void
}
