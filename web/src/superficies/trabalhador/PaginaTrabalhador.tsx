import { useMemo } from 'react'
import { useParams } from 'react-router'
import type { MeuCuidado } from '../../api/tipos'
import { useRecurso } from '../../api/useRecurso'
import { AvisoDeFalha, TelaCheia } from '../../componentes/TelaCheia'
import { ContextoDasAcoes, criarAcoes } from './acoes'
import { CelularTrabalhador } from './CelularTrabalhador'

/** Página pessoal do trabalhador, aberta pelo link do WhatsApp. O token do link é a única credencial. */
export function PaginaTrabalhador() {
  const { token = '' } = useParams()
  const base = `/trabalhador/${token}`
  const { dados, erro, falha, enviar } = useRecurso<MeuCuidado>(base, `${base}/eventos`)
  const acoes = useMemo(() => criarAcoes(base, enviar), [base, enviar])

  if (!dados) return <TelaCheia>{erro ? 'Este link não é válido. Peça um novo à equipe de saúde do SESI.' : 'Abrindo o seu cuidado…'}</TelaCheia>

  return (
    <ContextoDasAcoes.Provider value={acoes}>
      <div className="mx-auto h-dvh max-w-md overflow-hidden bg-white shadow-xl">
        <CelularTrabalhador trabalhador={dados} />
      </div>
      <AvisoDeFalha mensagem={falha} />
    </ContextoDasAcoes.Provider>
  )
}
