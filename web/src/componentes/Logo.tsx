// Logo oficial do Selo Saúde (o selo com a pessoa de braços abertos e o check). Arquivos em public/marca/:
// selo.png é só o selo; selo-saude.png é o selo com o nome e "Cuidado em evolução", feito para fundo escuro.

/** Só o selo. */
export function LogoMarca({ className = 'size-8' }: { className?: string }) {
  return <img src="/marca/selo.png" alt="" aria-hidden className={`${className} object-contain`} />
}

/** Selo com o nome "SeloSaúde" e "Cuidado em evolução". O nome é claro: use sobre fundo escuro. */
export function Logo({ tamanho = 'md', className = '' }: { tamanho?: 'sm' | 'md' | 'lg'; className?: string }) {
  const altura = { sm: 'h-8', md: 'h-11', lg: 'h-16' }[tamanho]
  return <img src="/marca/selo-saude.png" alt="Selo Saúde · Cuidado em evolução" className={`${altura} w-auto object-contain ${className}`} />
}
