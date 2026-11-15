import { ArrowRight, MonitorSmartphone, Smartphone, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { FUNDO_DA_MARCA, OndasDaMarca } from '../../componentes/FundoDaMarca'
import { Logo } from '../../componentes/Logo'

// Token fixo de demonstração do Marcos (api/.../demonstracao/semente.py: token_de_demonstracao("t1")).
// Ele não muda entre reinícios, então o link do app serve para sempre.
const LINK_DO_APP = '/t/47631cc369c040849413bac5'

type Projeto = {
  numero: number
  para: string
  Icone: LucideIcon
  titulo: string
  onde: string
  frase: string
  botao: string
}

const PROJETOS: Projeto[] = [
  { numero: 1, para: '/totem', Icone: MonitorSmartphone, titulo: 'Totem', onde: 'Na fábrica · trabalhador', frase: 'Conta como está e vê as suas consultas.', botao: 'Abrir o totem' },
  { numero: 2, para: LINK_DO_APP, Icone: Smartphone, titulo: 'App do Trabalhador', onde: 'No celular · trabalhador', frase: 'Plano de cuidado, consultas e benefícios.', botao: 'Abrir o app' },
  { numero: 3, para: '/painel/aps', Icone: Users, titulo: 'Painel + CRM', onde: 'Equipe de saúde, liderança e RH', frase: 'Quem atender primeiro e os números do programa.', botao: 'Abrir o painel' },
]

/** A porta de entrada do projeto, para o avaliador: o ecossistema e os três projetos que o formam, numerados. */
export function PaginaInicial() {
  return (
    <div className="relative min-h-full overflow-x-hidden text-white" style={{ background: FUNDO_DA_MARCA }}>
      <OndasDaMarca className="h-64" />

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header>
          <Logo tamanho="lg" />
        </header>

        <section className="mt-9 max-w-2xl sm:mt-12">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Olá, <span className="text-saude">Avaliador!</span> 👋
          </h1>
          <p className="mt-4 text-base leading-relaxed text-blue-50/95 sm:text-xl">
            O Selo Saúde é um <b>ecossistema</b> de três projetos diferentes. Reunimos os três aqui para tornar a sua avaliação mais simples.
          </p>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-saude">Escolha por onde começar</p>
        </section>

        <ol className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-5">
          {PROJETOS.map(({ numero, para, Icone, titulo, onde, frase, botao }) => (
            <li key={numero} className="flex">
              <Link
                to={para}
                className="group relative flex w-full flex-col rounded-3xl bg-white p-6 text-slate-800 shadow-[0_1rem_3rem_rgba(3,12,48,0.35)] transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saude"
              >
                <span className="absolute right-5 top-4 text-5xl font-extrabold leading-none text-navy/10" aria-hidden>
                  {numero}
                </span>
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1fe0b0] to-[#10c795] text-[#06204f]">
                  <Icone className="size-6" aria-hidden />
                </span>
                <h2 className="mt-4 text-xl font-bold text-navy">
                  <span className="text-saude-700">{numero}.</span> {titulo}
                </h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-saude-700">{onde}</p>
                <p className="mt-2 flex-1 text-sm text-slate-600">{frase}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-tech">
                  {botao}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <footer className="mt-auto pt-8 text-xs text-blue-100/70">Café com Bugs · Hackathon+ SESI Saúde 2026 · Dados fictícios</footer>
      </div>
    </div>
  )
}
