# Gatilhos mentais positivos para engajar no atendimento primário

*Convertido de `prototipo/Gatilhos mentais positivos para engajar no atendimento primário.docx` (14/11/2026, João Vitor).*

## Resumo

Lembretes bem desenhados e redução de atrito são os gatilhos com mais respaldo para levar pessoas ao atendimento e fazê-las seguir as orientações. Progresso visível, reconhecimento, enquadramento de ganho, compromisso e pequenas recompensas ajudam, mas com efeito menor ou de curto prazo. Esta pesquisa revisou meta-análises e revisões sobre nudges, lembretes, incentivos, gamificação, mensagens e compromisso; os números variam entre fontes e valem como ordem de grandeza para testar no piloto.

## Gatilhos com melhor respaldo

Seis gatilhos têm base em estudos; os dois primeiros são os mais sólidos.

| Gatilho | O que a pesquisa mostra | Cuidado | Exemplo sem WhatsApp |
|---|---|---|---|
| 1. Lembretes bem desenhados | Meta-análise de 19 RCTs (2.690 pessoas) com doenças crônicas: efeito moderado de nudges na adesão a medicamentos, maior com lembretes e intervenções mais longas. SMS comportamental em hospitais de NSW reduziu faltas em 34%. Mais de um lembrete supera um só. | Estudos variam muito e têm risco de viés moderado | SMS, ligação curta, cartão de retorno com data escrita, e-mail |
| 2. Facilidade e proximidade | Quanto maior o intervalo entre marcar e ir, maior o risco de falta; espera longa e comunicação confusa são causas do lado do sistema | Depende da agenda da unidade | Agendar mais perto da data, confirmar com uma frase clara |
| 3. Progresso visível e reconhecimento | Pontos, níveis, feedback e desafios são os elementos mais usados em saúde digital e a revisão aponta melhora de comportamentos | Engajamento tende a ser de curto prazo; evitar ranking e comparação, sobretudo com pessoas em sofrimento | Barra de etapas, selo por manter o acompanhamento |
| 4. Enquadramento de ganho | Meta-análise de 94 estudos: mensagens de ganho tendem a funcionar melhor que as de perda para prevenção, sem diferença para detecção | Efeito pequeno e varia por tema | "A consulta de rotina mantém você bem para o que importa" |
| 5. Compromisso e plano se-então | Ajuda a fechar a distância entre intenção e ação | Pouco usado na saúde; um estudo questionou que mais compromisso melhore resultados; deve ser opcional | "Se eu sair do trabalho na quarta, então passo na unidade" |
| 6. Pequenas recompensas imediatas | Contrabalançam a tendência de valorizar o presente; funcionam no curto prazo para comportamentos simples e bem definidos | Efeito cai com o tempo; um RCT australiano com incentivo monetário pequeno não melhorou o comparecimento | Prioridade na fila, horário reservado, brinde simples |

## Gatilhos plausíveis, ainda não testados aqui

Estes três vêm de princípios gerais da psicologia da persuasão, não dos estudos revisados, então valem como hipóteses para o piloto.

- **Reciprocidade e acolhimento:** ser tratado com atenção e respeito gera disposição de retribuir voltando.
- **Prova social e identidade:** "muitas pessoas do seu bairro já fazem o acompanhamento", com depoimentos reais e curtos.
- **Autonomia:** oferecer duas opções de horário ou de canal, para a pessoa sentir que escolheu.

## O que evitar

Evite escassez falsa, urgência artificial e o uso de medo ou culpa para forçar a ida ao atendimento. Em saúde, isso queima a confiança, que é justamente o problema do perfil que o hackathon quer alcançar.

## Como ligar ao formulário

A pergunta 5 do formulário (ver `formulario-perfil-usuario.md`) indica qual gatilho priorizar em cada grupo; teste 1 ou 2 no seu público e meça o resultado antes de ampliar.

| Resposta mais marcada na pergunta 5 | Gatilho a priorizar |
|---|---|
| Lembretes e avisos simples | 1 (lembretes) e 2 (facilidade) |
| Atendimento mais rápido ou agendado | 2 (facilidade e proximidade) |
| Explicações mais claras | 4 (enquadramento de ganho) e 5 (compromisso) |
| Ser tratado(a) com mais atenção e respeito | Reciprocidade e acolhimento |
| Acompanhamento de alguém da equipe | Reciprocidade e 5 (compromisso) |
| Benefícios ou reconhecimento | 3 (progresso e reconhecimento) e 6 (pequenas recompensas) |

## Fontes

Buscas feitas em 14/11/2026; as páginas foram lidas pelos trechos retornados na busca, e algumas fontes de lembretes são de empresas do setor, então os percentuais são indicativos.

- Nudges e adesão a medicamentos, meta-análise (Annals of Behavioral Medicine, 2025)
- NSW Behavioural Insights Unit: lembretes e faltas em hospitais
- Lembretes e faltas, 21 estudos
- Estratégias para reduzir faltas
- Gamificação em saúde, revisão sistemática
- Gamificação em e-Health, revisão sistemática
- Gamificação em apps de saúde mental, revisão sistemática (JMIR)
- Enquadramento de mensagens, meta-análise (Annals of Behavioral Medicine)
- Dispositivos de compromisso, visão geral
- Dispositivo de compromisso: desafios de adesão
- Savani: dispositivo de compromisso e perda de peso
- Incentivos financeiros em rastreamento de câncer, meta-análise
- Incentivos econômicos para cuidado preventivo (INAHTA)
- Incentivos financeiros e mudança de comportamento, meta-análise
- RCT de incentivo monetário a pacientes, Austrália

*Os links das fontes estão no .docx original.*

---

## Mapa: gatilho → protótipo hoje → o que falta (análise de 14/11)

| Gatilho | Já aplicado no protótipo | Lacuna / proposta |
|---|---|---|
| 1. Lembretes bem desenhados | Lembrete com confirmar/remarcar em 1 toque e "já combine como vai chegar" | **Lembretes automáticos D-3 e D-1** (hoje só a enfermeira dispara). Mostrar no painel "lembretes programados". |
| 2. Facilidade e proximidade | Horários fora do turno, por vídeo e no turno (20 min); confirmação em frase clara | Destacar no topo **os 2 horários mais próximos** (encurta o intervalo marcar → ir). |
| 3. Progresso e reconhecimento | Barra de passos, sequência semanal 🔥, comemoração ao concluir, meta coletiva do turno; sem ranking | **Selo** ao manter o acompanhamento (ex.: "3 meses em dia"). Continuar sem ranking. |
| 4. Enquadramento de ganho | "✨ O que você ganha" em cada passo | Levar o ganho para o **texto do lembrete** ("a consulta mantém você bem para [sua motivação]"). |
| 5. Compromisso se-então | Só a dica genérica no lembrete | Ao confirmar, **plano se-então opcional**: "Quando sair do turno na quarta, vou de: fretado / a pé / vídeo". |
| 6. Pequenas recompensas | Café do turno (coletivo) | Recompensa **não monetária e individual**: "horário garantido / sem fila" para quem confirma. |
| Reciprocidade e acolhimento | Tom das mensagens, resposta ao "não consegui" | **Nome da enfermeira** nas mensagens ("Aqui é a Ana, sua enfermeira"). |
| Prova social | Totem ("X colegas responderam hoje"), meta do turno | Ok. Depoimentos reais só no piloto. |
| Autonomia | Escolhe horário, canal e a própria motivação | Ok. |
| Evitar culpa | — | Revisar "sua vaga pode atender um colega": tem evidência (NHS, −23%), mas beira a culpa. Sugestão: "Se não puder, remarque aqui: assim a vaga fica livre para um colega." |
| Formulário (pergunta 5) | Não existe | **Personalizar os gatilhos por perfil**: a pergunta 5 no totem ou no 1º contato define quais gatilhos cada pessoa recebe (barreira → facilidade e lembretes; desconfiança → acolhimento e explicação). O RH vê a distribuição por unidade, agregada. |
