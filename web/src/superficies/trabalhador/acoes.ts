import { createContext, useContext } from 'react'
import { api } from '../../api/cliente'
import type { Acao, Horario, HorariosDisponiveis, Motivacao, MotivoDificuldade } from '../../api/tipos'
import type { Enviar } from '../../api/useRecurso'

/** Tudo o que o trabalhador pode fazer pelo link pessoal. `base` já inclui o token dele. */
export function criarAcoes(base: string, enviar: Enviar) {
  return {
    confirmarConsulta: () => enviar('post', `${base}/consulta/confirmacao`),
    pedirRemarcacao: () => enviar('post', `${base}/consulta/remarcacao`),
    listarHorarios: () => api.get<HorariosDisponiveis>(`${base}/horarios`),
    /** nomeParaLideranca só vale para horário no turno; a liderança nunca vê o motivo. */
    agendar: (horario: Horario, nomeParaLideranca: boolean) =>
      enviar('post', `${base}/consulta`, { inicio: horario.inicio, modalidade: horario.modalidade, nomeParaLideranca }),
    /** Plano se-então opcional depois de confirmar. */
    escolherCompromisso: (opcao: Acao) => enviar('post', `${base}/consulta/compromisso`, { opcao }),
    atualizarTurno: (nome: string) => enviar('put', `${base}/turno`, { nome }),
    definirMotivacao: (motivacao: Motivacao) => enviar('put', `${base}/motivacao`, { motivacao }),
    abrirPlano: () => enviar('post', `${base}/plano/abertura`),
    marcarPasso: (passoId: string, feito: boolean) => enviar('put', `${base}/plano/passos/${passoId}`, { feito }),
    /** Check-in de hábito: "conseguiu fazer este passo?". */
    responderHabito: (passoId: string, fez: boolean) => enviar('post', `${base}/plano/passos/${passoId}/habito`, { fez }),
    /** "Não consegui": registra o motivo e avisa a enfermeira. */
    relatarDificuldade: (motivo: MotivoDificuldade, origem: 'plano' | 'checkin', passoId?: string | null) =>
      enviar('post', `${base}/plano/dificuldades`, { motivo, origem, passoId: passoId ?? null }),
    responderChecagem: (resposta: string) => enviar('post', `${base}/plano/checagem`, { resposta }),
    /** A pessoa abriu "Meus exames": some o aviso de resultado novo. */
    verResultados: () => enviar('post', `${base}/exames/visualizacao`),
    /** "Falar com a equipe" (tudoBem = false) pede o contato de uma pessoa: a enfermeira vê "pediu ajuda" na fila. */
    responderCheckin: (tudoBem: boolean) => enviar('post', `${base}/checkin`, { tudoBem }),
    /** Gasta pontos de participação num benefício. A API recusa (409) se o saldo não cobrir. */
    resgatarBeneficio: (beneficioId: string) => enviar('post', `${base}/beneficios/${beneficioId}/resgate`),
  }
}

export type AcoesDoTrabalhador = ReturnType<typeof criarAcoes>

export const ContextoDasAcoes = createContext<AcoesDoTrabalhador | null>(null)

export function useAcoes(): AcoesDoTrabalhador {
  const acoes = useContext(ContextoDasAcoes)
  if (!acoes) throw new Error('useAcoes fora da PaginaTrabalhador')
  return acoes
}
