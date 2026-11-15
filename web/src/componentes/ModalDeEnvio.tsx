import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, X } from 'lucide-react'

export type TipoDeEnvio = 'lembrete' | 'plano' | 'checkin_habito' | 'checkin'

export interface PedidoDeEnvio {
  trabalhadorId: string
  nome: string
  tipo: TipoDeEnvio
}

/** O que cada envio faz, dito para a enfermeira antes de confirmar. Nunca cita dado clínico. */
const TEXTO: Record<TipoDeEnvio, { titulo: string; oQueAcontece: (nome: string) => string; botao: string }> = {
  lembrete: {
    titulo: 'Enviar lembrete do retorno',
    oQueAcontece: (n) => `${n} recebe no WhatsApp um lembrete do retorno, com botões para confirmar ou pedir outro horário.`,
    botao: 'Enviar lembrete',
  },
  plano: {
    titulo: 'Enviar plano de cuidado',
    oQueAcontece: (n) => `${n} recebe no WhatsApp o link do plano em linguagem simples, com os próximos passos.`,
    botao: 'Enviar plano',
  },
  checkin_habito: {
    titulo: 'Perguntar sobre o plano',
    oQueAcontece: (n) => `${n} recebe uma pergunta curta sobre como está indo com os passos do plano, e pode dizer "não consegui".`,
    botao: 'Enviar pergunta',
  },
  checkin: {
    titulo: 'Perguntar como está',
    oQueAcontece: (n) => `${n} recebe a pergunta "como você está desde o último atendimento?", com opções de resposta em um toque.`,
    botao: 'Enviar pergunta',
  },
}

const primeiroNome = (nome: string) => nome.split(' ')[0]

type Estado = { fase: 'confirmar' } | { fase: 'enviando' } | { fase: 'enviado' } | { fase: 'erro'; mensagem: string }

/**
 * Confirmação antes de mandar mensagem pelo WhatsApp, e o resultado depois: enviado, ou o erro com "tentar de novo".
 * `executar` devolve `true` quando a API aceitou, ou a mensagem de erro.
 */
export function ModalDeEnvio({ pedido, executar, fechar }: { pedido: PedidoDeEnvio | null; executar: (p: PedidoDeEnvio) => Promise<true | string>; fechar: () => void }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'confirmar' })
  const botaoPrincipal = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setEstado({ fase: 'confirmar' })
  }, [pedido])

  useEffect(() => {
    if (!pedido) return
    botaoPrincipal.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && estado.fase !== 'enviando') fechar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pedido, estado.fase, fechar])

  if (!pedido) return null
  const t = TEXTO[pedido.tipo]
  const nome = primeiroNome(pedido.nome)

  async function confirmar() {
    if (!pedido) return
    setEstado({ fase: 'enviando' })
    const r = await executar(pedido)
    setEstado(r === true ? { fase: 'enviado' } : { fase: 'erro', mensagem: r })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-envio-titulo">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={estado.fase === 'enviando' ? undefined : fechar} aria-label="Fechar" tabIndex={-1} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start gap-3 px-6 pt-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#25d366]/15 text-[#128c4a]">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="modal-envio-titulo" className="text-lg font-bold leading-tight text-navy">
              {estado.fase === 'enviado' ? `Enviado para ${nome}` : estado.fase === 'erro' ? 'Não foi possível enviar' : t.titulo}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">WhatsApp · {pedido.nome}</p>
          </div>
          {estado.fase !== 'enviando' && (
            <button type="button" onClick={fechar} aria-label="Fechar" className="grid size-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-navy">
              <X className="size-5" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 pt-4">
          {(estado.fase === 'confirmar' || estado.fase === 'enviando') && (
            <>
              <p className="text-sm leading-relaxed text-slate-700">{t.oQueAcontece(nome)}</p>
              <p className="mt-2 text-xs text-slate-500">A mensagem não leva nenhum dado clínico. A resposta aparece na fila e no histórico da pessoa.</p>
              <div className="mt-5 flex gap-2">
                <button
                  ref={botaoPrincipal}
                  type="button"
                  onClick={confirmar}
                  disabled={estado.fase === 'enviando'}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 text-sm font-bold text-[#073b24] shadow-[0_0.3rem_1rem_rgba(37,211,102,0.35)] transition hover:brightness-105 disabled:opacity-70"
                >
                  {estado.fase === 'enviando' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
                  {estado.fase === 'enviando' ? 'Enviando…' : t.botao}
                </button>
                <button type="button" onClick={fechar} disabled={estado.fase === 'enviando'} className="min-h-11 rounded-full px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                  Cancelar
                </button>
              </div>
            </>
          )}

          {estado.fase === 'enviado' && (
            <div role="status" aria-live="polite">
              <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-saude-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden /> Mensagem enviada pelo WhatsApp.
              </p>
              <p className="mt-3 text-xs text-slate-500">Quando {nome} responder, a situação na fila e o histórico atualizam sozinhos.</p>
              <button ref={botaoPrincipal} type="button" onClick={fechar} className="mt-5 min-h-11 w-full rounded-full bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-700">
                Fechar
              </button>
            </div>
          )}

          {estado.fase === 'erro' && (
            <div role="alert">
              <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>
                  <b className="block">A mensagem não saiu.</b>
                  {estado.mensagem}
                </span>
              </p>
              <p className="mt-3 text-xs text-slate-500">Nada foi registrado para {nome}. Você pode tentar de novo agora ou mais tarde.</p>
              <div className="mt-5 flex gap-2">
                <button ref={botaoPrincipal} type="button" onClick={confirmar} className="min-h-11 flex-1 rounded-full bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-700">
                  Tentar de novo
                </button>
                <button type="button" onClick={fechar} className="min-h-11 rounded-full px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
