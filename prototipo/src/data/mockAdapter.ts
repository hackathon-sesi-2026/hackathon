import type { DataAdapter } from './adapter'
import type { Acao, Horario, Mensagem, Monitoramento, TipoEvento, Trabalhador, Turno } from './types'
import { criarDados } from './seed'
import { gerarHorarios } from '../domain/regras'
import { textoLembrete, textoPlano } from '../domain/mensagens'
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
  private ouvintes = new Set<() => void>()

  reiniciar() {
    this.dados = criarDados()
    this.notificar()
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
      this.responder(t, 'Confirmo ✅', 'confirmou')
      this.sesi(t, `Combinado! Te esperamos ${diaSemana(t.consulta.data)}, às ${horaCurta(t.consulta.data)}. Um dia antes eu te lembro de novo.`)
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

  async agendar(id: string, h: Horario) {
    this.alterar(id, (t) => {
      t.consulta = {
        id: novoId('c'),
        data: h.inicio,
        local: h.local,
        profissional: 'Enfermeira de cuidado',
        modalidade: h.modalidade,
        status: 'confirmada',
      }
      const onde = h.modalidade === 'online' ? 'por vídeo (o link chega aqui no dia)' : `no ${h.local}`
      this.evento(t, 'agendou', `${diaSemana(h.inicio)}, ${horaCurta(h.inicio)} · ${h.modalidade}`)
      this.sesi(t, `Pronto! Seu retorno ficou para ${diaSemana(h.inicio)}, às ${horaCurta(h.inicio)}, ${onde}. Um dia antes eu te lembro.`)
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
      if (feito) this.evento(t, 'passo_feito', p.titulo)
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
