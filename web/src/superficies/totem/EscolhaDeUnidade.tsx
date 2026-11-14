import { MonitorSmartphone } from 'lucide-react'
import { Link } from 'react-router'
import type { UnidadeComTotem } from '../../api/tipos'
import { useRecurso } from '../../api/useRecurso'
import { TelaCheia } from '../../componentes/TelaCheia'

/** Configuração do aparelho: define de qual unidade é este totem. É feita uma vez, na instalação. */
export function EscolhaDeUnidade() {
  const { dados, erro } = useRecurso<UnidadeComTotem[]>('/totem/unidades')

  if (!dados) return <TelaCheia>{erro ?? 'Carregando unidades…'}</TelaCheia>

  return (
    <TelaCheia>
      <p className="text-lg font-bold text-white">De qual unidade é este totem?</p>
      <div className="mt-4 grid gap-2">
        {dados.map((u) => (
          <Link key={u.slug} to={`/totem/${u.slug}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 text-left text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/15">
            <MonitorSmartphone className="size-5 text-saude" /> {u.unidade}
          </Link>
        ))}
      </div>
    </TelaCheia>
  )
}
