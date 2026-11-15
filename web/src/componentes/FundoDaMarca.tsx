/** O mesmo fundo do totem (superficies/totem/Moldura.tsx): azul profundo com brilhos nos cantos. */
export const FUNDO_DA_MARCA =
  'radial-gradient(120% 40% at 100% 0%, #1a50c2 0%, rgba(26,80,194,0) 62%), radial-gradient(110% 35% at 0% 100%, #0e50cc 0%, rgba(14,80,204,0) 65%), linear-gradient(170deg, #0a3090 0%, #071f5f 40%, #05154a 72%, #07267a 100%)'

/** Ondas luminosas do totem, no pé de uma superfície com o fundo da marca. A superfície precisa ser `relative` e cortar o excesso. */
export function OndasDaMarca({ className = 'h-56' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none absolute inset-x-0 bottom-0 w-full ${className}`} viewBox="0 0 240 220" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="onda-da-marca" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1c63e6" />
          <stop offset="1" stopColor="#22a6ff" />
        </linearGradient>
      </defs>
      <path d="M0 120 C60 95 130 150 240 110 L240 220 L0 220 Z" fill="#1a47c2" opacity="0.35" />
      <path d="M0 160 C70 135 150 185 240 150 L240 220 L0 220 Z" fill="url(#onda-da-marca)" opacity="0.4" />
      <path d="M0 160 C70 135 150 185 240 150" fill="none" stroke="#8fdcff" strokeOpacity="0.45" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
