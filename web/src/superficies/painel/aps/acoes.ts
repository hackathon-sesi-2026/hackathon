import { createContext, useContext } from 'react'
import type { Desfecho } from '../../../api/tipos'
import type { Enviar } from '../../../api/useRecurso'

/** Tudo o que a enfermagem pode fazer a partir da fila. */
export function criarAcoes(enviar: Enviar) {
  const de = (trabalhadorId: string) => `/aps/trabalhadores/${trabalhadorId}`
  return {
    enviarLembrete: (id: string) => enviar('post', `${de(id)}/lembrete`),
    /** Na demonstração a enfermeira dispara à mão; no produto, um agendador envia em D-3 e D-1. */
    dispararLembreteAutomatico: (id: string, qual: 'D-3' | 'D-1') => enviar('post', `${de(id)}/lembretes-automaticos`, { qual }),
    enviarPlano: (id: string) => enviar('post', `${de(id)}/plano/envio`),
    enviarCheckinHabito: (id: string) => enviar('post', `${de(id)}/checkin-habito`),
    resolverDificuldade: (id: string, dificuldadeId: string, nota: string) =>
      enviar('post', `${de(id)}/dificuldades/${dificuldadeId}/resolucao`, { nota }),
    registrarMonitoramento: (id: string, desfecho: Desfecho) => enviar('post', `${de(id)}/monitoramentos`, desfecho),
  }
}

export type AcoesDaAps = ReturnType<typeof criarAcoes>

export const ContextoDasAcoes = createContext<AcoesDaAps | null>(null)

export function useAcoes(): AcoesDaAps {
  const acoes = useContext(ContextoDasAcoes)
  if (!acoes) throw new Error('useAcoes fora do PainelAps')
  return acoes
}
