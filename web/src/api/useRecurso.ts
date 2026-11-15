import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './cliente'

export type Enviar = (metodo: 'post' | 'put', caminho: string, corpo?: unknown) => Promise<boolean>

/**
 * Lê um recurso da API e o mantém atualizado.
 *
 * O servidor avisa por SSE que algo mudou, sem mandar o dado: a tela busca de novo pela rota do seu público.
 * Ao (re)conectar também busca de novo, o que cobre os avisos perdidos enquanto o celular esteve em segundo plano.
 */
export function useRecurso<T>(caminho: string, caminhoDeEventos?: string) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const pedido = useRef(0)

  const recarregar = useCallback(async () => {
    const meu = ++pedido.current
    setCarregando(true)
    try {
      const resposta = await api.get<T>(caminho)
      // Só a resposta do pedido mais recente vale: evita uma resposta lenta sobrescrever uma nova.
      if (meu === pedido.current) {
        setDados(resposta)
        setErro(null)
      }
    } catch (e) {
      if (meu === pedido.current) setErro(e instanceof Error ? e.message : 'Sem conexão')
    } finally {
      if (meu === pedido.current) setCarregando(false)
    }
  }, [caminho])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  useEffect(() => {
    if (!caminhoDeEventos) return
    const fonte = new EventSource(api.urlDeEventos(caminhoDeEventos))
    fonte.addEventListener('mudou', recarregar)
    fonte.onopen = recarregar
    return () => fonte.close()
  }, [caminhoDeEventos, recarregar])

  useEffect(() => {
    if (!falha) return
    const id = setTimeout(() => setFalha(null), 5000)
    return () => clearTimeout(id)
  }, [falha])

  /** Executa uma ação e busca o recurso de novo. Se a API recusar, `falha` traz a mensagem para mostrar. */
  const enviar: Enviar = useCallback(
    async (metodo, caminhoDaAcao, corpo) => {
      try {
        await api[metodo](caminhoDaAcao, corpo)
        await recarregar()
        return true
      } catch (e) {
        setFalha(e instanceof Error ? e.message : 'Não foi possível concluir. Tente de novo.')
        return false
      }
    },
    [recarregar],
  )

  return { dados, erro, falha, carregando, recarregar, enviar }
}
