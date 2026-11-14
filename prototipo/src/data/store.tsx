import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { DataAdapter } from './adapter'
import type { Liberacao, Pulso, Trabalhador } from './types'
import { MockAdapter } from './mockAdapter'

// Ponto único onde se escolhe a implementação. Para usar o S+: trocar por `new SPlusAdapter(...)`.
export const adapter = new MockAdapter()

interface Dados {
  adapter: DataAdapter
  trabalhadores: Trabalhador[]
  pulsos: Pulso[]
  liberacoes: Liberacao[]
}

const Ctx = createContext<Dados | null>(null)

export function DadosProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Omit<Dados, 'adapter'>>({ trabalhadores: [], pulsos: [], liberacoes: [] })

  useEffect(() => {
    let vivo = true
    const carregar = () =>
      Promise.all([adapter.listarTrabalhadores(), adapter.listarPulsos(), adapter.listarLiberacoes()]).then(
        ([trabalhadores, pulsos, liberacoes]) => vivo && setEstado({ trabalhadores, pulsos, liberacoes }),
      )
    carregar()
    const sair = adapter.assinar(carregar)
    return () => {
      vivo = false
      sair()
    }
  }, [])

  return <Ctx.Provider value={{ adapter, ...estado }}>{children}</Ctx.Provider>
}

export function useDados() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDados fora do DadosProvider')
  return v
}
