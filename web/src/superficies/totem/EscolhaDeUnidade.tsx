import { Navigate } from 'react-router'
import type { UnidadeComTotem } from '../../api/tipos'
import { useRecurso } from '../../api/useRecurso'
import { TelaCheia } from '../../componentes/TelaCheia'

/**
 * `/totem` sem unidade: o aparelho é configurado na instalação com a sua unidade no endereço
 * (`/totem/:unidade`). Aqui só se encaminha para a primeira unidade com totem, sem perguntar nada.
 */
export function EscolhaDeUnidade() {
  const { dados, erro } = useRecurso<UnidadeComTotem[]>('/totem/unidades')

  if (!dados) return <TelaCheia>{erro ?? 'Carregando…'}</TelaCheia>
  if (dados.length === 0) return <TelaCheia>Nenhuma unidade com totem configurada.</TelaCheia>

  return <Navigate to={`/totem/${dados[0].slug}`} replace />
}
