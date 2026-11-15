// Contratos da API, separados por público. Cada tela só conhece os tipos do seu público.
// Datas chegam como texto ISO em UTC ("2026-11-20T18:00:00.000Z").

// ---------------------------------------------------------------- comuns

/** Classes de risco da APS SESI: 1 e 2 → retorno a cada 6 meses, 3 → 3 meses, 4 → critério médico. */
export type Risco = 1 | 2 | 3 | 4

export interface Turno {
  nome: string
  /** Hora de início (0–23). */
  inicio: number
  /** Hora de fim. Menor que o início em turno noturno. */
  fim: number
}

/** presencial = fora do turno · online = por vídeo · no_turno = microconsulta de 20 min no ambulatório da empresa. */
export type Modalidade = 'presencial' | 'online' | 'no_turno'
export type Motivacao = 'familia' | 'energia' | 'menos_dor' | 'sono'
export type StatusConsulta = 'agendada' | 'confirmada' | 'remarcar' | 'faltou'
export type StatusPlano = 'nao_enviado' | 'enviado' | 'recebido'
export type CategoriaPasso = 'exames' | 'nutricao' | 'atividade' | 'vacina' | 'psicologia' | 'remedio' | 'retorno' | 'habitos'
export type MotivoDificuldade = 'tempo' | 'transporte' | 'nao_entendi' | 'remedio' | 'dinheiro' | 'outro'

export interface Consulta {
  id: string
  data: string
  local: string
  profissional: string
  modalidade: Modalidade
  status: StatusConsulta
  /** Para consulta no turno: a pessoa autorizou a liderança a ver o nome (nunca o motivo). */
  nomeParaLideranca: boolean
  /** Plano se-então que a pessoa combinou, ex.: "sair do turno e ir direto". */
  compromisso: string | null
  lembretesAutomaticos: ('D-3' | 'D-1')[]
}

export interface Passo {
  id: string
  categoria: CategoriaPasso
  titulo: string
  detalhe: string
  /** O que a pessoa ganha no curto prazo. */
  ganho: string
  prazo: string
  feito: boolean
  /** Texto técnico original do plano, visível só se a pessoa quiser abrir. */
  itensTecnicos: string[] | null
}

export interface Selo {
  semanas: number
  nome: string
  emoji: string
}

/** Meta coletiva do turno: reconhece o grupo, nunca a pessoa. */
export interface MetaDoTurno {
  turno: string
  valor: number
  meta: number
}

// ---------------------------------------------------------------- exames

export type StatusExame = 'pedido' | 'coletado' | 'resultado'

/** O que a enfermagem vê: a etapa e se a pessoa já abriu. O laudo com os valores fica no S+. */
export interface AndamentoDoExame {
  id: string
  titulo: string
  status: StatusExame
  resultadoVisto: boolean
}

export interface ItemDoResultado {
  /** Nome técnico, como no laudo. */
  nome: string
  /** O que é, em linguagem do dia a dia. */
  simples: string
  valor: string
  referencia: string
  /** atencao = vale conversar no retorno. Nunca "grave": isso é conversa com a médica. */
  situacao: 'normal' | 'atencao'
  explicacao: string
}

/** O que o próprio trabalhador vê, com o resultado explicado. */
export interface Exame extends AndamentoDoExame {
  pedidoPor: string
  dataPedido: string
  dataColeta: string | null
  dataResultado: string | null
  /** Passo do plano ligado a este exame: marcar o passo como feito registra a coleta. */
  passoId: string | null
  itens: ItemDoResultado[]
}

// ---------------------------------------------------------------- celular do trabalhador

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
  | 'se_turno'
  | 'se_folga'
  | 'se_so_lembrete'

export interface Mensagem {
  id: string
  de: 'sesi' | 'trabalhador'
  texto: string
  hora: string
  /** Botões de resposta. Só a última mensagem do SESI tem. */
  acoes: Acao[] | null
  passoId: string | null
}

export interface MinhaDificuldade {
  id: string
  motivo: MotivoDificuldade
  passoId: string | null
  resolvida: boolean
}

export interface MeuCuidado {
  id: string
  nome: string
  enfermeira: string
  unidade: string
  motivacao: Motivacao | null
  turno: Turno
  consulta: Consulta | null
  statusPlano: StatusPlano
  semanasSeguidas: number
  selos: Selo[]
  passos: Passo[]
  dificuldades: MinhaDificuldade[]
  /** Opções da pergunta "qual é o seu primeiro passo?", enquanto ela estiver pendente. */
  checagem: string[] | null
  /** Exames pedidos e resultados, do mais recente para o mais antigo. Só o próprio trabalhador vê os valores. */
  exames: Exame[]
  /** Há resultado novo que a pessoa ainda não abriu. */
  resultadoNaoVisto: boolean
  mensagens: Mensagem[]
  metaDoTurno: MetaDoTurno | null
}

export interface Horario {
  inicio: string
  local: string
  modalidade: Modalidade
  duracaoMin: number
  /** Por que o horário é bom para a pessoa, ex.: "logo após o turno". */
  dica: string | null
}

export interface HorariosDisponiveis {
  turnos: Turno[]
  horarios: Horario[]
}

// ---------------------------------------------------------------- totem

export interface UnidadeComTotem {
  slug: string
  unidade: string
}

export interface TelaInicialDoTotem {
  unidade: string
  turno: string
  respostasHoje: number
  metaDoTurno: MetaDoTurno | null
}

export interface Cracha {
  matricula: string
  nome: string
}

/** O que aparece na tela pública depois do crachá: data e hora, nunca o que é o atendimento. */
export interface CuidadoNoTotem {
  primeiroNome: string
  retorno: { data: string; local: string; modalidade: Modalidade; status: Exclude<StatusConsulta, 'faltou'> } | null
  passosFeitos: number
  passosNoPlano: number
  semanasSeguidas: number
  // Sem token: o link pessoal nunca aparece na tela pública. Vai para o WhatsApp da pessoa (POST /identificacao/link).
}

// ---------------------------------------------------------------- painel da APS

export interface Trabalhador {
  id: string
  /** Segredo do link pessoal do celular. */
  tokenAcesso: string
  matricula: string
  nome: string
  funcao: string
  empresa: string
  unidade: string
  medicoReferencia: string
  enfermeira: string
  motivacao: Motivacao | null
  turno: Turno
  risco: Risco
  ultimaConsultaMedica: string
  faltasUltimoAno: number
}

export interface Dificuldade {
  id: string
  motivo: MotivoDificuldade
  passoId: string | null
  origem: 'plano' | 'checkin' | 'teach_back'
  data: string
  resolvida: boolean
  nota: string | null
  /** O que a enfermagem pode fazer para este motivo. */
  acaoSugerida: string
}

export interface PlanoDeCuidado {
  status: StatusPlano
  dataEnvio: string | null
  teachBack: 'pendente' | 'acertou' | 'errou'
  semanasSeguidas: number
  selos: Selo[]
  passos: Passo[]
  dificuldades: Dificuldade[]
}

export type TipoRegistro =
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

export interface RegistroHistorico {
  id: string
  tipo: TipoRegistro
  data: string
  nota: string | null
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
  precisaAcao: boolean
  /** Próxima ação sugerida à enfermagem. */
  sugestao: string
}

export type NivelRiscoFalta = 'alto' | 'medio' | 'baixo'

/** Risco de a pessoa faltar, por regras explicáveis. Não confundir com o risco clínico (1 a 4). */
export interface RiscoFalta {
  pontos: number
  nivel: NivelRiscoFalta
  motivos: string[]
}

/** Uma pessoa na fila da enfermagem, com situação e risco de falta já calculados pelo servidor. */
export interface LinhaDaFila {
  trabalhador: Trabalhador
  consulta: Consulta | null
  plano: PlanoDeCuidado
  exames: AndamentoDoExame[]
  historico: RegistroHistorico[]
  ultimoContatoEnfermagem: string | null
  proximoMonitoramento: string
  pediuContato: boolean
  prazoRetorno: string
  situacao: Situacao
  riscoFalta: RiscoFalta
}

/** Desfecho do monitoramento, com os mesmos campos da ficha Gestão de Retorno. */
export interface Desfecho {
  feitoContato: boolean
  agendamentoRealizado: boolean
  mensagemEnviada: boolean
  aguardandoRetorno: boolean
  observacao: string
  proximoMonitoramento: string
}

// ---------------------------------------------------------------- liderança do turno

/** Compromisso de saúde dentro do turno. A liderança vê o horário; o nome, só se a pessoa autorizou. */
export interface Liberacao {
  id: string
  unidade: string
  turno: string
  inicio: string
  duracaoMin: number
  nome: string | null
}

export interface AgendaDoTurno {
  meta: number
  unidades: { unidade: string; turnos: { turno: Turno; emDia: number }[] }[]
  liberacoes: Liberacao[]
}

// ---------------------------------------------------------------- RH e direção (só agregados)

export interface IndicadoresDoPulso {
  respostas: number
  energiaBaixa: number
  dorForte: number
  sonoRuim: number
}

export interface IndicadoresDaUnidade {
  unidade: string
  vidas: number
  /** Funil do retorno nos últimos 30 dias. */
  funil: { contato: number; resposta: number; agendamento: number; comparecimento: number }
  comparecimentoAntes: number
  comparecimentoAgora: number
  planosRecebidos: number
  emDiaComRisco: number
  /** Contagens de 1 a 4 vêm omitidas (grupo mínimo): poderiam apontar pessoas. */
  motivos: Partial<Record<MotivoDificuldade, number>>
  respostasNoTotem: number
}

export interface PainelDaEmpresa {
  empresa: string
  /** Grupos menores que isso não aparecem. */
  minimoDoGrupo: number
  filtro: string
  unidades: IndicadoresDaUnidade[]
  unidadesOcultas: string[]
  vidas: number
  comparecimentoAntes: number
  comparecimentoAgora: number
  planosRecebidos: number
  pulso: IndicadoresDoPulso
  semanas: { rotulo: string; respostas: number }[]
  turnos: { unidade: string; turno: string; oculto: boolean; indicadores: IndicadoresDoPulso | null; alertas: string[] }[]
}
