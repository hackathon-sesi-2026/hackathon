import { useId } from 'react'

/** Coração com pessoa, em degradê Verde Saúde → Azul Tech (referência visual). */
export function LogoMarca({ className = 'size-8' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 48 44" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path
        d="M24 40.5C10.5 31 3 23 3 14.2 3 7.7 8 3 14 3c4.4 0 8 2.4 10 6 2-3.6 5.6-6 10-6 6 0 11 4.7 11 11.2C45 23 37.5 31 24 40.5Z"
        fill={`url(#${id})`}
      />
      <circle cx="24" cy="14.5" r="3.6" fill="white" />
      <path d="M15.5 18.5 24 30l8.5-11.5" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ tamanho = 'md', claro = true }: { tamanho?: 'sm' | 'md' | 'lg'; claro?: boolean }) {
  const marca = { sm: 'size-6', md: 'size-8', lg: 'size-11' }[tamanho]
  const texto = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }[tamanho]
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMarca className={marca} />
      <span className={`${texto} font-extrabold tracking-tight ${claro ? 'text-white' : 'text-navy'}`}>
        SESI <span className="text-saude">Saúde</span>
      </span>
    </span>
  )
}
