import type { Horario, Monitoramento, Trabalhador, Turno } from './types'

/**
 * Interface única de dados. O núcleo da solução só conhece esta interface.
 * Hoje: adaptador simulado (dados fictícios). Depois: adaptador S+ e, se confirmado, Klingo.
 * Trocar a implementação não altera as telas.
 */
export interface DataAdapter {
  /** Nome exibido na interface, para deixar claro de onde vêm os dados. */
  readonly nome: string

  listarTrabalhadores(): Promise<Trabalhador[]>

  // Ações do trabalhador (canal WhatsApp + página leve)
  confirmarConsulta(id: string): Promise<void>
  pedirRemarcacao(id: string): Promise<void>
  listarHorarios(id: string): Promise<Horario[]>
  agendar(id: string, horario: Horario): Promise<void>
  atualizarTurno(id: string, turno: Turno): Promise<void>
  abrirPlano(id: string): Promise<void>
  marcarPasso(id: string, passoId: string, feito: boolean): Promise<void>
  responderCheckin(id: string, tudoBem: boolean): Promise<void>

  // Ações da equipe de APS (enfermagem)
  enviarLembrete(id: string): Promise<void>
  enviarPlano(id: string): Promise<void>
  registrarMonitoramento(id: string, m: Monitoramento): Promise<void>

  /** Notifica quando qualquer dado muda. Retorna a função para cancelar. */
  assinar(callback: () => void): () => void
}
