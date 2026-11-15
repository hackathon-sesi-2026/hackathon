# PRD · Selo Saúde

**Equipe Café com Bugs · Hackathon+ SESI Saúde 2026** · versão de 14/11/2026

Documento de requisitos do produto: o que o Selo Saúde é, o que cada superfície (celular, totem e painéis) faz, quais módulos sustentam isso e quais regras não se negociam. O estado de referência é o código em `api/` e `web/`; a intenção do produto está em `docs/produto.md`.

---

## 1. Visão geral

### 1.1 O que é

O Selo Saúde é a **camada de engajamento da APS do SESI**. Ele transforma o plano de cuidado em hábito: o trabalhador acompanha e cumpre o plano no celular, o totem da fábrica mantém o chão de fábrica engajado, e os painéis mostram à equipe de saúde quem precisa de ajuda e por quê. Quem se cuida é reconhecido com selos.

Não é um serviço de saúde novo e não substitui o S+: roda sobre o que o SESI já tem (S+ como registro, WhatsApp como canal).

### 1.2 O problema

A APS do SESI atende 104 indústrias e 10.025 vidas, com 94% de resolutividade e 96% de satisfação, e mesmo assim **cerca de 50% dos atendimentos agendados não acontecem**. A jornada quebra em três pontos em que a APS depende de o trabalhador responder:

1. **Confirmação do agendamento:** o contato é feito, a resposta não vem.
2. **Recebimento do plano:** um PDF técnico de 2 páginas, sem "o que faço primeiro".
3. **Convocação para o retorno:** prazo pelo risco, acompanhado em planilha manual.

### 1.3 Para quem

**Marcos**, persona oficial do desafio: operador de produção, turno das 6h às 14h, ônibus fretado de 1h10, baixo letramento em saúde e digital, medo de que o chefe saiba. Teste de toda tela do trabalhador: *o Marcos entende em 5 segundos, resolve em 1 ou 2 toques e não se sente vigiado nem cobrado?*

### 1.4 Resultado esperado

O trabalhador pensa: **"A empresa se preocupa com a minha saúde"**, e por isso fica mais comprometido, mais saudável e parte de um ambiente tecnológico e acolhedor. A empresa oferece e apoia o cuidado, mas não vê os dados de ninguém.

### 1.5 Como o resultado é medido

- **Funil do retorno** (na ordem do SESI): contato realizado → resposta recebida → agendamento realizado → comparecimento.
- Em paralelo: planos recebidos, pessoas em dia com o prazo do risco, passos do plano realizados (autorrelato), semanas seguidas com ação de cuidado.
- **Uso do canal não é adesão.** Abrir ou clicar não prova cuidado; adesão é o que a equipe de saúde verifica.

---

## 2. O ecossistema

| # | Peça | O que acontece | O que alimenta |
|---|---|---|---|
| 1 | **Consulta (gatilho nº 1)** | A equipe de APS gera o plano. O trabalhador sai com o plano no celular e o retorno marcado | Celular |
| 2 | **Celular do trabalhador** | Confirma, remarca, cumpre passos, vê exames, diz "não consegui" e por quê | Painel da APS |
| 3 | **Totem na unidade** | Pulso anônimo do turno, próximo retorno pelo crachá, meta coletiva | Painel de RH |
| 4 | **Painéis** | Enfermeira age na causa; liderança organiza liberações; RH vê a unidade | Volta ao plano |

**Recompensas mantêm o ciclo girando:** selos por semanas seguidas, horário garantido sem fila para quem confirma e meta coletiva do turno. Sem ranking, sem punição, nunca atreladas a resultado clínico.

### Como os módulos conversam

Os módulos não chamam uns aos outros para reagir: **publicam eventos de domínio**, e `composicao.py` diz quem reage a quê, na ordem certa. Exemplo: o trabalhador confirma o retorno → `ConsultaConfirmada` → a conversa responde → a semana de cuidado conta (e pode render `SeloConquistado`) → a linha do tempo da enfermagem registra → as telas de quem precisa ver são avisadas em tempo real.

| Evento | Quem publica | Quem reage |
|---|---|---|
| `ConsultaConfirmada`, `ConsultaAgendada` | agenda | comunicação (resposta), plano (semana de cuidado e selo) |
| `RemarcacaoPedida`, `CompromissoEscolhido` | agenda | comunicação |
| `PassoFeito`, `HabitoRespondido` | plano | exames (coleta registrada), comunicação |
| `DificuldadeRelatada`, `PlanoEnviado`, `SeloConquistado` | plano | comunicação |
| `CheckinRespondido` | monitoramento | comunicação |
| `ResultadoLiberado` | exames | comunicação (aviso sem detalhe) |
| *todos* | — | monitoramento (linha do tempo), canais (aviso em tempo real) |

---

## 3. Superfícies

Cinco superfícies, cada uma com público, aparelho e limite de privacidade próprios.

| Superfície | Rota | Quem usa | Nunca mostra |
|---|---|---|---|
| Celular do trabalhador | `/t/:token` | Trabalhador | Linguagem técnica por padrão; dado clínico nas mensagens |
| Totem na unidade | `/totem/:unidade` | Qualquer trabalhador, de passagem | Nada clínico; nada que identifique quem respondeu o pulso |
| Painel da APS | `/painel/aps` | Enfermeira de cuidado | Diagnóstico e ficha clínica (ficam no S+) |
| Liderança do turno | `/painel/lideranca` | Supervisor ou líder | O motivo da liberação, sempre; o nome, salvo autorização |
| RH e Direção | `/painel/rh` | RH e gestores | Qualquer indivíduo; grupos com menos de 5 pessoas |

### 3.1 Celular do trabalhador (mobile)

Página leve aberta pelo link pessoal que chega no WhatsApp. Não precisa instalar nada.

**Tela: Conversa** (o canal WhatsApp, simulado)

- Mensagens em nome da enfermeira de referência ("Aqui é a Ana, sua enfermeira no SESI").
- Botões de resposta em 1 toque: Confirmo, Preciso remarcar, Escolher horário, Ver meu plano, Ver meus exames.
- **Lembrete do retorno** com ganho ligado à motivação da pessoa e saída sem culpa ("assim a vaga fica livre para um colega").
- **Lembretes D-3 e D-1**; retomam o que a pessoa combinou. No protótipo, a enfermeira dispara pelo painel; no produto, um agendador envia sozinho.
- **Plano se-então opcional** depois de confirmar: "Saio do turno e vou direto", "Vou no meu dia de folga" ou "Só me lembre".
- **Horário garantido sem fila** como recompensa imediata ao confirmar.
- **Check-in do plano**: "Esta semana você conseguiu fazer o passo N?" com Consegui / Não consegui (cita só o número do passo).
- **Check-in de bem-estar**: Tudo bem / Quero falar com a enfermeira.
- **Aviso de resultado de exame** sem nenhum valor, apenas o caminho para a página pessoal.
- **Selo** entregue na conversa ao atingir um marco.

**Tela: Meu cuidado** (plano de cuidado)

- Saudação e status: em dia, retorno a confirmar ou retorno a marcar.
- Sequência semanal ("2 semanas seguidas se cuidando") e selos conquistados.
- **"Por que você quer se cuidar?"**: família, energia, menos dor ou sono. Usado nas mensagens.
- **Próximo compromisso** com data, hora e modalidade (presencial, por vídeo ou no turno), Confirmar presença e Remarcar.
- **Cartão Meus exames** com o andamento e o aviso "Novo".
- **Pergunta de checagem** (teach-back): "Qual é o seu primeiro passo?". Errar vira aviso para a enfermeira, sem tom de reprovação.
- **Plano em até 3 próximos passos**, cada um com ícone por área, detalhe simples, "O que você ganha" e prazo. Lista técnica do pedido só se a pessoa quiser abrir.
- Botões por passo: **Já fiz** e **Não consegui**.
- **Não consegui → motivo em 1 toque**: tempo/turno, transporte/fretado, não entendi, remédio, dinheiro, outro. A resposta automática oferece a saída certa (ex.: horário por vídeo).
- Barra de progresso e passos concluídos (com desfazer).
- Meta coletiva do turno ("Seu turno junto").
- Aviso de privacidade: só a pessoa e a equipe de saúde veem a página; a empresa não.

**Tela: Meus exames**

- Andamento em 3 etapas: **pedido → coletado → resultado**. Marcar "Já fiz" no passo de exames registra a coleta.
- Resumo: "5 de 7 dentro do esperado · 2 para conversar no retorno".
- Cada item: nome simples em destaque ("Gordura no sangue"), nome técnico pequeno, valor, faixa esperada, "Dentro do esperado" ou "Vale conversar no retorno" e uma frase do que ajuda.
- Histórico do check-up anterior.
- Aviso: não é diagnóstico; a médica explica no retorno; resultados nunca vão pelo WhatsApp nem para a empresa.

**Tela: Escolher horário**

- Turno informado pela própria pessoa.
- **Mais próximos para você**: 2 horários em destaque (encurta o intervalo entre marcar e ir).
- Filtros: Todos, No turno, Presencial, Por vídeo.
- Horários só fora do turno, **por vídeo**, ou **no turno (microconsulta de 20 min)** com dicas ("logo após o turno", "antes do turno", "por vídeo, de casa").
- Para horário no turno: opção de mostrar o nome à liderança para organizar a liberação, **nunca o motivo**.

### 3.2 Totem na unidade

Tela pública em pontos de passagem da fábrica. Anônimo por padrão.

**Início**

- Unidade e turno atual (inferido pelo horário).
- Dois botões: **Como você está hoje?** (3 toques, anônimo, sem crachá) e **Meu próximo cuidado** (com o crachá).
- **Prova social**: quantos colegas do turno já responderam hoje.
- **Meta coletiva do turno**: percentual em dia com o cuidado e a meta (ex.: 80%), com recompensa para o grupo.

**Pulso anônimo** ("Como você está hoje?")

- Três perguntas com escala de 3 pontos: **energia**, **dor no corpo**, **sono**.
- Gravado sem nenhum identificador de pessoa, só unidade, turno e data.
- Tela de agradecimento com dica curta conforme a resposta; se houver dor forte, orienta falar com a enfermagem pelo link pessoal, que é privado.

**Meu próximo cuidado** (com crachá)

- Identificação pelo crachá (na demonstração, uma lista simulada).
- Mostra só o próximo retorno (data, hora, local) e permite **confirmar**; nada clínico.
- Para remarcar ou ver o plano, o totem **manda o link pessoal para o WhatsApp da própria pessoa**. O link nunca aparece na tela pública (a matrícula não é segredo).

**O que o totem alimenta:** o painel de RH (resultados dos totens por semana e pulso por turno) e o engajamento no chão de fábrica.

### 3.3 Painéis (dashboard)

Três painéis na mesma casca, com navegação lateral: **Equipe de saúde** (APS) e **Empresa** (Liderança, RH e Direção). A barra lateral também tem "Abrir um totem" e "Reiniciar demonstração" (recurso de palco).

#### Painel da APS (enfermeira de cuidado)

Substitui a planilha de contatos mês a mês.

- **Indicadores clicáveis**: Precisam de ação · Relataram dificuldade ou pediram contato · Alto risco de falta · Faltaram ou remarcar · Fora do prazo do risco · Plano não recebido.
- **Por que estão saindo do cuidado**: contagem dos motivos do "não consegui", sem nomes.
- **Fila por prioridade**, com busca por nome ou matrícula, filtro e ordenação por **prioridade** ou por **risco de falta**.
- Colunas: paciente, médico de referência, risco (1 a 4), **risco de falta** (nível e pontos), retorno previsto, status do plano, situação.
- Ações na linha: enviar lembrete pelo WhatsApp, **abrir o celular do trabalhador** (QR code com o link pessoal) e abrir detalhes.
- **Gaveta de detalhe** (campos da ficha Gestão de Retorno):
  - **Resumo**: situação, próxima ação sugerida, **"não consegui" com a ação para a causa** e botão de resolver, **lembretes automáticos** D-3/D-1, **exames** (só o andamento, sem valores), **radar de risco de falta** com o porquê de cada ponto, dados do retorno (médico, risco, verificação de adesão, última consulta, retorno previsto e marcado, status do plano, próximo monitoramento, turno, empresa).
  - Botões: Enviar lembrete, Enviar/reenviar plano, Check-in do plano, Ver celular, **Registrar monitoramento**.
  - **Desfecho do monitoramento**: feito contato, agendamento realizado, mensagem enviada, aguardando retorno, observações e data do próximo monitoramento.
  - **Histórico**: linha do tempo de tudo o que aconteceu.
  - **Plano de cuidado**: passos e status (autorrelato).
- Atualiza em tempo real quando o trabalhador age no celular.

#### Liderança do turno

- **Agenda de cuidado do turno**: seletor de unidade e turno, próximos 5 dias úteis.
- Blocos de **liberação de 20 min** no turno: nome só se a pessoa autorizou, senão "Colaborador(a)"; **nunca o motivo**.
- Destaque de **conflito de cobertura** (duas ou mais liberações no mesmo horário).
- **Meta coletiva do turno** (percentual em dia, agregado).
- **Como apoiar sem invadir**: orientações para o líder (não perguntar o motivo, liberar sem cobrar justificativa, reforçar no DDS que o cuidado é sigiloso).

#### RH e Direção

- **Visão da empresa**, filtrável por unidade. Só agregados; grupos com menos de 5 pessoas ficam ocultos e listados como tal.
- Indicadores: vidas no programa, comparecimento (antes e no piloto, ilustrativo), planos recebidos, respostas no totem.
- **Resultados dos totens**: respostas por semana (4 semanas).
- **Como o turno está chegando**: pulso por turno (energia baixa, dor forte, sono ruim) com **alertas sobre condições de trabalho** (ex.: muita gente dormindo mal no turno da noite → revisar escala).
- **Onde as pessoas se perdem no retorno**: funil dos 4 passos.
- **Por que as pessoas saem do cuidado**: motivos do "não consegui"; contagens de 1 a 4 aparecem como "< 5".
- **Comparativo das unidades**.

---

## 4. Módulos da API

Monólito modular em Python (FastAPI, SQLAlchemy assíncrono, Postgres). Toda regra de negócio vive na API; o front só apresenta.

| Módulo | Responsabilidade | Principais funções e regras |
|---|---|---|
| **cadastro** | Trabalhador, turno, risco (espelho do S+) | Turnos A, B, C (noite) e Administrativo; token de acesso do celular; unidade |
| **agenda** | Retorno, horários, liberações | `montar_horarios` (fora do turno, por vídeo, no turno de 20 min); dicas de horário; plano se-então; confirmar, remarcar, agendar |
| **plano** | Plano de cuidado e engajamento | Passos com ganho e prazo; motivos do "não consegui" e ação por motivo; pergunta de checagem; sequência semanal e selos |
| **exames** | Andamento e resultado explicado | Pedido → coletado → resultado; coleta registrada pelo passo; liberação do resultado; resultado visto |
| **comunicacao** | A conversa com o trabalhador | Todos os textos em `textos.py`: lembrete, lembrete automático, confirmado, agendado, compromisso, plano pronto, check-ins, resultado liberado, selo |
| **monitoramento** | Situação e prioridade | `prazo_retorno` por risco; `situacao` de cada pessoa; `risco_falta` com o porquê; linha do tempo; desfecho da enfermagem |
| **pulso** | Respostas do totem | Gravação anônima por unidade e turno |
| **indicadores** | O que a empresa pode ver | Agregados com corte de grupo mínimo (5); meta do turno; painel da empresa; alertas do pulso |

Integrações atrás de portas (`integracoes/`): **S+** e **WhatsApp**, simulados no hackathon. Trocar pela integração real não toca nos módulos.

### Rotas por público

| Público | Prefixo | Principais rotas |
|---|---|---|
| Trabalhador | `/api/trabalhador/{token}` | ver tudo da pessoa, horários, confirmar, remarcar, agendar, compromisso, turno, motivação, abrir plano, marcar passo, responder hábito, relatar dificuldade, checagem, ver exames, check-in, eventos (SSE) |
| Totem | `/api/totem` | unidades, dados da unidade, registrar pulso, crachás, identificação, confirmar retorno, eventos |
| APS | `/api/aps` | fila, lembrete, lembretes automáticos, enviar plano, check-in do plano, resolver dificuldade, liberar resultado, registrar monitoramento, eventos |
| Liderança | `/api/lideranca` | agenda de liberações, eventos |
| RH | `/api/rh` | painel da empresa, eventos |

As telas ficam em `/t/:token`, `/totem/:unidade` e `/painel/{aps,lideranca,rh}` no front; as rotas acima são as da API.

**Tempo real:** SSE que só avisa que algo mudou; a tela busca de novo pela rota do seu público. O aviso passa pelo `NOTIFY` do Postgres, então funciona com várias instâncias da API.

---

## 5. Regras de negócio

| Regra | Como funciona |
|---|---|
| **Prazo de retorno** | Risco 1 e 2: 180 dias · risco 3: 90 dias · risco 4: 30 dias na demo (critério médico) |
| **Situação** | Prioridade: relatou dificuldade · pediu contato · pediu remarcação · faltou · fora do prazo · plano não recebido · sem resposta · prazo vence logo · em contato · em dia |
| **Risco de falta** | Pontuação por regras explicáveis: faltas no último ano, faltou ao último retorno, dificuldade de tempo ou transporte, outra dificuldade aberta, errou a checagem, plano não aberto, lembrete sem resposta há 3+ dias, retorno não confirmado, turno da noite, prazo vencido. Cada ponto vem com o motivo escrito. Pesos a calibrar com o histórico do S+ |
| **Ação por motivo** | Tempo → vídeo ou horário colado ao turno · transporte → teleatendimento ou antes do fretado · não entendi → ligar e explicar · remédio → médico de referência · dinheiro → alternativas sem custo · outro → ligar |
| **Horários** | Nunca dentro do turno, exceto a microconsulta de 20 min (com liberação); sábado só de manhã; domingo fechado |
| **Selos** | Constância (3 semanas), Cuidado em dia (6), 3 meses se cuidando (12). Contam semanas com ação de cuidado (confirmar, agendar, fazer passo). Nunca por resultado clínico |
| **Grupo mínimo** | RH e Direção não veem grupo com menos de 5 pessoas. Os totais do pulso só somam turnos visíveis (não dá para achar um turno oculto por diferença) e motivos com 1 a 4 casos ficam ocultos |

---

## 6. Privacidade e LGPD

1. **Dado clínico fica no S+.** O Selo Saúde usa risco, datas e participação. Única exceção: "Meus exames", que só o próprio trabalhador vê.
2. **A empresa nunca vê o indivíduo.** RH e Direção: agregados de 5+. Liderança: horário de liberação, nunca o motivo.
3. **Corte no servidor.** Cada público tem suas rotas e recebe só o que pode ver.
4. **Mensagens sem dado clínico.** O check-in cita "passo 2", não "psicóloga"; o resultado de exame só é avisado.
5. **Pulso anônimo.** Sem identificador de pessoa.
6. **Decisão clínica é da equipe.** O sistema prioriza e sugere com regras explicáveis; não usa IA para decidir.

---

## 7. Gatilhos de engajamento aplicados

Base: `docs/pesquisa/gatilhos-mentais.md`.

| Gatilho | Onde está |
|---|---|
| Lembretes bem desenhados | Lembrete com 1 toque; D-3 e D-1 automáticos |
| Facilidade e proximidade | Horário fora do turno, por vídeo ou no turno; 2 mais próximos em destaque |
| Progresso e reconhecimento | Barra de passos, sequência semanal, selos, comemoração; sem ranking |
| Enquadramento de ganho | "O que você ganha" em cada passo; ganho no lembrete ligado à motivação |
| Compromisso se-então | Opcional, depois de confirmar; retomado no D-1 |
| Pequena recompensa imediata | Horário garantido sem fila |
| Reciprocidade e acolhimento | Mensagens em nome da enfermeira |
| Prova social | Totem: colegas do turno que responderam hoje; meta do turno |
| Autonomia | Escolhe horário, canal e a própria motivação |

**Evitamos:** medo, culpa, escassez falsa, urgência artificial, ranking e qualquer vínculo com prêmio de assiduidade.

---

## 8. Fora do escopo

Nova oferta de saúde ou serviço paralelo à APS; prontuário ou ficha clínica; integração real com S+ e WhatsApp (simulados no hackathon); recompensa em dinheiro; qualquer visão individual para a empresa.

## 9. Lacunas conhecidas e próximos passos

| Lacuna | Próximo passo |
|---|---|
| Enfermeira não consegue **ajustar o plano** (editar, adiar, trocar passo) | Rota e tela de edição de passos no painel da APS |
| **Gatilho nº 1** sem tela | Onboarding na consulta: opt-in, plano no celular, retorno marcado |
| Recompensa igual para todos | Proporcional ao intervalo do cuidado: retornos distantes valem mais; selo destrava benefício concreto |
| Indicador de **planos concluídos** | Incluir no painel de RH, com "% com semanas seguidas" |
| **Totens por ponto da planta** (refeitório, portaria, vestiário) | Campo "ponto" no pulso, análise por ponto, custo por ponto |
| **Condições de trabalho** (calor/sol, periculosidade) | Atributo por setor e turno que ajusta dicas e alertas |
| Segurança | Login dos painéis, verificação do link pessoal, registro de acesso, opt-in |
| Modelo de negócio | Definir quem paga (SESI ou empresa), preço por vida e o valor da vaga ociosa recuperada |
| Legislação | Controlador e base legal na LGPD, separação APS × ocupacional, regras de recompensa validadas com o jurídico |
