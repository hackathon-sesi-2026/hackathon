"""Dados fictícios da demonstração. Fazem o papel do que viria do S+ e do painel de BI.

Empresas e médicos de referência vêm da planilha fictícia do evento; pessoas e situações foram inventadas.
Toda data é relativa ao dia em que o seed roda, para a demonstração funcionar em qualquer dia.
Os textos do plano estão em linguagem simples e precisam de revisão de um profissional de saúde.
"""

import hashlib
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.agenda.modelos import Consulta, Liberacao
from selo_saude.modulos.agenda.servico import DadosConsulta
from selo_saude.modulos.cadastro.modelos import Trabalhador
from selo_saude.modulos.cadastro.regras import digitos_verificadores
from selo_saude.modulos.cadastro.servico import TURNOS, DadosTrabalhador, Turno
from selo_saude.modulos.comunicacao import textos
from selo_saude.modulos.comunicacao.modelos import Mensagem
from selo_saude.modulos.exames.modelos import Exame
from selo_saude.modulos.indicadores.modelos import EmDiaPorTurno, ResumoUnidade
from selo_saude.modulos.monitoramento.modelos import Acompanhamento, Registro
from selo_saude.modulos.monitoramento.regras import PRAZO_EM_DIAS
from selo_saude.modulos.plano.modelos import Dificuldade, Passo, PlanoCuidado
from selo_saude.modulos.pulso.modelos import Pulso
from selo_saude.nucleo import relogio
from selo_saude.nucleo.relogio import em_dias

from . import populacao

TABELAS = [
    Mensagem,
    Exame,
    Registro,
    Acompanhamento,
    Dificuldade,
    Passo,
    PlanoCuidado,
    Consulta,
    Liberacao,
    Pulso,
    EmDiaPorTurno,
    ResumoUnidade,
    Trabalhador,
]

A, B, C, ADM = TURNOS
METAL = "Metalúrgica Atlântida Ltda"
PLASTICOS = "Plásticos Recôncavo Ltda"
ALIMENTOS = "Alimentos Vale Verde Ltda"
TEXTIL = "Têxtil Horizonte Ltda"
CERAMICA = "Cerâmica Pedra Azul Ltda"
QUIMICA = "Química Litoral Norte S.A."
EMPRESAS = [METAL, PLASTICOS, ALIMENTOS, TEXTIL, CERAMICA, QUIMICA]
MEDICOS = ["Dra. Beatriz Campos", "Dra. Helena Matos", "Dr. Ricardo Fontes", "Dr. Felipe Andrade"]
ENFERMEIRAS = ["Ana", "Cláudia", "Rita"]
MOTIVACOES = ["familia", "energia", "menos_dor", "sono"]


@dataclass(frozen=True)
class Pessoa:
    nome: str
    funcao: str
    empresa: str
    turno: Turno
    risco: int
    ultimo: int
    """Dias desde a última consulta médica."""
    plano: str
    plano_enviado: int | None = None
    """Dias atrás em que o plano foi enviado."""
    consulta: tuple[int, int, str, bool] | None = None
    """Dias a partir de hoje, hora, status e se é online."""
    lembrete: int | None = None
    """Dias atrás em que o último lembrete foi enviado, sem resposta."""
    checkin: int | None = None
    pediu_contato: bool = False
    passos_feitos: int = 0
    faltas: int = 0
    dificuldade: tuple[str, int, int, str] | None = None
    """Motivo, índice do passo, dias atrás e origem."""
    teach_back: str | None = None
    contato: int | None = None
    """Dias atrás em que a enfermagem fez o último contato."""


# A primeira é a persona oficial do desafio: Marcos, operador de produção, turno 6h–14h, ônibus fretado.
PESSOAS = [
    Pessoa("Marcos Oliveira Santos", "Operador de produção", METAL, A, 2, 170, "enviado", plano_enviado=1,
           consulta=(4, 15, "agendada", False), lembrete=0, faltas=1),
    Pessoa("Juliana Bispo Almeida", "Separadora de pedidos", ALIMENTOS, B, 3, 100, "recebido", lembrete=4,
           passos_feitos=1, faltas=2, dificuldade=("transporte", 1, 2, "checkin")),
    Pessoa("Ana Paula Ferreira", "Costureira", TEXTIL, A, 3, 60, "recebido",
           consulta=(-2, 15, "faltou", False), faltas=2),
    Pessoa("Rafael Lima Conceição", "Soldador", METAL, C, 4, 40, "recebido", passos_feitos=1, faltas=1,
           teach_back="errou", dificuldade=("nao_entendi", 1, 1, "teach_back")),
    Pessoa("Luciana Nascimento Rocha", "Embaladora", ALIMENTOS, B, 2, 90, "recebido",
           checkin=1, pediu_contato=True),
    Pessoa("Sandra Santos Mendes", "Líder de linha", TEXTIL, ADM, 3, 85, "recebido",
           consulta=(3, 9, "remarcar", False)),
    Pessoa("Edson Pereira Almeida", "Almoxarife", PLASTICOS, B, 2, 120, "recebido",
           consulta=(2, 10, "agendada", False), lembrete=4, faltas=1),
    Pessoa("Patrícia Teixeira Carvalho", "Auxiliar de produção", PLASTICOS, A, 2, 200, "enviado", plano_enviado=190,
           faltas=2),
    Pessoa("Leandro Teixeira Rodrigues", "Mecânico de manutenção", CERAMICA, B, 3, 82, "recebido",
           dificuldade=("remedio", 0, 1, "plano")),
    Pessoa("Bruna Nascimento Barbosa", "Operadora de máquinas", PLASTICOS, C, 3, 12, "enviado", plano_enviado=6),
    Pessoa("José Nunes Lima", "Operador de extrusora", QUIMICA, C, 3, 45, "recebido",
           consulta=(6, 19, "confirmada", True), passos_feitos=1),
    Pessoa("Fernanda Rodrigues Costa", "Analista de qualidade", ALIMENTOS, ADM, 1, 30, "recebido", checkin=0),
    Pessoa("Danilo Ribeiro Dias", "Eletricista", CERAMICA, A, 1, 3, "nao_enviado"),
    Pessoa("Aline Araújo Batista", "Técnica de segurança", QUIMICA, ADM, 1, 150, "recebido", passos_feitos=3,
           dificuldade=("tempo", 3, 20, "checkin")),
    Pessoa("Antônio Dias Nascimento", "Caldeireiro", METAL, C, 4, 10, "recebido",
           consulta=(10, 17, "confirmada", False), faltas=1),
]  # fmt: skip

EXAMES = [
    "Hemoglobina glicada (HbA1c)", "Hemograma completo", "Colesterol total e frações", "Triglicerídeos",
    "TGO (AST)", "TGP (ALT)", "Ureia sérica", "Creatinina sérica", "TSH", "T4 livre", "25-hidroxivitamina D",
    "Glicemia em jejum", "Urina tipo 1", "Microalbuminúria em amostra isolada", "Insulina em jejum", "Índice HOMA-IR",
]  # fmt: skip

# "Tradução" das seções do Plano de Cuidados do SESI em passos curtos:
# (categoria, título, detalhe, ganho, prazo em dias).
PASSOS_RISCO_BAIXO = [
    ("exames", "Fazer os exames de sangue e urina",
     "É uma coleta só, de manhã, com jejum de 8 horas. Leve o pedido da médica.",
     "Saber como está o seu corpo antes de sentir dor.", 10),
    ("nutricao", "Marcar conversa com a nutricionista", "Para ajustar a alimentação e o peso, sem dieta radical.",
     "Mais disposição no fim do turno.", 20),
    ("vacina", "Tomar a vacina da gripe", "Leve sua caderneta para a equipe conferir se falta alguma vacina.",
     "Menos chance de ficar de cama e perder dias de trabalho.", 30),
    ("atividade", "Manter o exercício que você já faz", "Do seu jeito, respeitando seus limites. Caminhar já conta.",
     "Menos dor nas costas e sono melhor.", 60),
    ("retorno", "Voltar à médica de família", "Para ver os resultados dos exames e combinar os próximos passos.",
     "Tirar dúvidas e ajustar o plano ao seu ritmo.", 45),
]  # fmt: skip
PASSOS_RISCO_ALTO = [
    ("remedio", "Tomar o remédio no horário combinado",
     "Mesmo quando estiver se sentindo bem. Se acabar, avise a equipe.",
     "Dias mais estáveis, com menos altos e baixos.", 7),
    ("psicologia", "Marcar conversa com a psicóloga",
     "A equipe ajuda a achar um horário fora do seu turno, presencial ou por vídeo.",
     "Um espaço só seu para desabafar, em sigilo.", 14),
    ("habitos", "Beber 2 litros de água e cuidar do sono",
     "Pequenos passos contam: uma garrafa no posto de trabalho já ajuda.",
     "Menos dor de cabeça e mais energia já nesta semana.", 21),
    ("retorno", "Retorno com a médica de família", "Para ver como você está e ajustar o plano se precisar.",
     "Ajustar o que não está funcionando.", 30),
]  # fmt: skip

# Resultados fictícios, com valores de referência simplificados. Cada item diz o que é, o que o número
# quer dizer e o que ajuda. Nunca diagnóstico: quem explica é a médica no retorno.
# (nome técnico, em linguagem simples, valor, referência, situação, explicação)
RESULTADO_ATUAL = [
    ("Glicemia em jejum", "Açúcar no sangue", "98 mg/dL", "70 a 99", "normal", "Dentro do esperado."),
    ("Hemoglobina glicada (HbA1c)", "Média do açúcar nos últimos 3 meses", "5,6%", "abaixo de 5,7", "normal",
     "Dentro do esperado, mas perto do limite. Vale manter a caminhada."),
    ("Colesterol total", "Gordura no sangue", "228 mg/dL", "abaixo de 190", "atencao",
     "Um pouco acima. Alimentação e caminhada ajudam; a nutricionista combina isso com você."),
    ("Triglicerídeos", "Outro tipo de gordura no sangue", "190 mg/dL", "abaixo de 150", "atencao",
     "Acima do esperado. Diminuir embutidos e bebida alcoólica costuma ajudar bastante."),
    ("Hemograma completo", "Células do sangue", "Sem alterações", "—", "normal", "Tudo certo."),
    ("Creatinina sérica", "Como os rins estão funcionando", "0,9 mg/dL", "0,7 a 1,3", "normal", "Dentro do esperado."),
    ("25-hidroxivitamina D", "Vitamina D", "24 ng/mL", "20 a 60", "normal",
     "Dentro do esperado. Tomar um pouco de sol fora do turno ajuda a manter."),
]  # fmt: skip
RESULTADO_DO_CHECKUP_ANTERIOR = [
    ("Glicemia em jejum", "Açúcar no sangue", "95 mg/dL", "70 a 99", "normal", "Dentro do esperado."),
    ("Colesterol total", "Gordura no sangue", "212 mg/dL", "abaixo de 190", "atencao",
     "Um pouco acima. Foi conversado no retorno."),
    ("Hemograma completo", "Células do sangue", "Sem alterações", "—", "normal", "Tudo certo."),
]  # fmt: skip
_CAMPOS_DO_ITEM = ("nome", "simples", "valor", "referencia", "situacao", "explicacao")

# Consultas por especialidade nos últimos 30 dias (agregado que viria do S+). Ortopedia na frente: dor no trabalho.
ESPECIALIDADES_POR_UNIDADE = {
    "Planta Camaçari": {
        "ortopedia": 46,
        "clinica_geral": 38,
        "cardiologia": 24,
        "endocrinologia": 19,
        "oftalmologia": 12,
        "dermatologia": 8,
        "psiquiatria": 7,
    },
    "Planta Simões Filho": {
        "ortopedia": 29,
        "clinica_geral": 22,
        "cardiologia": 13,
        "endocrinologia": 11,
        "oftalmologia": 6,
        "dermatologia": 4,
        "psiquiatria": 3,
    },
    "Escritório Salvador": {"clinica_geral": 2, "oftalmologia": 1},
}
UNIDADES = [
    ("Planta Camaçari", 420, (168, 131, 104, 72), 51, 76, 82, 64, (21, 17, 9, 4, 3, 5)),
    ("Planta Simões Filho", 260, (104, 76, 58, 35), 49, 63, 68, 55, (9, 14, 6, 2, 4, 2)),
    ("Escritório Salvador", 4, (3, 3, 2, 1), 50, 100, 100, 75, (1, 0, 0, 0, 0, 0)),  # abaixo do mínimo: fica oculto
]
EM_DIA = {
    "Planta Camaçari": {"Turno A": 71, "Turno B": 62, "Turno C (noite)": 48},
    "Planta Simões Filho": {"Turno A": 58, "Turno B": 52},
}
# Perfil do pulso por unidade e turno: respostas por dia e chance de dor, de "cansado(a)" e de "mais ou menos".
PERFIS_DO_PULSO = {
    ("Planta Camaçari", "Turno A"): (9, 0.45, 0.22, 0.30),
    ("Planta Camaçari", "Turno B"): (7, 0.30, 0.15, 0.25),
    ("Planta Camaçari", "Turno C (noite)"): (4, 0.40, 0.45, 0.30),
    ("Planta Simões Filho", "Turno A"): (5, 0.50, 0.20, 0.30),
    ("Planta Simões Filho", "Turno B"): (4, 0.25, 0.15, 0.25),
}
# Onde dói, entre quem relata dor no totem: peso relativo de cada região (perfil típico de indústria).
PESOS_DOS_LOCAIS_DE_DOR = {
    "lombar": 30,
    "ombros": 18,
    "maos_punhos": 14,
    "costas": 11,
    "pescoco": 9,
    "joelhos": 7,
    "pernas_pes": 5,
    "cabeca": 3,
    "barriga": 3,
    "bracos": 2,
    "peito": 2,
    "quadril": 1,
}
NOMES_FICTICIOS = ["Carla M.", "Jorge S.", "Renata L.", "Paulo R.", "Tânia B.", "Ivo C."]


def cpf_de_demonstracao(i: int) -> str:
    """CPF fictício e fixo por pessoa, na faixa 000.000.0xx-xx usada para testes. O do Marcos é 000.000.001-91."""
    base = f"{i + 1:09d}"
    return base + digitos_verificadores(base)


def token_de_demonstracao(trabalhador_id: str) -> str:
    """Token fixo por pessoa, para o link do celular continuar valendo depois de reiniciar a demonstração.

    No produto o token é aleatório e trocado a cada envio do link.
    """
    return hashlib.sha256(f"selo-saude-demo:{trabalhador_id}".encode()).hexdigest()[:24]


async def semear_se_vazio(sessao: AsyncSession) -> bool:
    if await sessao.scalar(select(func.count()).select_from(Trabalhador)):
        return False
    await semear(sessao)
    return True


async def reiniciar(sessao: AsyncSession) -> None:
    for tabela in TABELAS:
        await sessao.execute(delete(tabela))
    await semear(sessao)


async def semear(sessao: AsyncSession, hoje: datetime | None = None) -> None:
    hoje = hoje or relogio.agora()
    for indice, pessoa in enumerate(PESSOAS):
        sessao.add_all(_registros_da_pessoa(indice, pessoa, hoje))
        await sessao.flush()  # mantém a ordem das mensagens e dos registros de cada pessoa
    # A carteira em escala: em blocos, para o reinício da demonstração levar segundos, não minutos.
    geradas = populacao.gerar(populacao.TOTAL_DE_PACIENTES - len(PESSOAS), EMPRESAS)
    for inicio in range(0, len(geradas), 500):
        for deslocamento, pessoa in enumerate(geradas[inicio : inicio + 500]):
            indice = len(PESSOAS) + inicio + deslocamento
            sessao.add_all(_registros_da_pessoa(indice, pessoa, hoje, com_exames=False))
        await sessao.flush()
    sessao.add_all(_unidades())
    sessao.add_all(_pulsos(hoje))
    sessao.add_all(_liberacoes(hoje))
    await sessao.flush()


def _registros_da_pessoa(i: int, p: Pessoa, hoje: datetime, com_exames: bool = True) -> list:
    tid = f"t{i + 1}"
    trabalhador = Trabalhador(
        id=tid,
        token_acesso=token_de_demonstracao(tid),
        matricula=str(20261001 + i * 37),
        cpf=cpf_de_demonstracao(i),
        nome=p.nome,
        funcao=p.funcao,
        data_nascimento=_nascimento(i, hoje),
        empresa=p.empresa,
        unidade="Planta Camaçari" if p.empresa == METAL else "Unidade única",
        medico_referencia=MEDICOS[i % len(MEDICOS)],
        enfermeira=ENFERMEIRAS[i % len(ENFERMEIRAS)],
        motivacao=None if i == 0 else MOTIVACOES[i % len(MOTIVACOES)],
        turno_nome=p.turno.nome,
        turno_inicio=p.turno.inicio,
        turno_fim=p.turno.fim,
        risco=p.risco,
        ultima_consulta_medica=em_dias(hoje, -p.ultimo, 10),
        faltas_ultimo_ano=p.faltas,
    )
    dados = DadosTrabalhador(
        id=tid, token_acesso="", matricula="", cpf=None, nome=p.nome, funcao="",
        data_nascimento=trabalhador.data_nascimento,
        empresa="", unidade="", medico_referencia="",
        enfermeira=trabalhador.enfermeira, motivacao=trabalhador.motivacao, turno=p.turno, risco=p.risco,
        ultima_consulta_medica=trabalhador.ultima_consulta_medica, faltas_ultimo_ano=p.faltas,
    )  # fmt: skip

    consulta = None
    if p.consulta:
        dias, hora, status, online = p.consulta
        local = "Teleatendimento" if online else "Unidade SESI Centro" if hora < 8 else "Ambulatório SESI na empresa"
        consulta = Consulta(
            id=f"{tid}-c1", trabalhador_id=tid, data=em_dias(hoje, dias, hora), local=local,
            profissional="Enfermeira de cuidado", modalidade="online" if online else "presencial", status=status,
            nome_para_lideranca=False, compromisso=None, lembretes_automaticos=[],
        )  # fmt: skip

    data_envio = None if p.plano == "nao_enviado" else em_dias(hoje, -(p.plano_enviado or p.ultimo - 1), 11)
    plano = PlanoCuidado(
        trabalhador_id=tid,
        status=p.plano,
        data_envio=data_envio,
        teach_back=p.teach_back or ("acertou" if p.plano == "recebido" else "pendente"),
        semanas_seguidas=2 if i == 0 else (i * 3) % 6,
        ultima_semana_contada=None,
    )
    modelo = PASSOS_RISCO_BAIXO if p.risco <= 2 else PASSOS_RISCO_ALTO
    passos = [
        Passo(
            id=f"{tid}-p{n + 1}",
            trabalhador_id=tid,
            ordem=n + 1,
            categoria=categoria,
            titulo=titulo,
            detalhe=detalhe,
            ganho=ganho,
            prazo=em_dias(hoje, prazo),
            feito=n < p.passos_feitos,
            itens_tecnicos=EXAMES if categoria == "exames" else None,
        )  # fmt: skip
        for n, (categoria, titulo, detalhe, ganho, prazo) in enumerate(modelo)
    ]

    # Exames: o check-up anterior, já com resultado, e os pedidos agora para quem tem esse passo no plano.
    anterior = em_dias(hoje, -(p.ultimo + 300), 9)
    exames = [
        Exame(
            id=f"{tid}-ex0",
            trabalhador_id=tid,
            titulo="Exames do último check-up",
            pedido_por=trabalhador.medico_referencia,
            data_pedido=anterior,
            data_coleta=anterior,
            data_resultado=anterior,
            status="resultado",
            passo_id=None,
            resultado_visto=True,
            itens=_itens(RESULTADO_DO_CHECKUP_ANTERIOR),
        )  # fmt: skip
    ]
    passo_de_exames = next((x for x in passos if x.categoria == "exames"), None)
    if passo_de_exames:
        feito = passo_de_exames.feito
        exames.append(
            Exame(
                id=f"{tid}-ex1",
                trabalhador_id=tid,
                titulo="Exames de sangue e urina",
                pedido_por=trabalhador.medico_referencia,
                data_pedido=trabalhador.ultima_consulta_medica,
                data_coleta=em_dias(hoje, -(p.ultimo - 5), 7) if feito else None,
                data_resultado=em_dias(hoje, -(p.ultimo - 8), 14) if feito else None,
                status="resultado" if feito else "pedido",
                passo_id=passo_de_exames.id,
                resultado_visto=True,
                itens=_itens(RESULTADO_ATUAL),
            )  # fmt: skip
        )

    mensagens: list[Mensagem] = []
    registros: list[Registro] = []

    def mensagem(sufixo: str, de: str, texto: str, hora: datetime, acoes: list[str] | None = None) -> None:
        # Nada no futuro: logo depois da meia-noite, "hoje às 8h30" ainda não aconteceu e furaria a ordem da conversa.
        hora = min(hora, hoje)
        mensagens.append(Mensagem(id=f"{tid}-{sufixo}", trabalhador_id=tid, de=de, texto=texto, hora=hora, acoes=acoes))

    def registro(sufixo: str, tipo: str, data: datetime, nota: str | None = None) -> None:
        registros.append(Registro(id=f"{tid}-{sufixo}", trabalhador_id=tid, tipo=tipo, data=min(data, hoje), nota=nota))

    dificuldade = None
    if p.dificuldade:
        motivo, indice_do_passo, dias, origem = p.dificuldade
        quando = em_dias(hoje, -dias, 18, 20)
        resolvida = dias > 10  # a dificuldade antiga já foi resolvida: mostra o histórico funcionando
        passo = passos[indice_do_passo] if indice_do_passo < len(passos) else None
        dificuldade = Dificuldade(
            id=f"{tid}-d1", trabalhador_id=tid, motivo=motivo, passo_id=passo.id if passo else None, origem=origem,
            data=quando, resolvida=resolvida, nota="Remarcado por vídeo" if resolvida else None,
        )  # fmt: skip
        if origem == "checkin":
            mensagem(
                "m6",
                "sesi",
                f"Oi, {dados.primeiro_nome}! Passando para saber do seu plano. "
                f"Esta semana você conseguiu fazer o passo {indice_do_passo + 1}?",
                quando - timedelta(hours=3),
            )
            mensagem("m7", "trabalhador", textos.RESPOSTA_DO_TRABALHADOR["habito_nao"], quando)
        if origem == "teach_back":
            registro("e-d", "teach_back", quando, "errou a pergunta de checagem")
        else:
            mensagem("m8", "sesi", textos.RESPOSTA_AO_MOTIVO[motivo], quando + timedelta(minutes=1))
            registro("e-d", "dificuldade", quando)
        if resolvida:
            registro("e-dr", "dificuldade_resolvida", em_dias(hoje, -18, 10), dificuldade.nota)

    dados_consulta = DadosConsulta.model_validate(consulta) if consulta else None
    if data_envio:
        mensagem("m0", "sesi", textos.plano_pronto(dados).texto, data_envio)
        registro("e-pe", "plano_enviado", data_envio)
        if p.plano == "recebido":
            registro("e-pr", "plano_recebido", em_dias(hoje, -(p.ultimo - 2), 19))
    if consulta and consulta.status == "faltou":
        registro("e0", "faltou", consulta.data)
    if p.lembrete is not None:
        quando = em_dias(hoje, -p.lembrete, 8, 30)
        lembrete = textos.lembrete(dados, dados_consulta)
        mensagem("m1", "sesi", lembrete.texto, quando, lembrete.acoes)
        registro("e1", "lembrete", quando)
    if dados_consulta and dados_consulta.status == "remarcar":
        quando = em_dias(hoje, -1, 19, 10)
        antes = textos.lembrete(dados, dados_consulta.model_copy(update={"status": "agendada"}))
        mensagem("m1", "sesi", antes.texto, em_dias(hoje, -1, 8, 30))
        mensagem("m2", "trabalhador", textos.RESPOSTA_DO_TRABALHADOR["remarcar"], quando)
        registro("e2", "pediu_remarcar", quando)
    if p.checkin is not None:
        checkin = textos.checkin(dados)
        mensagem("m3", "sesi", checkin.texto, em_dias(hoje, -p.checkin, 9), None if p.pediu_contato else checkin.acoes)
        if p.pediu_contato:
            pedido = em_dias(hoje, -p.checkin, 12, 40)
            mensagem("m4", "trabalhador", textos.RESPOSTA_DO_TRABALHADOR["checkin_ajuda"], pedido)
            mensagem("m5", "sesi", textos.CHECKIN_PEDIU_CONTATO.texto, pedido + timedelta(minutes=1))
            registro("e3", "checkin_ajuda", pedido)

    mensagens.sort(key=lambda m: m.hora)
    registros.sort(key=lambda r: r.data)
    # Só a última mensagem do SESI mantém botões.
    ultima_do_sesi = next((m for m in reversed(mensagens) if m.de == "sesi"), None)
    for m in mensagens:
        if m is not ultima_do_sesi:
            m.acoes = None
    if ultima_do_sesi and not ultima_do_sesi.acoes and p.plano == "enviado":
        ultima_do_sesi.acoes = ["plano"]

    acompanhamento = Acompanhamento(
        trabalhador_id=tid,
        ultimo_contato_enfermagem=None if p.contato is None else em_dias(hoje, -p.contato, 10),
        proximo_monitoramento=em_dias(hoje, PRAZO_EM_DIAS[p.risco] - p.ultimo),
        pediu_contato=p.pediu_contato,
    )
    fixos = [trabalhador, plano, acompanhamento, *passos, *(exames if com_exames else [])]
    return [*fixos, *([consulta] if consulta else []), *([dificuldade] if dificuldade else []), *mensagens, *registros]


def _itens(resultado: list[tuple[str, ...]]) -> list[dict[str, str]]:
    return [dict(zip(_CAMPOS_DO_ITEM, item, strict=True)) for item in resultado]


def _unidades() -> list:
    motivos = ("tempo", "transporte", "nao_entendi", "remedio", "dinheiro", "outro")
    etapas = ("whatsapp", "exame", "consulta", "reavaliacao")
    linhas: list = [
        ResumoUnidade(
            unidade=unidade,
            empresa=METAL,
            vidas=vidas,
            funil=dict(zip(etapas, funil, strict=True)),
            comparecimento_antes=antes,
            comparecimento_agora=agora,
            planos_recebidos=planos,
            em_dia_com_risco=em_dia,
            motivos=dict(zip(motivos, contagem, strict=True)),
            especialidades=ESPECIALIDADES_POR_UNIDADE.get(unidade, {}),
        )  # fmt: skip
        for unidade, vidas, funil, antes, agora, planos, em_dia, contagem in UNIDADES
    ]
    for unidade, turnos in EM_DIA.items():
        linhas += [EmDiaPorTurno(unidade=unidade, turno=turno, percentual=valor) for turno, valor in turnos.items()]
    return linhas


def _nascimento(i: int, hoje: datetime) -> date:
    """Data de nascimento fictícia e fixa por pessoa: idades de 24 a 58 anos, relativas a hoje."""
    idade = 24 + (i * 13 + 17) % 35
    return date(relogio.local(hoje).year - idade, 1 + (i * 5) % 12, 1 + (i * 11) % 28)


def _sorteio(semente: int):
    """Gerador determinístico: os dados fictícios são sempre os mesmos."""
    x = semente

    def proximo() -> float:
        nonlocal x
        x = (x * 9301 + 49297) % 233280
        return x / 233280

    return proximo


def _pulsos(hoje: datetime) -> list[Pulso]:
    """Respostas anônimas do totem nas últimas 4 semanas, com a participação crescendo nas 2 últimas."""
    sorteio = _sorteio(42)

    def bem_estar(cansado: float, mais_ou_menos: float) -> int:
        r = sorteio()
        if r < cansado:
            return 1
        if r < cansado + mais_ou_menos:
            return 2
        return 3 if sorteio() < 0.6 else 4

    locais = list(PESOS_DOS_LOCAIS_DE_DOR)
    total_dos_pesos = sum(PESOS_DOS_LOCAIS_DE_DOR.values())

    def local_da_dor() -> str:
        alvo, soma = sorteio() * total_dos_pesos, 0
        for local in locais:
            soma += PESOS_DOS_LOCAIS_DE_DOR[local]
            if alvo < soma:
                return local
        return locais[-1]

    pulsos: list[Pulso] = []
    for (unidade, turno), (por_dia, com_dor, cansado, mais_ou_menos) in PERFIS_DO_PULSO.items():
        for d in range(28, 0, -1):
            if em_dias(hoje, -d).weekday() == relogio.DOMINGO:
                continue
            quantidade = int(por_dia * (0.6 + sorteio() * 0.8) * (1.25 if d < 14 else 1) + 0.5)
            for _ in range(quantidade):
                pulsos.append(
                    Pulso(
                        id=f"p{len(pulsos)}",
                        unidade=unidade,
                        turno=turno,
                        data=em_dias(hoje, -d, 6 + int(sorteio() * 12)),
                        bem_estar=bem_estar(cansado, mais_ou_menos),
                        local_dor=local_da_dor() if sorteio() < com_dor else None,
                    )
                )
    return pulsos


def _liberacoes(hoje: datetime) -> list[Liberacao]:
    """Compromissos de saúde que caem no turno na próxima semana. Nome só quando a pessoa autorizou."""
    sorteio = _sorteio(7)
    liberacoes: list[Liberacao] = []
    for d in range(1, 8):
        if em_dias(hoje, d).weekday() in (relogio.SABADO, relogio.DOMINGO):
            continue
        for turno, horas in (("Turno A", (7, 8, 9, 10, 11, 13)), ("Turno B", (15, 16, 17, 18, 19, 20))):
            for _ in range(int(sorteio() * 3.2)):
                hora = horas[int(sorteio() * len(horas))]
                minuto = 0 if sorteio() < 0.5 else 30
                nome = NOMES_FICTICIOS[int(sorteio() * len(NOMES_FICTICIOS))] if sorteio() < 0.55 else None
                liberacoes.append(
                    Liberacao(
                        id=f"l{len(liberacoes)}",
                        unidade="Planta Camaçari",
                        turno=turno,
                        inicio=em_dias(hoje, d, hora, minuto),
                        duracao_min=20,
                        nome=nome,
                    )  # fmt: skip
                )
    return liberacoes
