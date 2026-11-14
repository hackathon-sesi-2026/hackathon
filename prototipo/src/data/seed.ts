import type { Consulta, Evento, Mensagem, PassoPlano, Risco, StatusConsulta, StatusPlano, Trabalhador } from './types'
import { PRAZO_DIAS, TURNOS } from '../domain/regras'
import { textoCheckin, textoLembrete, textoPlano } from '../domain/mensagens'
import { emDias } from '../lib/datas'

// DADOS FICTÍCIOS. Empresas e médicos de referência vêm da planilha fictícia do evento;
// pessoas e situações foram inventadas para a demonstração.
// Textos do plano em linguagem simples, a revisar por profissional de saúde.

const [A, B, C, ADM] = TURNOS

const EMPRESAS = {
  plasticos: 'Plásticos Recôncavo Ltda',
  alimentos: 'Alimentos Vale Verde Ltda',
  metal: 'Metalúrgica Atlântida Ltda',
  textil: 'Têxtil Horizonte Ltda',
  ceramica: 'Cerâmica Pedra Azul Ltda',
  quimica: 'Química Litoral Norte S.A.',
}

const MEDICOS = ['Dra. Beatriz Campos', 'Dra. Helena Matos', 'Dr. Ricardo Fontes', 'Dr. Felipe Andrade']

interface Semente {
  nome: string
  funcao: string
  empresa: string
  turno: (typeof TURNOS)[number]
  risco: Risco
  /** Dias desde a última consulta médica. */
  ultimo: number
  plano: StatusPlano
  /** Dias atrás em que o plano foi enviado. */
  planoEnviado?: number
  consulta?: { dias: number; hora: number; status: StatusConsulta; online?: boolean }
  /** Dias atrás em que o último lembrete foi enviado (sem resposta). */
  lembrete?: number
  checkin?: number
  pediuContato?: boolean
  passosFeitos?: number
}

// O primeiro é a persona oficial do desafio: Marcos, operador de produção, turno 6h–14h, ônibus fretado.
const SEMENTES: Semente[] = [
  { nome: 'Marcos Oliveira Santos', funcao: 'Operador de produção', empresa: EMPRESAS.metal, turno: A, risco: 2, ultimo: 170, plano: 'enviado', planoEnviado: 1, consulta: { dias: 4, hora: 15, status: 'agendada' }, lembrete: 0 },
  { nome: 'Juliana Bispo Almeida', funcao: 'Separadora de pedidos', empresa: EMPRESAS.alimentos, turno: B, risco: 3, ultimo: 100, plano: 'recebido', lembrete: 4, passosFeitos: 1 },
  { nome: 'Ana Paula Ferreira', funcao: 'Costureira', empresa: EMPRESAS.textil, turno: A, risco: 3, ultimo: 60, plano: 'recebido', consulta: { dias: -2, hora: 15, status: 'faltou' } },
  { nome: 'Rafael Lima Conceição', funcao: 'Soldador', empresa: EMPRESAS.metal, turno: C, risco: 4, ultimo: 40, plano: 'recebido', passosFeitos: 1 },
  { nome: 'Luciana Nascimento Rocha', funcao: 'Embaladora', empresa: EMPRESAS.alimentos, turno: B, risco: 2, ultimo: 90, plano: 'recebido', checkin: 1, pediuContato: true },
  { nome: 'Sandra Santos Mendes', funcao: 'Líder de linha', empresa: EMPRESAS.textil, turno: ADM, risco: 3, ultimo: 85, plano: 'recebido', consulta: { dias: 3, hora: 9, status: 'remarcar' } },
  { nome: 'Edson Pereira Almeida', funcao: 'Almoxarife', empresa: EMPRESAS.plasticos, turno: B, risco: 2, ultimo: 120, plano: 'recebido', consulta: { dias: 2, hora: 10, status: 'agendada' }, lembrete: 4 },
  { nome: 'Patrícia Teixeira Carvalho', funcao: 'Auxiliar de produção', empresa: EMPRESAS.plasticos, turno: A, risco: 2, ultimo: 200, plano: 'enviado', planoEnviado: 190 },
  { nome: 'Leandro Teixeira Rodrigues', funcao: 'Mecânico de manutenção', empresa: EMPRESAS.ceramica, turno: B, risco: 3, ultimo: 82, plano: 'recebido', passosFeitos: 2 },
  { nome: 'Bruna Nascimento Barbosa', funcao: 'Operadora de máquinas', empresa: EMPRESAS.plasticos, turno: C, risco: 3, ultimo: 12, plano: 'enviado', planoEnviado: 6 },
  { nome: 'José Nunes Lima', funcao: 'Operador de extrusora', empresa: EMPRESAS.quimica, turno: C, risco: 3, ultimo: 45, plano: 'recebido', consulta: { dias: 6, hora: 19, status: 'confirmada', online: true }, passosFeitos: 1 },
  { nome: 'Fernanda Rodrigues Costa', funcao: 'Analista de qualidade', empresa: EMPRESAS.alimentos, turno: ADM, risco: 1, ultimo: 30, plano: 'recebido', checkin: 0 },
  { nome: 'Danilo Ribeiro Dias', funcao: 'Eletricista', empresa: EMPRESAS.ceramica, turno: A, risco: 1, ultimo: 3, plano: 'nao_enviado' },
  { nome: 'Aline Araújo Batista', funcao: 'Técnica de segurança', empresa: EMPRESAS.quimica, turno: ADM, risco: 1, ultimo: 150, plano: 'recebido', passosFeitos: 3 },
  { nome: 'Antônio Dias Nascimento', funcao: 'Caldeireiro', empresa: EMPRESAS.metal, turno: C, risco: 4, ultimo: 10, plano: 'recebido', consulta: { dias: 10, hora: 17, status: 'confirmada' } },
]

const EXAMES = [
  'Hemoglobina glicada (HbA1c)', 'Hemograma completo', 'Colesterol total e frações', 'Triglicerídeos', 'TGO (AST)', 'TGP (ALT)',
  'Ureia sérica', 'Creatinina sérica', 'TSH', 'T4 livre', '25-hidroxivitamina D', 'Glicemia em jejum', 'Urina tipo 1',
  'Microalbuminúria em amostra isolada', 'Insulina em jejum', 'Índice HOMA-IR',
]

/** "Tradução" das seções do Plano de Cuidados do SESI para passos curtos. */
function plano(risco: Risco, hoje: Date, id: string, feitos = 0): PassoPlano[] {
  const passos: Omit<PassoPlano, 'id' | 'feito'>[] =
    risco <= 2
      ? [
          { categoria: 'exames', titulo: 'Fazer os exames de sangue e urina', detalhe: 'É uma coleta só, de manhã, com jejum de 8 horas. Leve o pedido da médica.', prazo: emDias(hoje, 10), itensTecnicos: EXAMES },
          { categoria: 'nutricao', titulo: 'Marcar conversa com a nutricionista', detalhe: 'Para ajustar a alimentação e o peso, sem dieta radical.', prazo: emDias(hoje, 20) },
          { categoria: 'vacina', titulo: 'Tomar a vacina da gripe', detalhe: 'Leve sua caderneta para a equipe conferir se falta alguma vacina.', prazo: emDias(hoje, 30) },
          { categoria: 'atividade', titulo: 'Manter o exercício que você já faz', detalhe: 'Do seu jeito, respeitando seus limites. Caminhar já conta.', prazo: emDias(hoje, 60) },
          { categoria: 'retorno', titulo: 'Voltar à médica de família', detalhe: 'Para ver os resultados dos exames e combinar os próximos passos.', prazo: emDias(hoje, 45) },
        ]
      : [
          { categoria: 'remedio', titulo: 'Tomar o remédio no horário combinado', detalhe: 'Mesmo quando estiver se sentindo bem. Se acabar, avise a equipe.', prazo: emDias(hoje, 7) },
          { categoria: 'psicologia', titulo: 'Marcar conversa com a psicóloga', detalhe: 'A equipe ajuda a achar um horário fora do seu turno, presencial ou por vídeo.', prazo: emDias(hoje, 14) },
          { categoria: 'habitos', titulo: 'Beber 2 litros de água e cuidar do sono', detalhe: 'Pequenos passos contam: uma garrafa no posto de trabalho já ajuda.', prazo: emDias(hoje, 21) },
          { categoria: 'retorno', titulo: 'Retorno com a médica de família', detalhe: 'Para ver como você está e ajustar o plano se precisar.', prazo: emDias(hoje, 30) },
        ]
  return passos.map((p, i) => ({ ...p, id: `${id}-p${i + 1}`, feito: i < feitos }))
}

export function criarDados(hoje = new Date()): Trabalhador[] {
  return SEMENTES.map((s, i) => {
    const id = `t${i + 1}`
    const consulta: Consulta | null = s.consulta
      ? {
          id: `${id}-c1`,
          data: emDias(hoje, s.consulta.dias, s.consulta.hora),
          local: s.consulta.online ? 'Teleatendimento' : s.consulta.hora < 8 ? 'Unidade SESI Centro' : 'Ambulatório SESI na empresa',
          profissional: 'Enfermeira de cuidado',
          modalidade: s.consulta.online ? 'online' : 'presencial',
          status: s.consulta.status,
        }
      : null

    const t: Trabalhador = {
      id,
      matricula: String(20261001 + i * 37),
      nome: s.nome,
      funcao: s.funcao,
      empresa: s.empresa,
      medicoReferencia: MEDICOS[i % MEDICOS.length],
      turno: s.turno,
      risco: s.risco,
      ultimaConsultaMedica: emDias(hoje, -s.ultimo, 10),
      ultimoContatoEnfermagem: null,
      proximoMonitoramento: emDias(hoje, PRAZO_DIAS[s.risco] - s.ultimo),
      statusPlano: s.plano,
      dataEnvioPlano: s.plano === 'nao_enviado' ? null : emDias(hoje, -(s.planoEnviado ?? s.ultimo - 1), 11),
      consulta,
      plano: plano(s.risco, hoje, id, s.passosFeitos),
      mensagens: [],
      eventos: [],
      pediuContato: false,
    }

    const msgs: Mensagem[] = []
    const evs: Evento[] = []
    if (t.dataEnvioPlano) {
      const p = textoPlano(t)
      msgs.push({ id: `${id}-m0`, de: 'sesi', texto: p.texto, hora: t.dataEnvioPlano })
      evs.push({ id: `${id}-e-pe`, tipo: 'plano_enviado', data: t.dataEnvioPlano })
      if (s.plano === 'recebido') evs.push({ id: `${id}-e-pr`, tipo: 'plano_recebido', data: emDias(hoje, -(s.ultimo - 2), 19) })
    }
    if (s.consulta?.status === 'faltou') evs.push({ id: `${id}-e0`, tipo: 'faltou', data: consulta!.data })
    if (s.lembrete !== undefined) {
      const quando = emDias(hoje, -s.lembrete, 8, 30)
      const l = textoLembrete(t)
      msgs.push({ id: `${id}-m1`, de: 'sesi', texto: l.texto, hora: quando, acoes: l.acoes })
      evs.push({ id: `${id}-e1`, tipo: 'lembrete', data: quando })
    }
    if (s.consulta?.status === 'remarcar') {
      const quando = emDias(hoje, -1, 19, 10)
      const l = textoLembrete({ ...t, consulta: { ...consulta!, status: 'agendada' } })
      msgs.push({ id: `${id}-m1`, de: 'sesi', texto: l.texto, hora: emDias(hoje, -1, 8, 30) })
      msgs.push({ id: `${id}-m2`, de: 'trabalhador', texto: 'Preciso remarcar', hora: quando })
      evs.push({ id: `${id}-e2`, tipo: 'pediu_remarcar', data: quando })
    }
    if (s.checkin !== undefined) {
      const quando = emDias(hoje, -s.checkin, 9)
      const c = textoCheckin(t)
      msgs.push({ id: `${id}-m3`, de: 'sesi', texto: c.texto, hora: quando, acoes: s.pediuContato ? undefined : c.acoes })
      if (s.pediuContato) {
        msgs.push({ id: `${id}-m4`, de: 'trabalhador', texto: 'Quero falar com a enfermeira', hora: emDias(hoje, -s.checkin, 12, 40) })
        msgs.push({ id: `${id}-m5`, de: 'sesi', texto: 'Certo! A enfermeira vai entrar em contato com você em até 2 dias úteis.', hora: emDias(hoje, -s.checkin, 12, 41) })
        evs.push({ id: `${id}-e3`, tipo: 'checkin_ajuda', data: emDias(hoje, -s.checkin, 12, 40) })
      }
    }
    msgs.sort((a, b) => a.hora.localeCompare(b.hora))
    evs.sort((a, b) => a.data.localeCompare(b.data))
    // Só a última mensagem do SESI mantém botões.
    const ultimaSesi = [...msgs].reverse().find((m) => m.de === 'sesi')
    msgs.forEach((m) => m !== ultimaSesi && delete m.acoes)
    if (ultimaSesi && !ultimaSesi.acoes && s.plano === 'enviado') ultimaSesi.acoes = ['plano']

    t.mensagens = msgs
    t.eventos = evs
    t.pediuContato = !!s.pediuContato
    return t
  })
}
