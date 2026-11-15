# Selo Saúde

Projeto do Hackathon+ SESI Saúde 2026. O contexto do produto (problema, alvo, persona, superfícies, regras e vocabulário) está importado abaixo e vale para toda tarefa:

@docs/produto.md

## Onde procurar

- `docs/README.md`: índice do contexto, com qual arquivo responde qual pergunta. Consulte antes de abrir os materiais do SESI, que somam mais de 120 KB.
- `api/`: API em Python 3.12, FastAPI, SQLAlchemy 2 assíncrono, Postgres, Alembic.
- `web/`: front em React 18, Vite 6, TypeScript, Tailwind 4 e react-router 7.

## Comandos

```
docker compose up -d banco                              # Postgres na porta 5433
cd api && py -3.12 -m venv .venv && .venv/Scripts/pip install -e ".[dev]"
cd api && .venv/Scripts/alembic upgrade head            # cria as tabelas
cd api && .venv/Scripts/uvicorn selo_saude.main:app --app-dir src --port 8000 --reload
cd api && .venv/Scripts/pytest && .venv/Scripts/ruff check src tests && .venv/Scripts/ruff format src tests
npm --prefix web install
npm --prefix web run dev                                # http://localhost:5173, repassa /api para a 8000
npm --prefix web run build                              # tsc --noEmit + vite build
```

A API cria os dados fictícios sozinha quando sobe com o banco vazio. `POST /api/demonstracao/reinicio` recria tudo. A documentação interativa das rotas fica em `http://localhost:8000/docs`.

Depois de mexer em código: `pytest` e `ruff` na API, `npm run build` no front, e abra a tela afetada no navegador.

**QA ponta a ponta:** `api/.venv/Scripts/python qa/rodar.py` (ou a skill `/qa-tester`) confere o sistema rodando contra as regras do `docs/produto.md` e os MDs, e dá APROVADO, APROVADO COM RESSALVAS ou REPROVADO. Regra nova no `produto.md` precisa de teste em `qa/test_regras.py`.

## Arquitetura

Monólito modular. Toda regra de negócio vive na API; o front só apresenta.

```
api/src/selo_saude/
  nucleo/         banco, eventos de domínio, tempo real (SSE), relógio, erros
  modulos/        um pacote por contexto de negócio
  integracoes/    portas para S+ e WhatsApp, com implementação simulada
  publicos/       rotas HTTP, um arquivo por público
  composicao.py   liga os módulos: quem reage a qual evento, e em que ordem
  demonstracao/   dados fictícios
```

| Módulo | Dono de |
|---|---|
| `cadastro` | Trabalhador, turno, risco (espelho do S+) |
| `agenda` | Retorno, horários que cabem no turno, liberações |
| `plano` | Plano de cuidado, passos, dificuldades, checagem, selos |
| `comunicacao` | A conversa com o trabalhador e todo texto enviado (`textos.py`) |
| `monitoramento` | Situação, risco de falta, linha do tempo, desfecho da enfermagem |
| `exames` | Andamento do pedido (pedido, coletado, resultado) e o resultado explicado em linguagem simples |
| `pulso` | Respostas anônimas do totem |
| `indicadores` | Agregados para RH e liderança, com o corte de grupo mínimo |

Regras que mantêm isso modular:

1. **Um módulo só usa de outro o `servico.py`, os `eventos.py` e as `regras.py`.** Nunca os `modelos.py`. As tabelas têm o nome do módulo como prefixo e não há chave estrangeira entre módulos.
2. **Para reagir a algo, assine um evento em `composicao.py`.** Quem altera o dado publica o que aconteceu; os interessados reagem na mesma transação. A ordem das assinaturas é a ordem de execução.
3. **Regra de negócio fica em `regras.py`, em função pura**, com teste em `api/tests/`.
4. **Cada público tem seu prefixo de rota e recebe só o que pode ver** (`publicos/`). O corte de privacidade é feito no servidor: confira a tabela de superfícies antes de expor um campo.
5. **Rota que altera dado leva `@transacional`**, que efetiva a transação e dispara os avisos de tempo real.
6. **A API não guarda estado em memória**, para rodar em várias instâncias. O tempo real passa pelo `NOTIFY` do Postgres. A única exceção é um derivado descartável: a carteira da APS calculada (`monitoramento/servico.py`), que cada instância guarda e recalcula só para quem mudou, a partir dos avisos do `NOTIFY` (`tempo_real.mudancas_desde`).

Tempo real: o SSE só avisa que algo mudou, sem carregar dado. O front busca de novo pela rota do seu público (`web/src/api/useRecurso.ts`), inclusive ao reconectar.

## Front

```
web/src/
  rotas.tsx          /t/:token · /totem/:unidade · /painel/{aps,lideranca,rh}
  api/               cliente HTTP, hook useRecurso, tipos dos contratos
  superficies/       uma pasta por superfície: trabalhador, totem, painel/{aps,lideranca,rh}
  componentes/       peças visuais comuns
  lib/               datas e rótulos de apresentação
```

## Convenções

- **Português** em identificadores, comentários, rotas e textos, como já está no código. snake_case no Python, camelCase no JSON e no TypeScript (a conversão é automática, em `nucleo/esquema.py`).
- **Texto para o trabalhador fica em `modulos/comunicacao/textos.py`**: frase curta, sem termo técnico, sem dado clínico, sem culpa.
- **Mudou um modelo, gere a migração**: `alembic revision --autogenerate -m "..."`.
- **Mudou um contrato da API, atualize `web/src/api/tipos.ts`** na mesma alteração.
- Toda data do seed é relativa a "hoje", para a demonstração funcionar em qualquer dia. Não fixe datas.
- Cores e fonte são os tokens de `web/src/index.css`. Ícones vêm de `lucide-react`.
