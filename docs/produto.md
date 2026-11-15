# Selo Saúde — contexto do produto

Fonte única sobre **o que estamos construindo e para quem**. Se algo aqui contradiz o código, este arquivo vale para a intenção e o código vale para o estado atual: aponte a diferença em vez de escolher em silêncio.

## O que é

Selo Saúde é uma camada de engajamento sobre a APS (Atenção Primária à Saúde) que o SESI já oferece dentro das indústrias. Ela não cria serviço de saúde novo: faz o trabalhador confirmar, comparecer e seguir o plano de cuidado que a APS já entrega, e dá a cada ator em volta dele (enfermagem, liderança, RH) só a informação de que precisa para ajudar.

Equipe Café com Bugs, Hackathon+ SESI Saúde 2026.

## O alvo

- **Entrega do protótipo: 15/11/2026 às 15h30. Pitch às 16h** (3 min de pitch + 3 min de perguntas).
- Nota final = pitch × 6 + protótipo × 4, cada critério de 1 a 5.
  - Pitch: **impacto, inovação, viabilidade**.
  - Protótipo: **maturidade, sofisticação técnica, experiência do usuário**.
- O SESI espera ver quatro coisas: para quem e qual barreira; como a experiência funciona; o que foi testado; como operar e medir.

Consequência prática: uma mudança vale a pena se melhora a demonstração de 3 minutos ou um desses seis critérios. Robustez que a banca não vê (autenticação real, backend, testes exaustivos) não é prioridade agora.

## O problema

A APS do SESI atende 104 indústrias e 10.025 vidas, com 94% de resolutividade e 96% de satisfação, e mesmo assim **cerca de 50% dos atendimentos agendados não acontecem**. O serviço é bom; o que falha é a participação.

A jornada quebra nos três pontos em que a APS depende de o trabalhador responder:

1. **Confirmação do agendamento**: o contato é feito, a resposta não vem.
2. **Recebimento do plano de cuidado**: o plano é um PDF técnico de 2 páginas (um exemplo lista 16 exames pelo nome técnico), sem "o que faço primeiro".
3. **Convocação para o retorno**: prazo definido pelo risco (risco 1 e 2: 6 meses · risco 3: 3 meses · risco 4: critério médico), acompanhado hoje em planilha manual, coluna por mês.

Pergunta-desafio do SESI: como engajar os trabalhadores e transformar o autocuidado em hábito contínuo, em conexão com a APS.

## Para quem: Marcos

Persona oficial do desafio. Operador, turno das 6h às 14h, ônibus fretado de 1h10.

- A APS orienta usar o turno oposto, o que para ele é ficar mais tempo na empresa e perder o fretado.
- Tem medo de que o chefe saiba; associa a APS ao "apto/inapto".
- Baixo letramento em saúde e digital; cansado; a prevenção compete com a rotina.
- Precisa de autonomia, simplicidade extrema, ganho percebido no curto prazo e privacidade total.

Tudo o que o trabalhador vê deve passar no teste: o Marcos entende em 5 segundos, resolve em 1 ou 2 toques e não se sente vigiado nem cobrado?

## Superfícies

São cinco superfícies. Cada uma tem um público, um aparelho e um limite de privacidade próprios. Celular e totem são telas independentes, cada uma na sua rota; os três painéis (APS, Liderança, RH e Direção) formam um único sistema, com a mesma casca e navegação.

| Superfície | Quem usa | Onde | Para quê | Nunca mostra |
|---|---|---|---|---|
| **Celular do trabalhador** | Trabalhador | Celular pessoal: conversa no WhatsApp + página leve aberta por link, sem instalar nada | Confirmar ou remarcar em 1 toque, escolher horário que cabe no turno e no transporte, ver o plano como até 3 próximos passos, ver os próprios exames explicados, dizer "não consegui" e por quê | Linguagem técnica por padrão; dado clínico nas mensagens |
| **Totem na unidade** | Qualquer trabalhador, de passagem | Tela pública no chão de fábrica | Pulso anônimo de 3 perguntas (energia, dor, sono) e, com dor, onde dói tocando num boneco; com o crachá, ver o próprio próximo passo | Nada clínico; nada que identifique quem respondeu o pulso |
| **Painel da APS** | Enfermeira que coordena o cuidado | Computador da unidade de saúde | Substituir a planilha: fila por prioridade, situação de cada pessoa, radar de risco de falta, enviar lembrete e plano, tratar dificuldades, registrar o desfecho do monitoramento | Diagnóstico e ficha clínica (ficam no S+) |
| **Liderança do turno** | Supervisor ou líder de turno | Computador ou tablet | Organizar a cobertura para as liberações de saúde que caem no turno; meta coletiva do turno | O motivo da liberação, sempre; o nome, salvo se a própria pessoa autorizou |
| **RH e Direção** | RH e gestores da empresa | Computador | Ver se o programa funciona: acompanhamento (WhatsApp, exame, consulta, reavaliação), comparecimento, pulso do totem, onde mais dói, especialidades mais procuradas | Qualquer pessoa individual; grupos com menos de 5 pessoas |

A antiga "visão lado a lado" (painel e celular na mesma tela) foi **descartada**: era recurso de palco, não produto. Na demonstração, cada superfície abre no seu próprio aparelho ou janela. O seletor "Simulando o celular de…", a moldura de celular e o botão "Reiniciar demo" também são de palco e não fazem parte do produto.

## Regras que não se negociam

1. **Dado clínico fica no S+.** O Selo Saúde usa só risco (1 a 4), datas e dados de participação. Nenhum diagnóstico, exame ou remédio entra em mensagem nem em tela da equipe ou da empresa. A única exceção é "Meus exames": o trabalhador vê o próprio resultado, explicado em linguagem simples, e só ele. A enfermagem, neste sistema, vê apenas o andamento (pedido, coletado, resultado).
2. **A empresa nunca vê o indivíduo.** RH e Direção veem agregados de grupos com 5 ou mais pessoas. A liderança vê horário de liberação, nunca o motivo.
3. **Uso do canal não é adesão.** Abrir mensagem ou clicar não prova que a pessoa se cuidou; adesão é o que a equipe de saúde verifica. Não rotular métrica de uso como "adesão".
4. **Sem culpa, medo, escassez falsa ou urgência artificial.** Sem ranking e sem comparação entre pessoas; reconhecimento é individual e privado, ou coletivo por turno.
5. **Decisão clínica é da equipe.** O sistema prioriza e sugere com regras explicáveis; não usa IA para decidir nem esconde o porquê de uma pontuação.
6. **Não criar canal nem serviço novo.** WhatsApp para falar com o trabalhador, S+ como registro. O produto se pluga no que existe.
7. **Todo dado é fictício.** Os únicos números reais são os do SESI citados acima. Percentuais de "antes e depois" que aparecem nos painéis são ilustrativos e não podem ser apresentados como resultado.

## Vocabulário

| Termo | Significado |
|---|---|
| APS | Atenção Primária à Saúde do SESI, programa "SESI Saúde Acolhe" |
| S+ | Sistema do SESI de registro clínico e agendamento. Dono do dado clínico |
| Plano de cuidado | Documento que a enfermagem envia após a consulta: metas, exames, retornos |
| Passo | Um item do plano traduzido para linguagem simples, com prazo e ganho percebido |
| Risco (1 a 4) | Classificação clínica que define o prazo de retorno. Não confundir com risco de falta |
| Risco de falta | Pontuação nossa, por regras, de quem tende a sair do cuidado |
| Monitoramento | Contato periódico da enfermagem; tem desfecho e data do próximo |
| Dificuldade | O "não consegui" do trabalhador, com motivo (tempo, transporte, não entendi, remédio, dinheiro, outro) |
| Pulso | Resposta anônima do totem a "como você está hoje?" |
| Liberação | Compromisso de saúde dentro do turno, que precisa de cobertura |
| No turno | Microconsulta de 20 min no ambulatório da empresa, durante o turno |
| Selo | Reconhecimento individual por semanas seguidas de cuidado. Dá nome ao produto |
| Teach-back | Pergunta de checagem para saber se a pessoa entendeu o plano |
| Unidade | Planta ou estabelecimento da empresa, onde fica o totem |

## Como o resultado é medido

O funil do retorno, na ordem do SESI: **contato realizado → resposta recebida → agendamento realizado → comparecimento**. Em paralelo: planos recebidos, pessoas em dia com o prazo do risco, ações pactuadas realizadas e, do lado da experiência, compreensão e facilidade para participar.

## Fora do escopo

Nova oferta de saúde ou serviço paralelo à APS; prontuário ou ficha clínica; integração real com o S+ e envio real pelo WhatsApp (no hackathon são simulados); recompensa em dinheiro; qualquer visão individual para a empresa.

## Decisões tomadas

- **14/11:** celular do trabalhador e totem em rotas próprias (`/t/:token` e `/totem/:unidade`); painéis da APS, da Liderança e de RH e Direção juntos na mesma casca (`/painel/...`).
- **14/11:** visão lado a lado descartada.
- **14/11:** os dados vêm de uma API em Python com FastAPI e Postgres, organizada como monólito modular. O S+ e o WhatsApp continuam simulados, atrás de portas na API.
- **14/11:** tempo real por SSE, com o aviso passando pelo Postgres para a API poder rodar em várias instâncias.
- **14/11:** a privacidade por público é garantida no servidor: cada público tem as suas rotas e recebe só o que pode ver.
- **14/11:** "Meus exames" no celular do trabalhador, com andamento e resultado em linguagem simples. O aviso pelo WhatsApp não leva nenhum detalhe. No protótipo os resultados são fictícios e ficam no banco da API; no produto viriam do S+ sob demanda.

- **14/11:** o totem nunca devolve nem mostra o link pessoal. Com o crachá, a pessoa pede e o link é enviado ao WhatsApp dela (`POST /api/totem/{unidade}/identificacao/link`). Motivo: a matrícula não é segredo, e o link dá acesso aos exames.
- **14/11:** grupo mínimo de 5 também nos totais do RH: o pulso agregado e as semanas só somam turnos visíveis, e motivos com 1 a 4 casos por unidade saem omitidos.
- **14/11:** o painel de RH não mostra os motivos do "não consegui" nem a tabela de pulso por turno. Os motivos não têm fonte real na empresa, e a tabela repetia os totais do pulso. Os alertas por turno ficaram no cartão "Resultados dos totens".
- **14/11:** com dor leve ou forte, o totem mostra um boneco (mulher ou homem, frente e costas) para a pessoa tocar a parte do corpo onde dói mais: cabeça, pescoço, ombros, peito (seios, no desenho da mulher), barriga, braços, mãos, costas, lombar, quadril, joelhos ou pernas e pés. Só a região é guardada, na própria resposta anônima; o sexo do boneco não sai da tela. O RH vê o top 5 dos locais, só de grupos com 5 ou mais respostas.
- **15/11:** o RH vê o top 5 das especialidades médicas mais procuradas em 30 dias, por unidade e sempre agregado (no protótipo, fictício; no produto, viria do S+). Especialidade com menos de 5 consultas no filtro não aparece. O comparativo das unidades saiu do painel.
- **14/11:** o cartão "Onde as pessoas se perdem no retorno" virou "Acompanhamento", com as etapas respondeu WhatsApp → realizou exame → realizou consulta → reavaliação. É diferente do funil oficial do SESI (seção "Como o resultado é medido"), que segue valendo para o pitch.
- **15/11:** a ficha da pessoa no painel da APS virou um resumo: função, idade e data de nascimento (do cadastro do S+), doença crônica lida do risco (3 compensada, 4 descompensada, sem diagnóstico) e o engajamento no programa, de 0 a 100, somando quatro partes explicadas (abriu o plano, passos feitos, retorno, responde às mensagens). Engajamento é participação, não adesão. O resto fica em "Mais detalhes".

A arquitetura e as convenções de código estão no `CLAUDE.md` da raiz.

## Decisões em aberto

- **Onde o sistema roda no dia da demonstração.** Para um celular abrir o link, ele precisa alcançar o front e a API: publicados, ou notebook e celular na mesma rede.
- **Entrada nos painéis.** Hoje não há login; a navegação entre os três painéis é livre. No produto, cada perfil entra só na sua área.
