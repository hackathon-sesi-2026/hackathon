import type { ReactNode } from 'react'
import { LogoMarca } from './Logo'

/** Estado de página inteira: carregando, link inválido, sem conexão. */
export function TelaCheia({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-dvh place-items-center bg-navy p-6 text-center text-white">
      <div className="flex max-w-xs flex-col items-center gap-3">
        <LogoMarca className="size-12" />
        <div className="text-sm text-blue-100">{children}</div>
      </div>
    </div>
  )
}

/** Aviso passageiro quando a API recusa uma ação. */
export function AvisoDeFalha({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null
  return (
    <p role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl bg-alerta px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
      {mensagem}
    </p>
  )
}
