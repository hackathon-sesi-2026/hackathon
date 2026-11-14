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

/** presencial = fora do turno · online = por vídeo · no_turno = microconsulta de 20 min no ambulatório da empresa, com liberação. */
export type Modalidade = 'presencial' | 'online' | 'no_turno'

/** O que move a pessoa a se cuidar (escolhido por ela). Usado nas mensagens e no app. */
export type Motivacao = 'familia' | 'energia' | 'menos_dor' | 'sono'

/** Resposta anônima do "Como você está hoje?" no totem. Sem identificação. */
export interface Pulso {
  id: string
  unidade: string
  turno: string
  data: string // ISO
  energia: 1 | 2 | 3
  dor: 1 | 2 | 3 // 1 sem dor, 3 dor forte
  sono: 1 | 2 | 3 // 1 dormiu mal, 3 dormiu bem
}

/** Compromisso de saúde que cai no turno e precisa de liberação. A liderança nunca vê o motivo. */
export interface Liberacao {
  id: string
  unidade: string
  turno: string
  inicio: string // ISO
  duracaoMin: number
  /** Só preenchido se o trabalhador autorizou mostrar o nome à liderança. */
  nome?: string
}

export type StatusConsulta = 'agendada' | 'confirmada' | 'remarcar' | 'faltou'

export interface Consulta {
  id: string
  data: string // ISO
  local: string
  profissional: string
  modalidade: Modalidade
  status: StatusConsulta
  /** Para consultas no turno: o trabalhador autorizou a liderança a ver o nome (nunca o motivo). */
  nomeParaLideranca?: boolean
  /** Plano se-então que a pessoa escolheu (opcional), ex.: "sair do turno e ir direto". */
  compromisso?: string
  /** Lembretes automáticos já enviados (D-3 e D-1). */
  lembretesAutoEnviados?: ('D-3' | 'D-1')[]
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
  /** O que a pessoa ganha no curto prazo (ganho percebido, não promessa clínica). */
  ganho: string
  /** Texto técnico original do plano (ex.: nomes dos exames), visível só se o trabalhador quiser abrir. */
  itensTecnicos?: string[]
}

// ---------------------------------------------------------------- Exames (só na página pessoal, nunca no WhatsApp)

export type StatusExame = 'pedido' | 'coletado' | 'resultado'

/** normal = dentro do esperado · atencao = vale conversar no retorno. Nunca "grave": isso é conversa com a médica. */
export type SituacaoItem = 'normal' | 'atencao'

export interface ItemResultado {
  nome: string // nome técnico, como no laudo
  simples: string // o que é, em linguagem do dia a dia
  valor: string
  referencia: string
  situacao: SituacaoItem
  explicacao: string // o que isso quer dizer para a pessoa
}

export interface Exame {
  id: string
  titulo: string // "Exames de sangue e urina"
  pedidoPor: string
  dataPedido: string // ISO
  dataColeta?: string
  dataResultado?: string
  status: StatusExame
  /** Passo do plano ligado a este exame (marcar o passo como feito = coletado). */
  passoId?: string
  itens: ItemResultado[]
}

export type Acao =
  | 'confirmar'
  | 'exames'
  | 'remarcar'
  | 'escolher_horario'
  | 'plano'
  | 'checkin_ok'
  | 'checkin_ajuda'
  | 'habito_sim'
  | 'habito_nao'
  // Plano se-então (compromisso opcional ao confirmar)
  | 'se_turno'
  | 'se_folga'
  | 'se_so_lembrete'

export interface Mensagem {
  id: string
  de: 'sesi' | 'trabalhador'
  texto: string
  hora: string // ISO
  acoes?: Acao[]
  /** Passo do plano a que a mensagem se refere (check-in de hábito). */
  passoId?: string
}

/** Motivos que o trabalhador pode relatar quando não consegue seguir o plano (slides 14 e 16 da abertura). */
export type MotivoDificuldade = 'tempo' | 'transporte' | 'nao_entendi' | 'remedio' | 'dinheiro' | 'outro'

export interface Dificuldade {
  id: string
  motivo: MotivoDificuldade
  passoId?: string
  origem: 'plano' | 'checkin' | 'teach_back'
  data: string // ISO
  resolvida: boolean
  nota?: string
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
  | 'checkin_habito'
  | 'dificuldade'
  | 'dificuldade_resolvida'
  | 'teach_back'
  | 'compromisso'
  | 'lembrete_auto'
  | 'selo'
  | 'exame_coletado'
  | 'resultado_liberado'
  | 'resultado_visto'

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
  /** Planta / estabelecimento onde trabalha (e onde fica o totem). */
  unidade: string
  medicoReferencia: string
  /** Enfermeira de referência: as mensagens vêm em nome dela (acolhimento / reciprocidade). */
  enfermeira: string
  motivacao: Motivacao | null
  /** Semanas seguidas com alguma ação de cuidado (passo feito, check-in respondido, retorno confirmado). */
  semanasSeguidas: number
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
  /** Dificuldades relatadas pelo trabalhador ("não consegui"). */
  dificuldades: Dificuldade[]
  /** Pergunta de checagem do plano (teach-back assíncrono). */
  teachBack: 'pendente' | 'acertou' | 'errou'
  /** Faltas a retornos nos últimos 12 meses (entra no radar de risco de falta). */
  faltasUltimoAno: number
  /** Exames pedidos e resultados, explicados em linguagem simples. */
  exames: Exame[]
  /** Resultado novo que a pessoa ainda não abriu. */
  resultadoNaoVisto: boolean
}

export interface Horario {
  inicio: string // ISO
  local: string
  modalidade: Modalidade
  duracaoMin: number
  /** Dica exibida ao trabalhador, ex.: "antes do fretado". */
  dica?: string
}
