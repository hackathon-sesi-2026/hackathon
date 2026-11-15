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
  beneficios: MeusBeneficios
  /** WhatsApp da equipe de saúde (só dígitos), quando configurado. */
  contatoEquipe: string | null
}

export interface ItemDoCatalogo {
  id: string
  titulo: string
  descricao: string
  pontos: number
  /** academia, marketplace, curso ou saude. */
  icone: string
  podeResgatar: boolean
}

export interface MeuResgate {
  id: string
  beneficioId: string
  titulo: string
  codigo: string
  pontos: number
  criadoEm: string
}

/** Pontos de participação (passos feitos e semanas de cuidado) e os benefícios que dá para resgatar com eles. */
export interface MeusBeneficios {
  pontos: number
  saldo: number
  comoGanhar: string[]
  catalogo: ItemDoCatalogo[]
  resgates: MeuResgate[]
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
}

/** O que aparece na tela pública depois do CPF: data e hora, nunca o que é o atendimento. */
export interface CuidadoNoTotem {
  primeiroNome: string
  /** "faltou": a consulta já passou e a pessoa não compareceu. */
  retorno: { data: string; local: string; modalidade: Modalidade; status: StatusConsulta } | null
  /** Consultas perdidas nos últimos 12 meses. */
  faltasNoAno: number
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
  /** Só os 11 dígitos. Usado para entrar no totem. */
  cpf: string | null
  nome: string
  funcao: string
  /** AAAA-MM-DD, do cadastro do S+. */
  dataNascimento: string
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
  | 'checkin_enviado'
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
  engajamento: Engajamento
  /** Lida do risco do SESI (3 compensada, 4 descompensada), sem diagnóstico. */
  doencaCronica: 'nao' | 'compensada' | 'descompensada'
}

/** Participação no programa, de 0 a 100. É uso do canal e da agenda, não adesão ao tratamento. */
export interface Engajamento {
  pontos: number
  nivel: 'alto' | 'medio' | 'baixo'
  itens: { rotulo: string; comoEsta: string; pontos: number; maximo: number }[]
}

/** Números do topo do painel da APS, já com os filtros (menos o de situação). */
export interface ResumoDaFila {
  total: number
  precisamAcao: number
  porSituacao: Record<CodigoSituacao, number>
  porRiscoFalta: Record<NivelRiscoFalta, number>
  /** Dificuldades em aberto, por motivo do "não consegui". */
  motivos: Partial<Record<MotivoDificuldade, number>>
  empresas: string[]
  enfermeiras: string[]
}

/** O que a lista e o pipeline mostram de cada pessoa. A ficha completa vem de GET /aps/trabalhadores/{id}. */
export interface PessoaNaCarteira {
  trabalhador: Trabalhador
  consulta: Consulta | null
  statusPlano: StatusPlano
  prazoRetorno: string
  situacao: Situacao
  riscoFalta: RiscoFalta
  /** A última mensagem que o SESI mandou (lembrete, check-in, plano, resultado). */
  ultimoEnvio: RegistroHistorico | null
  ultimoContatoEnfermagem: string | null
}

/** O que o SESI mandou pelo WhatsApp nos últimos 30 dias (GET /aps/mensagens). Uso do canal, não adesão. */
export interface MetricasDasMensagens {
  envios: number
  respostas: number
  pessoasAlcancadas: number
  /** Das alcançadas, quantas responderam ao menos uma vez. */
  pessoasQueResponderam: number
  porTipo: Partial<Record<TipoRegistro, number>>
  /** Envios por dia, dos últimos 14 dias, do mais antigo para hoje. */
  porDia: number[]
  ultimos: { trabalhadorId: string; nome: string; empresa: string; tipo: TipoRegistro; data: string }[]
}

/** Uso e respostas dos totens, agregados e anônimos (GET /aps/totens). */
export interface MetricasDoTotem {
  unidades: string[]
  respostas: number
  respostasHoje: number
  porDia: { dia: string; respostas: number }[]
  /** 24 posições: respostas por hora do dia. */
  porHora: number[]
  /** "1" cansado(a), "2" mais ou menos, "3" bem, "4" muito bem. */
  bemEstar: Record<'1' | '2' | '3' | '4', number>
  /** "0" nenhuma, "1" leve, "2" média, "3" forte. */
  intensidade: Record<'0' | '1' | '2' | '3', number>
  locaisDeDor: Partial<Record<LocalDor, number>>
  /** `inicio`/`fim` são as horas do turno (do cadastro); nulas se o turno não estiver mais no cadastro. */
  porTurno: { unidade: string; turno: string; inicio: number | null; fim: number | null; respostas: number; oculto: boolean; cansados: number | null; comDor: number | null }[]
}

/** "Testar no meu WhatsApp" (POST /demonstracao/whatsapp/teste). */
export type MensagemDeTeste = 'lembrete' | 'como_voce_esta' | 'pergunta_da_semana' | 'link_pessoal'
export interface ResultadoDoTeste {
  envioReal: boolean
  enviado: boolean
  numeroMascarado: string
}

/** Uma indústria parceira na carteira da APS (GET /aps/empresas). */
export interface EmpresaNaCarteira {
  empresa: string
  total: number
  precisamAcao: number
  pediramAjuda: number
  faltaram: number
  foraDoPrazo: number
  altoRisco: number
  emDia: number
}

/** Visão em lista: uma página da carteira filtrada (GET /aps/lista). */
export interface PaginaDaFila {
  total: number
  pagina: number
  porPagina: number
  linhas: PessoaNaCarteira[]
  resumo: ResumoDaFila
}

/** Visão em pipeline: uma coluna por situação, com o total e as primeiras pessoas (GET /aps/pipeline). */
export interface PipelineDaFila {
  colunas: { situacao: CodigoSituacao; total: number; linhas: PessoaNaCarteira[] }[]
  resumo: ResumoDaFila
}

export type OrdemDaFila = 'prioridade' | 'risco_falta' | 'prazo' | 'nome'

export type MensagemDaCadencia ='lembrete_d1' | 'lembrete_d3' | 'convite_retorno' | 'como_voce_esta' | 'pergunta_da_semana'

/** Uma mensagem que o agendador mandou ao rodar a cadência do dia. */
export interface EnvioDaCadencia {
  trabalhadorId: string
  nome: string
  mensagem: MensagemDaCadencia
  rotulo: string
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
  unidades: { unidade: string; turnos: { turno: Turno; emDia: number }[] }[]
  liberacoes: Liberacao[]
}

// ---------------------------------------------------------------- RH e direção (só agregados)

export interface IndicadoresDoPulso {
  respostas: number
  /** % que responderam "Cansado(a)". */
  cansados: number
  /** % que responderam "Mais ou menos". */
  maisOuMenos: number
  /** % que tocaram algum lugar no "Onde dói mais?". */
  comDor: number
}

export interface IndicadoresDaUnidade {
  unidade: string
  vidas: number
  /** Funil do retorno nos últimos 30 dias. */
  /** Acompanhamento nos últimos 30 dias, na ordem da jornada. */
  funil: { whatsapp: number; exame: number; consulta: number; reavaliacao: number }
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
  /** As 5 especialidades médicas mais procuradas em 30 dias, agregado das unidades do filtro. */
  especialidades: ItemContado[]
  /** Os 5 locais de dor mais citados no totem, só de grupos com 5 ou mais respostas. */
  locaisDeDor: ItemContado[]
}

export interface ItemContado {
  codigo: string
  rotulo: string
  vezes: number
}

/** Região do corpo tocada no boneco do totem. */
/** "Você sente alguma dor hoje?": 0 nenhuma, 1 leve, 2 média, 3 forte. */
export type IntensidadeDor = 0 | 1 | 2 | 3

export type LocalDor ='cabeca' | 'pescoco' | 'ombros' | 'peito' | 'barriga' | 'bracos' | 'maos_punhos' | 'costas' | 'lombar' | 'quadril' | 'joelhos' | 'pernas_pes'
