import type { Liberacao, Pulso } from './types'
import { addDias, emDias, inicioDoDia } from '../lib/datas'

// DADOS FICTÍCIOS E AGREGADOS para as visões de RH/Direção e Liderança.
// A empresa-exemplo é a Metalúrgica Atlântida Ltda (da planilha fictícia do evento), com 3 unidades.

export const EMPRESA_EXEMPLO = 'Metalúrgica Atlântida Ltda'

/** Grupos menores que isso não aparecem para RH/Direção (evita reidentificar pessoas). */
export const MINIMO_GRUPO = 5

export interface ResumoUnidade {
  unidade: string
  vidas: number
  turnos: string[]
  /** Funil do retorno nos últimos 30 dias (slide 15 da abertura). */
  funil: { contato: number; resposta: number; agendamento: number; comparecimento: number }
  /** Comparecimento aos retornos agendados, antes (linha de base) e no piloto. */
  comparecimentoAntes: number
  comparecimentoAgora: number
  planosRecebidos: number // %
  emDiaComRisco: number // % dentro do prazo do risco
  /** Motivos do "não consegui" (contagem). */
  motivos: Record<'tempo' | 'transporte' | 'nao_entendi' | 'remedio' | 'dinheiro' | 'outro', number>
}

export const UNIDADES: ResumoUnidade[] = [
  {
    unidade: 'Planta Camaçari',
    vidas: 420,
    turnos: ['Turno A', 'Turno B', 'Turno C (noite)'],
    funil: { contato: 180, resposta: 131, agendamento: 104, comparecimento: 79 },
    comparecimentoAntes: 51,
    comparecimentoAgora: 76,
    planosRecebidos: 82,
    emDiaComRisco: 64,
    motivos: { tempo: 21, transporte: 17, nao_entendi: 9, remedio: 4, dinheiro: 3, outro: 5 },
  },
  {
    unidade: 'Planta Simões Filho',
    vidas: 260,
    turnos: ['Turno A', 'Turno B'],
    funil: { contato: 110, resposta: 70, agendamento: 52, comparecimento: 33 },
    comparecimentoAntes: 49,
    comparecimentoAgora: 63,
    planosRecebidos: 68,
    emDiaComRisco: 55,
    motivos: { tempo: 9, transporte: 14, nao_entendi: 6, remedio: 2, dinheiro: 4, outro: 2 },
  },
  {
    unidade: 'Escritório Salvador',
    vidas: 4, // abaixo do mínimo: não aparece para RH
    turnos: ['Administrativo'],
    funil: { contato: 3, resposta: 3, agendamento: 2, comparecimento: 2 },
    comparecimentoAntes: 50,
    comparecimentoAgora: 100,
    planosRecebidos: 100,
    emDiaComRisco: 75,
    motivos: { tempo: 1, transporte: 0, nao_entendi: 0, remedio: 0, dinheiro: 0, outro: 0 },
  },
]

/** Meta coletiva por turno (reconhecimento do grupo, nunca de indivíduos). */
export const META_TURNO = 80

/** % de pessoas do turno em dia com o cuidado (fictício), para prova social e meta coletiva. */
export const EM_DIA_POR_TURNO: Record<string, Record<string, number>> = {
  'Planta Camaçari': { 'Turno A': 71, 'Turno B': 62, 'Turno C (noite)': 48 },
  'Planta Simões Filho': { 'Turno A': 58, 'Turno B': 52 },
}

// ---------------------------------------------------------------- geradores determinísticos

function aleatorio(semente: number) {
  let x = semente
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

/** Respostas anônimas do totem nas últimas 4 semanas. */
export function gerarPulsos(hoje = new Date()): Pulso[] {
  const r = aleatorio(42)
  const perfis: Record<string, { porDia: number; dorForte: number; sonoRuim: number; energiaBaixa: number }> = {
    'Planta Camaçari|Turno A': { porDia: 9, dorForte: 0.3, sonoRuim: 0.35, energiaBaixa: 0.25 },
    'Planta Camaçari|Turno B': { porDia: 7, dorForte: 0.2, sonoRuim: 0.25, energiaBaixa: 0.2 },
    'Planta Camaçari|Turno C (noite)': { porDia: 4, dorForte: 0.25, sonoRuim: 0.6, energiaBaixa: 0.45 },
    'Planta Simões Filho|Turno A': { porDia: 5, dorForte: 0.35, sonoRuim: 0.3, energiaBaixa: 0.3 },
    'Planta Simões Filho|Turno B': { porDia: 4, dorForte: 0.15, sonoRuim: 0.3, energiaBaixa: 0.25 },
  }
  const pulsos: Pulso[] = []
  let n = 0
  for (const [chave, p] of Object.entries(perfis)) {
    const [unidade, turno] = chave.split('|')
    for (let d = 28; d >= 1; d--) {
      const dia = addDias(inicioDoDia(hoje), -d)
      if (dia.getDay() === 0) continue
      const qtd = Math.round(p.porDia * (0.6 + r() * 0.8) * (d < 14 ? 1.25 : 1)) // participação cresce nas 2 últimas semanas
      for (let i = 0; i < qtd; i++) {
        const nivel = (prob: number): 1 | 2 | 3 => (r() < prob ? 1 : r() < 0.55 ? 2 : 3)
        pulsos.push({
          id: `p${n++}`,
          unidade,
          turno,
          data: emDias(hoje, -d, 6 + Math.floor(r() * 12)),
          energia: nivel(p.energiaBaixa),
          dor: (4 - nivel(p.dorForte)) as 1 | 2 | 3, // inverte: prob alta → dor 3
          sono: nivel(p.sonoRuim),
        })
      }
    }
  }
  return pulsos
}

const NOMES_FICTICIOS = ['Carla M.', 'Jorge S.', 'Renata L.', 'Paulo R.', 'Tânia B.', 'Ivo C.']

/** Compromissos de saúde que caem no turno na próxima semana. Nome só quando a pessoa autorizou. */
export function gerarLiberacoes(hoje = new Date()): Liberacao[] {
  const r = aleatorio(7)
  const out: Liberacao[] = []
  let n = 0
  for (let d = 1; d <= 7; d++) {
    const dia = addDias(inicioDoDia(hoje), d)
    if (dia.getDay() === 0 || dia.getDay() === 6) continue
    for (const [turno, horas] of [
      ['Turno A', [7, 8, 9, 10, 11, 13]],
      ['Turno B', [15, 16, 17, 18, 19, 20]],
    ] as const) {
      const qtd = Math.floor(r() * 3.2)
      for (let i = 0; i < qtd; i++) {
        const h = horas[Math.floor(r() * horas.length)]
        out.push({
          id: `l${n++}`,
          unidade: 'Planta Camaçari',
          turno,
          inicio: emDias(hoje, d, h, r() < 0.5 ? 0 : 30),
          duracaoMin: 20,
          nome: r() < 0.55 ? NOMES_FICTICIOS[Math.floor(r() * NOMES_FICTICIOS.length)] : undefined,
        })
      }
    }
  }
  return out
}
