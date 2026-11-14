# Preenchimento do Miro — Selo Saúde (Café com Bugs)

Um post-it por linha. **Grupo:** Café com Bugs.
Fonte: material oficial do desafio, Notion do time, pesquisas e protótipo. Dados fictícios.

---

## 1. Matriz CSD

**Certezas**
- ~50% de não comparecimento aos atendimentos agendados (dado do SESI)
- APS do SESI é boa: 94% de resolutividade, NPS 97 — o problema é sustentar a participação
- 10.025 vidas em 104 estabelecimentos (SESI Saúde Acolhe)
- Retorno por risco: riscos 1 e 2 a cada 6 meses, risco 3 a cada 3 meses, risco 4 a critério médico
- O retorno tem 4 passos: contato → resposta → agendamento → comparecimento
- Ecossistema: S+ e planilhas, WhatsApp, chatbot em implantação, BI
- Persona teme que o chefe saiba; nada individual pode chegar ao gestor
- Sem API no evento: só dados fictícios

**Suposições**
- A falta vem mais de tempo/turno e transporte do que de desinteresse
- O trabalhador não entende o plano de cuidado técnico (16 exames por nome)
- WhatsApp é o canal de menor atrito para o operário
- Dizer o motivo do "não consegui" permite agir na causa
- Prever o risco de falta + contato humano reduz faltas (RR ~0,61 na literatura)

**Dúvidas**
- Como o 50% é calculado (denominador, período)?
- Como a enfermeira descobre hoje quem sumiu?
- A empresa libera o trabalhador para consulta dentro do turno?
- Que dados o S+ guarda (histórico de faltas, escala)?
- Qual a causa dominante do abandono?

---

## 2. Canvas de Persona

- **Nome:** Marcos
- **Idade:** 38
- **Ocupação:** operador de produção (9 anos)
- **Rotina:** acorda 4h30, fretado de 1h10, turno 6h–14h, chega exausto
- **Frase:** "Se eu for no médico da firma, o chefe vai ficar sabendo."

**Objetivos**
- Continuar trabalhando e garantir a renda
- Estar bem para os filhos
- Chegar em casa menos "moído" e dormir melhor

**Dores e frustrações**
- Sem tempo fora do turno; a APS pede o turno oposto
- Perder o fretado se ficar depois do turno
- Medo de ser considerado inapto
- Apps complexos, cheios de cadastro

**Comportamentos e hábitos**
- Só procura ajuda quando dói forte
- Farmácia e UPA como porta de entrada
- Trabalha com dor para não perder o prêmio de assiduidade
- Recebeu indicação de acompanhamento (pressão 15x9) e não voltou

**Canais e influências**
- Celular no ônibus (WhatsApp)
- Colegas de linha (confia mais neles do que em cartaz)
- DDS com o líder

---

## 3. Mapa de Empatia (Marcos)

**Pensa e sente**
- "Médico é para quando dói"
- Medo de perder o emprego
- Pensa no AVC do pai, mas afasta o pensamento

**Escuta**
- Colega indicando anti-inflamatório
- Chefe cobrando meta
- "Ir ao médico sem dor é corpo mole"

**Vê**
- UBS fechada no horário do turno
- APS da empresa associada ao "apto/inapto"
- Colegas trabalhando com dor

**Fala e faz**
- "Não tenho tempo nem para respirar"
- Omite sintomas
- Não responde à mensagem de retorno

**Dor**
- Medo de exposição ao gestor
- Falta de tempo e transporte
- Não entende o plano

**Ganhos**
- Cuidar sem perder o turno nem o fretado
- Sigilo garantido
- Sentir menos dor e ter mais energia logo

---

## 4. Canvas Jobs-to-be-Done

- **Persona:** Marcos, operador em turno fixo, sem plano de saúde
- **Dor / Problema:** recebe o plano e a convocação, não consegue seguir e ninguém sabe por quê; vira só "falta"
- **Solução / Resultado funcional:** lembretes que cabem no turno, plano em 3 passos e um "não consegui" com o motivo em 1 toque
- **Job funcional:** cuidar da saúde sem perder o turno nem o fretado
- **Job social:** não ser visto como "corpo mole" nem inapto pelo chefe e pelos colegas
- **Job emocional:** sentir-se seguro e respeitado, sem sermão
- **Necessidade básica atendida:** acesso contínuo ao cuidado, a única opção dele sem plano de saúde
- **Proposta de valor chave:** "Quando não consigo seguir o plano, digo o porquê em um toque e a equipe resolve a causa, sem que a empresa saiba."

---

## 5. Árvore de Oportunidades

**Resultado desejado:** reduzir o não comparecimento de ~50% para 35% em 90 dias (piloto em 1 planta)

**Oportunidade 1 — "Meu horário não bate com o turno e o fretado"**
- Solução: horários fora do turno, por vídeo ou 20 min no turno → Experimento: % que escolhe vídeo/no turno
- Solução: 2 horários mais próximos em destaque → Experimento: tempo entre marcar e ir

**Oportunidade 2 — "Não entendi o plano / não consegui fazer"**
- Solução: plano traduzido em 3 passos + pergunta de checagem → Experimento: % que acerta a checagem
- Solução: botão "não consegui" com o motivo → Experimento: % de dificuldades resolvidas em 48h

**Oportunidade 3 — "A enfermeira não sabe quem está sumindo"**
- Solução: radar de risco de falta com o porquê → Experimento: faltas no grupo contatado x não contatado
- Solução: lembretes D-3 e D-1 + plano se-então → Experimento: comparecimento com 2 lembretes x 1

---

## 6. Canvas de Proposta de Valor

**Produtos e serviços**
- WhatsApp com lembretes, check-in do plano e "não consegui"
- Página leve do plano (sem instalar app)
- Painel da enfermeira com radar de risco
- Totem por unidade; visões agregadas para RH e liderança

**Criadores de ganho**
- Horário garantido, sem fila, ao confirmar
- "O que você ganha" em cada passo
- Selos e meta coletiva do turno (sem ranking)

**Aliviadores de dor**
- Horário por vídeo, no turno ou fora do turno
- Sigilo: a empresa não vê nada individual
- Motivo em 1 toque, sem burocracia

**Tarefas do cliente**
- Saber o próximo passo e quando
- Marcar sem perder o turno
- Avisar quando não conseguiu

**Ganhos**
- Menos dor, mais energia, dormir melhor
- Ser tratado com respeito
- Praticidade

**Dores**
- Falta de tempo e transporte
- Medo de exposição
- Plano técnico e confuso

---

## 7. Business Model Canvas

- **Parceiros chave:** SESI Saúde Acolhe (equipe de APS), empresas industriais, S+ / futuro Klingo, WhatsApp Business
- **Atividades chave:** lembretes e check-ins, tradução do plano, radar de risco, painel da enfermagem, indicadores agregados
- **Recursos chave:** plataforma (adaptador S+), regras de risco, equipe de enfermagem, totens
- **Proposta de valor:** descobrir por que o trabalhador sai do cuidado e dizer à enfermeira quem procurar primeiro e como ajudar
- **Relacionamento com clientes:** mensagens em nome da enfermeira de referência; acompanhamento contínuo
- **Canais:** WhatsApp, página leve, totem na unidade, painel web
- **Segmentos de clientes:** trabalhador da indústria em turno (usuário), equipe de APS do SESI (operador), empresas contratantes (pagador)
- **Custos:** desenvolvimento e hospedagem, mensagens WhatsApp Business, totens, integração com o S+, suporte [valores da planilha de viabilidade]
- **Receitas:** módulo do SESI Saúde Acolhe por vida/mês pago pela empresa [R$__]; ganho de eficiência da APS (menos vagas perdidas)
