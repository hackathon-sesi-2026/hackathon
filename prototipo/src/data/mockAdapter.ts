import type { DataAdapter } from './adapter'
import type { Acao, Horario, Liberacao, Mensagem, Monitoramento, Motivacao, MotivoDificuldade, Pulso, TipoEvento, Trabalhador, Turno } from './types'
import { criarDados } from './seed'
import { gerarLiberacoes, gerarPulsos } from './unidades'
import { RESPOSTA_MOTIVO, ROTULO_MOTIVO, gerarHorarios } from '../domain/regras'
import { COMPROMISSO, SELOS, textoCheckinHabito, textoConfirmado, textoLembrete, textoLembreteAuto, textoPlano } from '../domain/mensagens'
import { data, diaSemana, horaCurta } from '../lib/datas'

let seq = 0
const novoId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

/**
 * Adaptador simulado: guarda os dados fictícios em memória e imita o S+ + WhatsApp.
 * Um adaptador S+ real implementaria a mesma interface (DataAdapter).
 */
export class MockAdapter implements DataAdapter {
  readonly nome = 'Adaptador simulado · dados fictícios'
  private dados: Trabalhador[] = criarDados()
  private pulsos: Pulso[] = gerarPulsos()
  private liberacoesBase: Liberacao[] = gerarLiberacoes()
  /** Quem já somou uma semana na sequência nesta sessão de demo. */
  private semanaContada = new Set<string>()
  private ouvintes = new Set<() => void>()

  reiniciar() {
    this.dados = criarDados()
    this.pulsos = gerarPulsos()
    this.liberacoesBase = gerarLiberacoes()
    this.semanaContada.clear()
    this.notificar()
  }

  async listarPulsos() {
    return [...this.pulsos]
  }

  async listarLiberacoes(): Promise<Liberacao[]> {
    // Base fictícia + consultas "no turno" marcadas no protótipo (nome só com autorização).
    const doPrototipo = this.dados
      .filter((t) => t.consulta?.modalidade === 'no_turno' && t.consulta.status !== 'faltou')
      .map((t) => ({
        id: `lib-${t.id}`,
        unidade: t.unidade,
        turno: t.turno.nome,
        inicio: t.consulta!.data,
        duracaoMin: 20,
        nome: t.consulta!.nomeParaLideranca ? `${t.nome.split(' ')[0]} ${t.nome.split(' ').slice(-1)[0][0]}.` : undefined,
      }))
    return [...this.liberacoesBase, ...doPrototipo]
  }

  async registrarPulso(p: Omit<Pulso, 'id' | 'data'>) {
    this.pulsos.push({ ...p, id: novoId('p'), data: new Date().toISOString() })
    this.notificar()
  }

  async definirMotivacao(id: string, m: Motivacao) {
    this.alterar(id, (t) => {
      t.motivacao = m
    })
  }

  /** Sequência semanal: a primeira ação de cuidado da semana soma 1 (gatilho de progresso). */
  private contarSemana(t: Trabalhador) {
    if (this.semanaContada.has(t.id)) return
    this.semanaContada.add(t.id)
    t.semanasSeguidas += 1
    // Selo ao atingir um marco (reconhecimento individual, sem ranking nem comparação).
    const selo = SELOS.find((s) => s.semanas === t.semanasSeguidas)
    if (selo) {
      this.evento(t, 'selo', `${selo.emoji} ${selo.nome}`)
      this.selosPendentes.set(t.id, `${selo.emoji} Você ganhou o selo "${selo.nome}": ${t.semanasSeguidas} semanas seguidas cuidando de você. Ele fica no seu plano.`)
    }
  }

  /** Mensagem de selo é enviada depois da resposta da ação que o gerou (para a conversa ficar natural). */
  private selosPendentes = new Map<string, string>()
  private entregarSelo(t: Trabalhador) {
    const msg = this.selosPendentes.get(t.id)
    if (!msg) return
    this.selosPendentes.delete(t.id)
    const acoes = t.mensagens[t.mensagens.length - 1]?.acoes
    this.sesi(t, msg)
    // Mantém os botões da mensagem anterior (ex.: se-então) no fim da conversa.
    if (acoes) t.mensagens[t.mensagens.length - 1].acoes = acoes
  }

  async escolherCompromisso(id: string, acao: Acao) {
    this.alterar(id, (t) => {
      if (!t.consulta) return
      const texto = COMPROMISSO[acao]
      this.responder(t, acao === 'se_turno' ? 'Saio do turno e vou direto' : acao === 'se_folga' ? 'Vou no meu dia de folga' : 'Só me lembre', 'compromisso')
      if (texto) {
        t.consulta.compromisso = texto
        const quando = diaSemana(t.consulta.data)
        this.sesi(
          t,
          acao === 'se_turno'
            ? `Fechado: quando sair do turno na ${quando}, você vai direto. Eu te lembro disso um dia antes. 💪`
            : `Fechado: você vai no seu dia de folga, ${quando}. Eu te lembro um dia antes. 💪`,
        )
      } else {
        this.sesi(t, 'Combinado, só o lembrete. 👍')
      }
    })
  }

  async verResultados(id: string) {
    if (!this.buscar(id).resultadoNaoVisto) return
    this.alterar(id, (t) => {
      t.resultadoNaoVisto = false
      this.evento(t, 'resultado_visto')
    })
  }

  async liberarResultado(id: string, exameId: string) {
    this.alterar(id, (t) => {
      const ex = t.exames.find((e) => e.id === exameId)
      if (!ex || ex.status === 'resultado') return
      const agora = new Date().toISOString()
      ex.dataColeta ??= agora
      ex.dataResultado = agora
      ex.status = 'resultado'
      t.resultadoNaoVisto = true
      // Sem nenhum valor no WhatsApp: só o aviso e o caminho para a página pessoal.
      this.sesi(
        t,
        `Oi, ${t.nome.split(' ')[0]}! Aqui é a ${t.enfermeira}. O resultado dos seus exames saiu. Veja na sua página pessoal, com explicação simples. Por segurança, aqui não mostramos detalhes.`,
        ['exames'],
      )
      this.evento(t, 'resultado_liberado', ex.titulo)
    })
  }

  /** Marcar o passo de exames como feito = coleta realizada. */
  private registrarColeta(t: Trabalhador, passoId: string) {
    const ex = t.exames.find((e) => e.passoId === passoId && e.status === 'pedido')
    if (!ex) return
    ex.status = 'coletado'
    ex.dataColeta = new Date().toISOString()
    this.evento(t, 'exame_coletado', ex.titulo)
  }

  async simularLembreteAuto(id: string, qual: 'D-3' | 'D-1') {
    this.alterar(id, (t) => {
      if (!t.consulta || t.consulta.status === 'faltou') return
      const l = textoLembreteAuto(t, qual)
      this.sesi(t, l.texto, l.acoes)
      t.consulta.lembretesAutoEnviados = [...(t.consulta.lembretesAutoEnviados ?? []), qual]
      this.evento(t, 'lembrete_auto', qual)
    })
  }

  assinar(cb: () => void) {
    this.ouvintes.add(cb)
    return () => {
      this.ouvintes.delete(cb)
    }
  }

  async listarTrabalhadores() {
    return structuredClone(this.dados)
  }

  async confirmarConsulta(id: string) {
    this.alterar(id, (t) => {
      if (!t.consulta) return
      t.consulta.status = 'confirmada'
      this.contarSemana(t)
      this.responder(t, 'Confirmo ✅', 'confirmou')
      const c = textoConfirmado(t)
      this.sesi(t, c.texto, c.acoes.length ? c.acoes : undefined)
      this.entregarSelo(t)
    })
  }

  async pedirRemarcacao(id: string) {
    this.alterar(id, (t) => {
      if (t.consulta) t.consulta.status = 'remarcar'
      this.responder(t, 'Preciso remarcar', 'pediu_remarcar')
      this.sesi(t, 'Sem problema! Escolha um horário que não bata com o seu turno. Tem opção por vídeo também.', ['escolher_horario'])
    })
  }

  async listarHorarios(id: string): Promise<Horario[]> {
    return gerarHorarios(this.buscar(id))
  }

  async agendar(id: string, h: Horario, nomeParaLideranca = false) {
    this.alterar(id, (t) => {
      t.consulta = {
        id: novoId('c'),
        data: h.inicio,
        local: h.local,
        profissional: 'Enfermeira de cuidado',
        modalidade: h.modalidade,
        status: 'confirmada',
        nomeParaLideranca: h.modalidade === 'no_turno' ? nomeParaLideranca : undefined,
      }
      this.contarSemana(t)
      const onde =
        h.modalidade === 'online'
          ? 'por vídeo (o link chega aqui no dia)'
          : h.modalidade === 'no_turno'
            ? `no ${h.local}, dentro do seu turno (20 min). Sua liderança recebe só o horário da liberação${nomeParaLideranca ? '' : ', sem o seu nome'}, nunca o motivo`
            : `no ${h.local}`
      this.evento(t, 'agendou', `${diaSemana(h.inicio)}, ${horaCurta(h.inicio)} · ${h.modalidade}`)
      this.sesi(t, `Pronto! Seu retorno ficou para ${diaSemana(h.inicio)}, às ${horaCurta(h.inicio)}, ${onde}.`)
      const c = textoConfirmado(t)
      this.sesi(t, c.texto, c.acoes.length ? c.acoes : undefined)
      this.entregarSelo(t)
    })
  }

  async atualizarTurno(id: string, turno: Turno) {
    this.alterar(id, (t) => {
      t.turno = turno
      this.evento(t, 'turno_atualizado', turno.nome)
    })
  }

  async abrirPlano(id: string) {
    const t = this.buscar(id)
    if (t.statusPlano === 'recebido') return
    this.alterar(id, (t) => {
      t.statusPlano = 'recebido'
      this.evento(t, 'plano_recebido')
    })
  }

  async marcarPasso(id: string, passoId: string, feito: boolean) {
    this.alterar(id, (t) => {
      const p = t.plano.find((x) => x.id === passoId)
      if (!p) return
      p.feito = feito
      if (feito) {
        this.contarSemana(t)
        this.evento(t, 'passo_feito', p.titulo)
        this.registrarColeta(t, p.id)
        this.entregarSelo(t)
      }
    })
  }

  async responderCheckin(id: string, tudoBem: boolean) {
    this.alterar(id, (t) => {
      if (tudoBem) {
        this.responder(t, 'Tudo bem 👍', 'checkin_ok')
        this.sesi(t, 'Que bom! Continue com o seu plano. Se precisar de algo, é só chamar.')
      } else {
        t.pediuContato = true
        this.responder(t, 'Quero falar com a enfermeira', 'checkin_ajuda')
        this.sesi(t, 'Certo! A enfermeira vai entrar em contato com você em até 2 dias úteis.')
      }
    })
  }

  async responderHabito(id: string, passoId: string, fez: boolean) {
    this.alterar(id, (t) => {
      if (fez) {
        const p = t.plano.find((x) => x.id === passoId)
        if (p) p.feito = true
        this.registrarColeta(t, passoId)
        this.contarSemana(t)
        this.responder(t, 'Consegui ✅', 'passo_feito')
        this.sesi(t, 'Boa! Cada passo conta. Seu próximo passo já está no seu plano.', ['plano'])
        this.entregarSelo(t)
      } else {
        // O motivo é escolhido em seguida (relatarDificuldade); aqui só registra a resposta.
        this.responder(t, 'Não consegui 😕', 'checkin_habito')
      }
    })
  }

  async relatarDificuldade(id: string, motivo: MotivoDificuldade, origem: 'plano' | 'checkin', passoId?: string) {
    this.alterar(id, (t) => {
      t.dificuldades.push({ id: novoId('d'), motivo, passoId, origem, data: new Date().toISOString(), resolvida: false })
      if (origem === 'checkin') {
        this.limparAcoes(t)
        t.mensagens.push({ id: novoId('m'), de: 'trabalhador', texto: ROTULO_MOTIVO[motivo], hora: new Date().toISOString() })
      }
      const acoes: Acao[] | undefined = motivo === 'tempo' || motivo === 'transporte' ? ['escolher_horario'] : undefined
      this.sesi(t, RESPOSTA_MOTIVO[motivo], acoes)
      this.evento(t, 'dificuldade', ROTULO_MOTIVO[motivo])
    })
  }

  async responderTeachBack(id: string, acertou: boolean) {
    this.alterar(id, (t) => {
      t.teachBack = acertou ? 'acertou' : 'errou'
      this.evento(t, 'teach_back', acertou ? 'acertou a pergunta de checagem' : 'errou a pergunta de checagem')
      if (!acertou) {
        t.dificuldades.push({ id: novoId('d'), motivo: 'nao_entendi', passoId: t.plano.find((p) => !p.feito)?.id, origem: 'teach_back', data: new Date().toISOString(), resolvida: false })
      }
    })
  }

  async enviarCheckinHabito(id: string) {
    this.alterar(id, (t) => {
      const c = textoCheckinHabito(t)
      if (!c) return
      this.limparAcoes(t)
      t.mensagens.push({ id: novoId('m'), de: 'sesi', texto: c.texto, hora: new Date().toISOString(), acoes: c.acoes, passoId: c.passoId })
      this.evento(t, 'checkin_habito', 'check-in enviado')
    })
  }

  async resolverDificuldade(id: string, dificuldadeId: string, nota: string) {
    this.alterar(id, (t) => {
      const d = t.dificuldades.find((x) => x.id === dificuldadeId)
      if (!d) return
      d.resolvida = true
      d.nota = nota || undefined
      if (d.origem === 'teach_back') t.teachBack = 'acertou'
      t.ultimoContatoEnfermagem = new Date().toISOString()
      this.evento(t, 'dificuldade_resolvida', `${ROTULO_MOTIVO[d.motivo]}${nota ? ` — ${nota}` : ''}`)
    })
  }

  async enviarLembrete(id: string) {
    this.alterar(id, (t) => {
      const l = textoLembrete(t)
      this.sesi(t, l.texto, l.acoes)
      this.evento(t, 'lembrete')
    })
  }

  async enviarPlano(id: string) {
    this.alterar(id, (t) => {
      const p = textoPlano(t)
      this.sesi(t, p.texto, p.acoes)
      if (t.statusPlano !== 'recebido') t.statusPlano = 'enviado'
      t.dataEnvioPlano = new Date().toISOString()
      this.evento(t, 'plano_enviado')
    })
  }

  async registrarMonitoramento(id: string, m: Monitoramento) {
    this.alterar(id, (t) => {
      if (m.feitoContato) {
        t.pediuContato = false
        t.ultimoContatoEnfermagem = new Date().toISOString()
      }
      t.proximoMonitoramento = m.proximoMonitoramento
      const desfechos = [
        m.feitoContato ? 'contato feito' : 'sem contato',
        m.agendamentoRealizado && 'agendamento realizado',
        m.mensagemEnviada && 'mensagem enviada',
        m.aguardandoRetorno && 'aguardando retorno',
      ].filter(Boolean)
      const nota = `${desfechos.join(', ')} · próximo: ${data(m.proximoMonitoramento)}${m.observacao ? ` — ${m.observacao}` : ''}`
      this.evento(t, 'monitoramento', nota)
    })
  }

  // ---- internos ----

  private buscar(id: string): Trabalhador {
    const t = this.dados.find((x) => x.id === id)
    if (!t) throw new Error(`Trabalhador ${id} não encontrado`)
    return t
  }

  private alterar(id: string, fn: (t: Trabalhador) => void) {
    fn(this.buscar(id))
    this.notificar()
  }

  private notificar() {
    this.ouvintes.forEach((cb) => cb())
  }

  /** Só a última mensagem do SESI fica clicável. */
  private limparAcoes(t: Trabalhador) {
    t.mensagens.forEach((m) => delete m.acoes)
  }

  private sesi(t: Trabalhador, texto: string, acoes?: Acao[]) {
    this.limparAcoes(t)
    const m: Mensagem = { id: novoId('m'), de: 'sesi', texto, hora: new Date().toISOString(), acoes }
    t.mensagens.push(m)
  }

  private responder(t: Trabalhador, texto: string, tipo: TipoEvento) {
    this.limparAcoes(t)
    t.mensagens.push({ id: novoId('m'), de: 'trabalhador', texto, hora: new Date().toISOString() })
    this.evento(t, tipo)
  }

  private evento(t: Trabalhador, tipo: TipoEvento, nota?: string) {
    t.eventos.push({ id: novoId('e'), tipo, data: new Date().toISOString(), nota })
  }
}
