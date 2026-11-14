import type { Acao, Trabalhador } from '../data/types'
import { diaSemana, horaCurta } from '../lib/datas'
import { primeiroNome } from './regras'

// Regra de privacidade: nenhuma mensagem leva informação clínica (diagnóstico, exame, remédio).

export const ROTULO_ACAO: Record<Acao, string> = {
  confirmar: '✅ Confirmo',
  remarcar: '📅 Preciso remarcar',
  escolher_horario: '📅 Escolher horário',
  plano: '📋 Ver meu plano',
  checkin_ok: '👍 Tudo bem',
  checkin_ajuda: '🙋 Quero falar com a enfermeira',
}

export function textoLembrete(t: Trabalhador): { texto: string; acoes: Acao[] } {
  const nome = primeiroNome(t.nome)
  if (t.consulta && t.consulta.status !== 'faltou') {
    const onde = t.consulta.modalidade === 'online' ? 'por vídeo' : `no ${t.consulta.local}`
    return {
      texto: `Olá, ${nome}! Aqui é a equipe de saúde do SESI. Seu retorno está marcado para ${diaSemana(t.consulta.data)}, às ${horaCurta(
        t.consulta.data,
      )}, ${onde}. Você consegue ir?`,
      acoes: ['confirmar', 'remarcar', 'plano'],
    }
  }
  return {
    texto: `Olá, ${nome}! Aqui é a equipe de saúde do SESI. Está na hora do seu retorno. Vamos escolher um horário que não bata com o seu turno? Tem opção por vídeo também.`,
    acoes: ['escolher_horario', 'plano'],
  }
}

export function textoPlano(t: Trabalhador): { texto: string; acoes: Acao[] } {
  return {
    texto: `Olá, ${primeiroNome(t.nome)}! Seu plano de cuidado está pronto. São poucos passos, em linguagem simples. Só você e a equipe de saúde veem.`,
    acoes: ['plano'],
  }
}

export function textoCheckin(t: Trabalhador): { texto: string; acoes: Acao[] } {
  return {
    texto: `Oi, ${primeiroNome(t.nome)}! Passando para saber: como você está desde o último atendimento?`,
    acoes: ['checkin_ok', 'checkin_ajuda'],
  }
}
