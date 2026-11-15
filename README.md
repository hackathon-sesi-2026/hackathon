# Selo Saúde

Camada de engajamento sobre a Atenção Primária à Saúde (APS) que o SESI já oferece dentro das indústrias. Ajuda o trabalhador a confirmar, comparecer e seguir o plano de cuidado, e dá à enfermagem, à liderança e ao RH só a informação de que cada um precisa para apoiar.

Projeto da equipe Café com Bugs no Hackathon+ SESI Saúde 2026. Todos os dados são fictícios; o S+ e o WhatsApp são simulados.

## As superfícies

| Endereço | Quem usa | Para quê |
|---|---|---|
| `/t/:token` | Trabalhador, no celular | Confirmar ou remarcar, escolher horário que cabe no turno, ver o plano em passos simples, ver os próprios exames explicados, dizer "não consegui" |
| `/totem/:unidade` | Qualquer trabalhador, no chão de fábrica | Pulso anônimo de 3 perguntas; com o crachá, ver o próximo retorno |
| `/painel/aps` | Enfermagem | Fila por prioridade, risco de falta, lembretes, dificuldades, desfecho do monitoramento |
| `/painel/lideranca` | Liderança do turno | Organizar a cobertura das liberações, sem ver o motivo |
| `/painel/rh` | RH e Direção | Indicadores agregados do programa, sem nenhum dado individual |

O link do celular de cada pessoa sai do painel da APS, no botão do celular: ele mostra um QR code para abrir no aparelho.

## Como rodar

Requisitos: Docker, Python 3.12 e Node 20 ou mais novo.

```bash
# 1. Banco
docker compose up -d banco

# 2. API (http://localhost:8000, documentação em /docs)
cd api
python -m venv .venv
.venv/Scripts/pip install -e ".[dev]"      # Linux e macOS: .venv/bin/pip
.venv/Scripts/alembic upgrade head
.venv/Scripts/uvicorn selo_saude.main:app --app-dir src --port 8000

# 3. Front (http://localhost:5173)
cd web
npm install
npm run dev
```

A API cria os dados fictícios na primeira subida. Para abrir num celular de verdade, use o endereço de rede que o Vite mostra ao iniciar, com o celular na mesma rede.

## Arquitetura

```
web/   React + Vite + TypeScript + Tailwind
api/   FastAPI + SQLAlchemy assíncrono + Postgres
docs/  contexto do produto, pesquisa e materiais do SESI
```

A API é um monólito modular: oito módulos de negócio (`cadastro`, `agenda`, `plano`, `exames`, `comunicacao`, `monitoramento`, `pulso`, `indicadores`) que conversam por eventos de domínio, com as integrações externas atrás de portas.

- **Privacidade no servidor.** As rotas são separadas por público, e cada uma devolve só o que aquele público pode ver. O RH recebe agregados já calculados, com grupos de menos de 5 pessoas omitidos. A liderança nunca recebe o motivo de uma liberação. O pulso do totem é gravado sem nenhum identificador de pessoa.
- **Tempo real que escala.** As telas se atualizam por SSE. O aviso sai pelo `NOTIFY` do Postgres dentro da transação, então chega a todas as instâncias da API e só é entregue se a transação for efetivada. A API não guarda estado em memória.
- **Regras explicáveis.** A situação de cada pessoa e o risco de falta são funções puras, testadas, e cada ponto do risco vem com o motivo escrito. Nenhuma decisão clínica é automática.
- **Pronto para o S+.** O domínio só conhece as portas em `api/src/selo_saude/integracoes/`. Trocar o simulado pela integração real não toca nos módulos.

Detalhes e convenções em [`CLAUDE.md`](CLAUDE.md). Contexto do produto em [`docs/produto.md`](docs/produto.md).

## Testes

```bash
cd api && .venv/Scripts/pytest && .venv/Scripts/ruff check src tests
cd web && npm run build

# QA ponta a ponta, com o sistema de pé: regras do produto, fluxos e telas no Chrome
api/.venv/Scripts/pip install -e "api[qa]"
api/.venv/Scripts/python qa/rodar.py
```
