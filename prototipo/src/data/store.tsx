import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { DataAdapter } from './adapter'
import type { Trabalhador } from './types'
import { MockAdapter } from './mockAdapter'

// Ponto único onde se escolhe a implementação. Para usar o S+: trocar por `new SPlusAdapter(...)`.
export const adapter = new MockAdapter()

const Ctx = createContext<{ adapter: DataAdapter; trabalhadores: Trabalhador[] } | null>(null)

export function DadosProvider({ children }: { children: ReactNode }) {
  const [trabalhadores, setTrabalhadores] = useState<Trabalhador[]>([])

  useEffect(() => {
    let vivo = true
    const carregar = () => adapter.listarTrabalhadores().then((d) => vivo && setTrabalhadores(d))
    carregar()
    const sair = adapter.assinar(carregar)
    return () => {
      vivo = false
      sair()
    }
  }, [])

  return <Ctx.Provider value={{ adapter, trabalhadores }}>{children}</Ctx.Provider>
}

export function useDados() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDados fora do DadosProvider')
  return v
}
