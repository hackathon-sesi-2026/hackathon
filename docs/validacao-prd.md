# Validação do PRD · Selo Saúde

**14/11/2026** · base: código em `api/` e `web/` depois do commit `e60f9d9` (reestruturação em monólito modular) e do PRD em `docs/prd.md`.

## Como foi validado

| Etapa | Resultado |
|---|---|
| Migrações Alembic (0001 esquema inicial, 0002 exames) num Postgres 16 limpo | ✅ aplicadas |
| `pytest` — testes que já existiam (`tests/test_regras.py`) | ✅ 15/15 |
| `pytest` — regras do PRD (`tests/test_prd_regras.py`, novo) | ✅ 30 passam · 1 lacuna documentada (xfail) |
| `pytest` — ponta a ponta pela API rodando (`tests/test_prd_http.py`, novo) | ✅ 22 passam (inclui os testes das 2 correções) |
| `ruff check` e `ruff format --check` | ✅ limpos (62 arquivos) |
| `npm run build` no `web/` (inclui `tsc --noEmit`) | ✅ |
| Auditoria de arquitetura contra a skill de monólito modular | ver seção 3 |

**Total: 67 testes passam e 1 `xfail(strict=True)`**, que é uma decisão pendente (ordem "em contato" × "vence logo"), não um defeito. Os 2 itens recusados na primeira rodada foram **corrigidos e validados** (seção 1, "Recusado → corrigido").

Os testes ponta a ponta reiniciam os dados fictícios e são pulados sem a variável `SELO_API_URL`, então o `pytest` de quem não está com a API no ar continua verde:

```
SELO_API_URL=http://127.0.0.1:8000 SELO_URL_BANCO=postgresql://selo:selo@localhost:5433/selo_saude .venv/Scripts/pytest
```

Legenda da evidência: **[teste]** validado por teste automatizado que roda · **[revisão]** validado por leitura do código (arquivo:linha).

---

## 1. Veredito por requisito do PRD

### ✅ Aprovado

| Requisito (PRD) | Evidência |
|---|---|
| §4 Rotas de cada público respondem; link pessoal inválido dá 404 | [teste] `test_prd4_*` |
| §5 Prazos por risco 180/180/90/30 | [teste] `test_prd5_prazos_por_risco`, `test_prd5_prazo_retorno_*` |
| §5 Situação: dificuldade > pediu contato > … ; faltou; plano não recebido; prazo vence logo | [teste] `test_prd5_*` |
| §5 Risco de falta: cada fator com ponto e motivo escrito; teto 100; níveis | [teste] `test_prd5_cada_fator_*`, `test_prd5_risco_de_falta_tem_teto_e_niveis` |
| §5 Ação por motivo para os 6 motivos | [teste] `test_prd5_todo_motivo_tem_rotulo_e_acao_na_causa` |
| §5 Horários nunca no turno, exceto microconsulta de 20 min; turno da noite sem microconsulta; domingo fechado; sábado só manhã | [teste] `test_prd5_horarios_*`, `test_prd5_domingo_*`, `test_prd5_turno_da_noite_*` |
| §5 Selos 3/6/12 nos marcos exatos | [teste] `test_prd5_selos_nos_marcos_3_6_12` |
| §5/§6 Grupo mínimo 5; turno com menos de 5 respostas oculto; alerta sobre condições de trabalho | [teste] `test_prd6_grupo_minimo_*`, `test_prd6_turno_*` |
| §6 Nenhuma mensagem ao trabalhador com termo clínico, culpa ou urgência | [teste] `test_prd6_nenhuma_mensagem_*` (todas as funções de `textos.py`) |
| §6 RH não recebe nenhum dado individual; unidade com menos de 5 vidas só em "ocultas" | [teste] `test_prd6_rh_*` |
| §6 Liderança recebe só horário, nunca motivo; nome só com autorização | [teste] `test_prd6_lideranca_*`, `test_prd31_nome_na_lideranca_so_com_autorizacao` (com e sem autorização) |
| §6 APS nunca recebe valor de exame | [teste] `test_prd6_aps_nao_recebe_valor_de_exame` (antes e depois de liberar resultado) |
| §6 Link pessoal só mostra a própria pessoa; sem risco, situação ou histórico da enfermagem; não mexe no plano de outro | [teste] `test_prd6_link_pessoal_*`, `test_prd6_nao_da_para_mexer_*` |
| §3.1 "Não consegui" chega à enfermeira como "Relatou dificuldade", com ação para a causa e ponto no radar; a resposta oferece outro horário | [teste] `test_prd3_nao_consegui_*` |
| §3.1 Confirmar dá horário garantido e oferece o plano se-então | [teste] `test_prd31_confirmar_*` |
| §3.1 Resultado de exame: itens explicados só para o trabalhador; aviso sem valor | [teste] `test_prd31_resultado_de_exame_*` |
| §3.2 Pulso do totem alimenta o RH em tempo real; tabela do pulso sem identificador de pessoa | [teste] `test_prd32_pulso_*` |
| §3.2 Totem não aceita crachá de outra unidade | [teste] `test_prd32_totem_nao_aceita_cracha_de_outra_unidade` |
| §3.3 APS: situação completa e risco de falta com motivos em cada linha | [teste] `test_prd33_*` |
| §3.1 Telas Meu cuidado, Meus exames, Escolher horário; §3.3 painéis APS, Liderança e RH | [revisão] `CelularTrabalhador.tsx`, `PainelAps.tsx`, `PainelLideranca.tsx`, `PainelRh.tsx`; build do front ✅ |

### ⚠️ Aprovado com ressalvas

| Requisito | Ressalva | Evidência |
|---|---|---|
| §5 Ordem da situação | O PRD põe "prazo vence logo" antes de "em contato"; o código avalia "em contato" primeiro (contato nos últimos 7 dias tira a pessoa de "vence logo"). Faz sentido clinicamente, mas é preciso decidir e alinhar PRD ou código | [teste] xfail `test_prd5_vence_logo_tem_prioridade_sobre_em_contato` |
| §3.1 Lembretes D-3/D-1 | Não há agendador: a enfermeira dispara pelo painel. PRD já ajustado | [revisão] `publicos/painel.py:59`, `comunicacao/servico.py:49` |
| §3.1 Check-in de bem-estar | O texto e a rota de resposta existem, mas nenhuma rota envia o check-in (só aparece no seed) | [revisão] `textos.py:163`, `publicos/trabalhador.py:226` |
| §5 Selos por "semanas seguidas" | A contagem nunca zera: são semanas acumuladas, não consecutivas | [revisão] `plano/servico.py:216-223` |
| §5 Sábado só de manhã | Garantido pelo adaptador simulado do S+, não pela regra do domínio. Com o S+ real, depende da agenda dele | [teste] passa com o simulado · [revisão] `integracoes/splus.py:47` |
| §3.3 RH: funil e motivos | Vêm fixos do seed (`ResumoUnidade`), não são calculados dos eventos reais; um "não consegui" novo não muda o painel de RH | [revisão] `indicadores/modelos.py:8-23`, `semente.py:411-427` |
| §3.2 Totem com crachá | Mostra também passos feitos e semanas seguidas (contagens, sem conteúdo clínico). PRD diz só o retorno | [revisão] `publicos/totem.py` |
| §3.3 Liderança | A API devolve todas as unidades e liberações (inclusive passadas) e o front filtra | [revisão] `PainelLideranca.tsx:40` |
| §3.2 Pulso anônimo | Sem identificador de pessoa ✅, mas grava o instante exato, não só a data | [teste] colunas · [revisão] `pulso/servico.py:49` |
| §6 Login dos painéis | Não há autenticação: qualquer um chama `/api/aps/fila`. Já declarado no PRD §9 | [revisão] `publicos/painel.py:43` |

### ❌ Recusado → ✅ corrigido (14/11, mesma rodada)

| Requisito | Problema encontrado | Correção aplicada | Validação |
|---|---|---|---|
| §6 "Totem: nada que identifique"; link pessoal só da pessoa | **Vazamento:** `POST /api/totem/{u}/identificacao` devolvia o `tokenAcesso` só com a matrícula. Quem soubesse a matrícula de um colega abria o link pessoal dele, inclusive os valores de exame | O totem não devolve mais o token. Com o crachá, a pessoa pede e o link é **enviado ao WhatsApp dela** (nova rota `POST /api/totem/{u}/identificacao/link`, evento `LinkPessoalEnviado`, texto `link_pessoal`). A tela troca o QR por "Mandar o link para o meu WhatsApp" | [teste] `test_prd6_totem_nao_entrega_o_link_pessoal_so_pela_matricula`, `test_prd6_totem_manda_o_link_so_para_o_whatsapp_da_propria_pessoa` · verificado no navegador |
| §6 RH só com grupos de 5+ | O total do pulso e as semanas com unidade filtrada não aplicavam o mínimo; o total incluía turnos ocultos (dava para achar o oculto por diferença); motivos por unidade saíam com contagens de 1 a 4 | Totais e semanas só somam respostas de grupos (unidade + turno) com 5+ (`_so_grupos_visiveis`); motivos de 1 a 4 saem omitidos (`_motivos_visiveis`) e o painel mostra "< 5" | [teste] `test_prd6_rh_total_do_pulso_so_conta_grupos_visiveis` (todas as unidades e cada filtro), `test_prd6_rh_motivos_por_unidade_sem_contagem_de_1_a_4` · verificado no navegador |

Nenhum item permanece recusado.

---

## 2. Itens do PRD já declarados como lacuna (§9)

Não testados como falha porque o próprio PRD já os lista como pendência: enfermeira ajustar o plano; tela de onboarding (gatilho nº 1); recompensa proporcional ao intervalo; indicador de planos concluídos; totens por ponto da planta; condições de trabalho; login, opt-in e registro de acesso; modelo de negócio; base legal.

---

## 3. Arquitetura × skill de monólito modular

| Regra da skill | Veredito | Evidência e recomendação |
|---|---|---|
| Encapsulamento (sem import de internos de outro módulo) | ✅ Aprovado | Entre módulos só se importam `servico`, `eventos` e `regras`; nenhum `modelos.py` de fora. Recomendação: fixar com um teste de arquitetura (import-linter ou `ast`) |
| API pública com DTOs simples | ⚠️ Ressalva | Serviços devolvem DTOs Pydantic ✅. Mas `DadosTrabalhador` carrega `token_acesso` (credencial) e circula entre módulos (`cadastro/servico.py:41`, `monitoramento/servico.py:41`); `PulsoRegistrado` está em `pulso/servico.py`, sem `eventos.py` |
| Comunicação por eventos | ⚠️ Ressalva | Única chamada direta que altera outro módulo: `comunicacao/servico.py:56` → `agenda.registrar_lembrete_automatico`. Trocar por evento assinado em `composicao.py` |
| Sem dependência circular | ⚠️ Ressalva | Ciclo comunicação ↔ monitoramento só pelos `eventos.py` (não quebra na importação). Mover `CheckinRespondido` ou tratar `eventos.py` como contrato |
| Isolamento de dados (tabelas com prefixo do módulo) | ✅ Aprovado | 13 tabelas, todas com prefixo; nenhum `relationship` entre módulos |
| Sem JOIN entre módulos | ✅ Aprovado | Nenhum `join` SQL nem `text()`; composição feita em memória pelos serviços |
| Sem FK cruzada | ✅ Aprovado | Migrações 0001 e 0002 sem `ForeignKey` |
| Transação local por módulo | ❌ Conflito (decisão do time) | Os assinantes reagem **na mesma transação** (`nucleo/eventos.py:35-37`, `@transacional`). Ex.: confirmar consulta grava em agenda + comunicação + plano + monitoramento numa transação. A skill pede consistência eventual. Risco concreto: `whatsapp.enviar` roda **antes do commit** (`comunicacao/servico.py:87`) — num rollback a mensagem sairia sem registro. Para o hackathon, manter e registrar a decisão; para produção, outbox para os efeitos externos e mover o envio para depois do commit |
| Shared kernel mínimo | ✅ Aprovado | `nucleo/` só tem infraestrutura. Detalhe: `pulso.turno_agora` repete os turnos à mão em vez de usar `cadastro.TURNOS` |
| Seed (`demonstracao/semente.py`) | ⚠️ Ressalva | Importa os `modelos` de 8 módulos e apaga tudo numa transação. Aceitável como exceção declarada de demonstração |

---

## 4. Prioridade de correção

1. ~~Vazamento do token no totem~~ — corrigido.
2. ~~Corte mínimo no RH~~ — corrigido.
3. **`whatsapp.enviar` depois do commit** e evento no lugar da chamada direta à agenda (arquitetura). Baixo esforço.
4. Decidir a ordem **em contato × vence logo** e alinhar PRD ou código.
5. Funil e motivos do RH calculados dos eventos reais; sequência de selos que zera de verdade.
6. Registrar no `CLAUDE.md` a decisão sobre transação única e o plano de outbox.
