// Modelo de dados do protótipo. Tudo aqui é fictício.
// Campos espelham as fichas do desafio (Gestão de Retorno, Plano de Cuidados) e a planilha de acompanhamento.
// Dados clínicos detalhados (diagnósticos, exame físico) ficam no S+ e NÃO entram aqui.

/** Classes de risco da APS SESI: 1 e 2 → retorno a cada 6 meses, 3 → 3 meses, 4 → critério médico. */
export type Risco = 1 | 2 | 3 | 4

export interface Turno {
  nome: string
  /** Hora de início (0–23). */
  inicio: number
  /** Hora de fim (0–23). Pode ser menor que o início em turno noturno. */
  fim: number
}

export type Modalidade = 'presencial' | 'online'

export type StatusConsulta = 'agendada' | 'confirmada' | 'remarcar' | 'faltou'

export interface Consulta {
  id: string
  data: string // ISO
  local: string
  profissional: string
  modalidade: Modalidade
  status: StatusConsulta
}

/** Status do plano de cuidado, como na ficha Gestão de Retorno ("Não recebido"). */
export type StatusPlano = 'nao_enviado' | 'enviado' | 'recebido'

/** Seções do Plano de Cuidados do SESI. */
export type CategoriaPasso = 'exames' | 'nutricao' | 'atividade' | 'vacina' | 'psicologia' | 'remedio' | 'retorno' | 'habitos'

export interface PassoPlano {
  id: string
  categoria: CategoriaPasso
  titulo: string
  detalhe: string
  prazo: string // ISO
  feito: boolean
  /** Texto técnico original do plano (ex.: nomes dos exames), visível só se o trabalhador quiser abrir. */
  itensTecnicos?: string[]
}

export type Acao = 'confirmar' | 'remarcar' | 'escolher_horario' | 'plano' | 'checkin_ok' | 'checkin_ajuda'

export interface Mensagem {
  id: string
  de: 'sesi' | 'trabalhador'
  texto: string
  hora: string // ISO
  acoes?: Acao[]
}

export type TipoEvento =
  | 'lembrete'
  | 'plano_enviado'
  | 'plano_recebido'
  | 'confirmou'
  | 'pediu_remarcar'
  | 'agendou'
  | 'passo_feito'
  | 'checkin_ok'
  | 'checkin_ajuda'
  | 'monitoramento'
  | 'faltou'
  | 'turno_atualizado'

export interface Evento {
  id: string
  tipo: TipoEvento
  data: string // ISO
  nota?: string
}

/** Desfecho do monitoramento — mesmos campos da ficha Gestão de Retorno. */
export interface Monitoramento {
  feitoContato: boolean
  agendamentoRealizado: boolean
  mensagemEnviada: boolean
  aguardandoRetorno: boolean
  observacao: string
  proximoMonitoramento: string // ISO
}

export interface Trabalhador {
  id: string
  matricula: string
  nome: string
  funcao: string
  empresa: string
  medicoReferencia: string
  turno: Turno
  risco: Risco
  ultimaConsultaMedica: string // ISO
  ultimoContatoEnfermagem: string | null
  proximoMonitoramento: string // ISO
  statusPlano: StatusPlano
  dataEnvioPlano: string | null
  consulta: Consulta | null
  plano: PassoPlano[]
  mensagens: Mensagem[]
  eventos: Evento[]
  pediuContato: boolean
}

export interface Horario {
  inicio: string // ISO
  local: string
  modalidade: Modalidade
  /** Dica exibida ao trabalhador, ex.: "antes do fretado". */
  dica?: string
}
