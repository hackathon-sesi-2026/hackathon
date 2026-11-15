import { ArrowRight, MonitorSmartphone, Smartphone, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { FUNDO_DA_MARCA, OndasDaMarca } from '../../componentes/FundoDaMarca'
import { Logo } from '../../componentes/Logo'

// Token fixo de demonstração do Marcos (api/.../demonstracao/semente.py: token_de_demonstracao("t1")).
// Ele não muda entre reinícios, então o link do app serve para sempre.
const LINK_DO_APP = '/t/47631cc369c040849413bac5'

type Porta = {
  para: string
  Icone: LucideIcon
  titulo: string
  quem: string
  texto: string
  dica: string
  botao: string
}

const PORTAS: Porta[] = [
  {
    para: '/totem',
    Icone: MonitorSmartphone,
    titulo: 'Totem',
    quem: 'Uso interno · o trabalhador, na fábrica',
    texto: 'Uma tela na unidade, para quem passa pelo refeitório ou pela portaria. A pessoa conta como está e onde sente dor, e vê as próprias consultas. O pulso é anônimo.',
    dica: 'Na demonstração, qualquer CPF entra como o Marcos.',
    botao: 'Abrir o totem',
  },
  {
    para: LINK_DO_APP,
    Icone: Smartphone,
    titulo: 'App do Trabalhador',
    quem: 'Uso do trabalhador · no celular dele',
    texto: 'Chega pelo WhatsApp, sem instalar nada. Mostra o plano de cuidado em passos simples, as consultas, o contato com a equipe e os benefícios que ele pode resgatar.',
    dica: 'Abre como o Marcos, operador do turno das 6h às 14h.',
    botao: 'Abrir o app',
  },
  {
    para: '/painel/aps',
    Icone: Users,
    titulo: 'Painel + CRM',
    quem: 'Equipe de saúde (APS), liderança e RH',
    texto: 'A enfermagem vê quem precisa de atenção primeiro. A liderança organiza a cobertura dos turnos. O RH acompanha os números do programa, sempre em grupo, nunca por pessoa.',
    dica: 'No menu "WhatsApp", você recebe no seu celular a mensagem que o Marcos recebe.',
    botao: 'Abrir o painel',
  },
]

/** A porta de entrada do projeto, para o avaliador ou investidor: o que é o Selo Saúde e três caminhos para conhecer. */
export function PaginaInicial() {
  return (
    <div className="relative min-h-full overflow-x-hidden text-white" style={{ background: FUNDO_DA_MARCA }}>
      <OndasDaMarca className="h-64" />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <Logo tamanho="lg" />
          <span className="hidden text-xs text-blue-100/70 sm:block">Café com Bugs · Hackathon+ SESI Saúde 2026</span>
        </header>

        <section className="mt-10 max-w-3xl sm:mt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saude">Conheça o projeto</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Fazer o cuidado <span className="text-saude">continuar</span> depois da consulta.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-blue-50/90 sm:text-lg">
            O Selo Saúde é um ecossistema digital de engajamento em saúde para a indústria. Ele ajuda o trabalhador a confirmar, comparecer e seguir o plano de cuidado que a APS do SESI já oferece, e mostra a cada pessoa em volta dele só o que ela precisa ver.
          </p>
        </section>

        <section aria-label="Escolha por onde começar" className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-3 lg:gap-6">
          {PORTAS.map(({ para, Icone, titulo, quem, texto, dica, botao }) => (
            <Link
              key={titulo}
              to={para}
              className="group flex flex-col rounded-3xl bg-white p-6 text-slate-800 shadow-[0_1rem_3rem_rgba(3,12,48,0.35)] transition hover:-translate-y-1 hover:shadow-[0_1.4rem_3.4rem_rgba(3,12,48,0.45)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saude"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1fe0b0] to-[#10c795] text-[#06204f]">
                <Icone className="size-6" aria-hidden />
              </span>
              <h2 className="mt-5 text-xl font-bold text-navy">{titulo}</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-saude-700">{quem}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{texto}</p>
              <p className="mt-4 rounded-xl bg-cinza px-3 py-2 text-xs text-slate-600">{dica}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-tech">
                {botao}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </section>

        <footer className="mt-auto pt-10 text-xs leading-relaxed text-blue-100/70">
          Protótipo com dados fictícios: as pessoas, as consultas e os resultados são inventados, e o S+ é simulado. O dado clínico fica no S+, e a empresa nunca vê uma pessoa em particular.
        </footer>
      </div>
    </div>
  )
}
