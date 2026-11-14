import { Apple, Brain, Droplets, Footprints, Pill, Stethoscope, Syringe, TestTube, type LucideIcon } from 'lucide-react'
import type { CategoriaPasso } from '../data/types'

export const ICONE_CATEGORIA: Record<CategoriaPasso, { Icone: LucideIcon; cor: string }> = {
  exames: { Icone: TestTube, cor: 'bg-blue-50 text-tech' },
  nutricao: { Icone: Apple, cor: 'bg-emerald-50 text-saude-700' },
  atividade: { Icone: Footprints, cor: 'bg-amber-50 text-amber-600' },
  vacina: { Icone: Syringe, cor: 'bg-sky-50 text-sky-600' },
  psicologia: { Icone: Brain, cor: 'bg-violet-50 text-violet-600' },
  remedio: { Icone: Pill, cor: 'bg-rose-50 text-rose-600' },
  retorno: { Icone: Stethoscope, cor: 'bg-blue-50 text-navy' },
  habitos: { Icone: Droplets, cor: 'bg-cyan-50 text-cyan-600' },
}

export function IconeCategoria({ categoria, tamanho = 'size-10' }: { categoria: CategoriaPasso; tamanho?: string }) {
  const { Icone, cor } = ICONE_CATEGORIA[categoria]
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${tamanho} ${cor}`}>
      <Icone className="size-5" strokeWidth={2} />
    </span>
  )
}
