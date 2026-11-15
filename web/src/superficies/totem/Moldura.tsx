import type { ReactNode } from 'react'
import { ChevronLeft, ZoomIn } from 'lucide-react'
import { Logo } from '../../componentes/Logo'

// Peças visuais do totem, medidas no design (tela de retrato de 24rem x 38.4rem).
// A PaginaTotem ajusta o tamanho do rem para a tela inteira escalar junto, como no mockup; por isso todas as
// medidas daqui estão em rem.

/** Palco do totem: fundo azul com ondas luminosas na tela inteira e o conteúdo numa coluna de retrato. */
export function Palco({ ondas, children }: { ondas: 'altas' | 'baixas'; children: ReactNode }) {
  return (
    <div
      className="relative h-dvh overflow-hidden text-white"
      style={{
        fontFamily: '"Poppins", "Inter", ui-sans-serif, system-ui, sans-serif',
        background:
          'radial-gradient(110% 55% at 100% 0%, #1a50c2 0%, rgba(26,80,194,0) 62%), radial-gradient(90% 45% at 0% 100%, #0e50cc 0%, rgba(14,80,204,0) 65%), linear-gradient(165deg, #0a3090 0%, #071f5f 38%, #05154a 68%, #07267a 100%)',
      }}
    >
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 384 614" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="onda-topo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a94ff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#4a94ff" stopOpacity="0.42" />
          </linearGradient>
          <linearGradient id="onda-fundo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1c63e6" />
            <stop offset="1" stopColor="#22a6ff" />
          </linearGradient>
        </defs>
        <path d="M110 0 C200 46 300 26 384 118 L384 0 Z" fill="url(#onda-topo)" />
        <path d="M0 26 C120 70 250 20 384 150" fill="none" stroke="#7db8ff" strokeOpacity="0.2" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        {ondas === 'altas' ? (
          <>
            <path d="M384 150 C330 230 350 330 270 400 C200 460 90 430 0 480 L0 505 C100 460 210 490 290 420 C370 350 350 250 384 200 Z" fill="#3d8bff" opacity="0.1" />
            <path d="M0 505 C70 470 170 560 384 455 L384 614 L0 614 Z" fill="#1a47c2" opacity="0.6" />
            <path d="M0 548 C100 512 210 600 384 508 L384 614 L0 614 Z" fill="url(#onda-fundo)" opacity="0.8" />
            <path d="M0 548 C100 512 210 600 384 508" fill="none" stroke="#8fdcff" strokeOpacity="0.65" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <>
            <path d="M0 548 C50 540 110 572 170 614 L0 614 Z" fill="#2a7df5" opacity="0.45" />
            <path d="M0 590 C70 566 140 604 210 594 C270 586 330 602 384 572 L384 614 L0 614 Z" fill="url(#onda-fundo)" opacity="0.5" />
            <path d="M0 590 C70 566 140 604 210 594 C270 586 330 602 384 572" fill="none" stroke="#8fdcff" strokeOpacity="0.4" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <div className="relative mx-auto flex h-full w-[min(100vw,24rem)] flex-col">{children}</div>
    </div>
  )
}

/** Logo do Selo Saúde e, nas etapas, o botão "Letras maiores" (tudo 30% maior, para quem enxerga pouco). */
export function Cabecalho({ acessivel, aoAlternarAcessibilidade }: { acessivel?: boolean; aoAlternarAcessibilidade?: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between px-[1.5rem] pt-[1.6rem]">
      <Logo className="h-[2.5rem]" />
      {aoAlternarAcessibilidade && (
        <button
          type="button"
          onClick={aoAlternarAcessibilidade}
          aria-pressed={acessivel} aria-label="Letras maiores"
          className={`flex h-[2.1rem] items-center gap-[0.4rem] rounded-full pl-[0.4rem] pr-[0.65rem] text-[calc(0.58rem*var(--lm))] font-medium ring-1 transition ${
            acessivel ? 'bg-white text-[#0a2a6e] ring-white' : 'bg-white/[0.06] text-white ring-white/30'
          }`}
        >
          <span className={`grid size-[1.3rem] place-items-center rounded-full ring-1 ${acessivel ? 'ring-[#0a2a6e]' : 'ring-white/70'}`}>
            <ZoomIn className="size-[0.8rem]" />
          </span>
          Letras maiores
        </button>
      )}
    </header>
  )
}

/** Barra de progresso com "x de y". */
export function Progresso({ passo, total }: { passo: number; total: number }) {
  return (
    <div className="mt-[1.6rem] flex shrink-0 items-center gap-[0.55rem]" aria-label={`Etapa ${passo} de ${total}`}>
      <div className="h-[0.26rem] w-[4.5rem] overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-[#19d3a2] transition-all" style={{ width: `${(passo / total) * 100}%` }} />
      </div>
      <span className="text-[calc(0.66rem*var(--lm))] font-medium">
        {passo} de {total}
      </span>
    </div>
  )
}

export function Titulo({ children, apoio }: { children: ReactNode; apoio?: ReactNode }) {
  return (
    <>
      <h1 className="mt-[0.75rem] text-[calc(1.7rem*var(--lm))] font-semibold leading-[1.1]">{children}</h1>
      {apoio && <p className="mt-[0.4rem] text-[calc(0.97rem*var(--lm))] leading-[1.35] text-white/95">{apoio}</p>}
    </>
  )
}

/** Botão principal verde, em pílula. O tamanho vem por `className`. */
export function BotaoPrincipal({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center justify-center gap-[0.7rem] rounded-full bg-gradient-to-r from-[#1fe0b0] to-[#10c795] font-semibold text-[#06204f] shadow-[0_0.4rem_1.6rem_rgba(25,211,162,0.35)] transition active:scale-[0.98] disabled:opacity-45 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  )
}

/** "Voltar": círculo com seta e o texto, em pílula discreta. */
export function BotaoVoltar({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-auto flex h-[2.2rem] shrink-0 items-center gap-[0.6rem] rounded-full pl-[0.1rem] pr-[0.9rem] text-[calc(0.78rem*var(--lm))] font-medium ring-1 ring-white/25 ${className}`}
    >
      <span className="grid size-[2rem] place-items-center rounded-full ring-1 ring-white/60">
        <ChevronLeft className="size-[1.1rem]" strokeWidth={2.4} />
      </span>
      Voltar
    </button>
  )
}
