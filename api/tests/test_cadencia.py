"""Cadência das mensagens do WhatsApp: o que o agendador manda hoje, e quando ele fica quieto (docs/whatsapp.md)."""

from datetime import timedelta

from selo_saude.modulos.monitoramento.regras import (
    NOTA_CHECKIN_HABITO_ENVIADO,
    RegistroHistorico,
    mensagem_do_dia,
)
from test_regras import HOJE, consulta, dificuldade, plano, retrato, trabalhador

LONGE = HOJE + timedelta(days=60)  # próximo monitoramento ainda distante
SEM_PASSO = plano(passos=[])  # sem passo pendente, não há pergunta da semana


def registro(tipo: str, dias_atras: int, nota: str | None = None) -> RegistroHistorico:
    return RegistroHistorico(id=f"{tipo}{dias_atras}", tipo=tipo, data=HOJE - timedelta(days=dias_atras), nota=nota)


def com_consulta(dias: int, status: str = "agendada", lembretes: list[str] | None = None):
    c = consulta(dias, status).model_copy(update={"lembretes_automaticos": lembretes or []})
    return retrato(consulta=c, plano=SEM_PASSO)


# ---------------------------------------------------------------- retorno marcado


def test_um_dia_antes_vai_o_lembrete_d1():
    assert mensagem_do_dia(com_consulta(1), LONGE, HOJE) == "lembrete_d1"


def test_tres_dias_antes_vai_o_lembrete_d3():
    assert mensagem_do_dia(com_consulta(3, "confirmada"), LONGE, HOJE) == "lembrete_d3"


def test_cada_lembrete_automatico_sai_uma_vez_so():
    assert mensagem_do_dia(com_consulta(1, lembretes=["D-3", "D-1"]), LONGE, HOJE) is None
    assert mensagem_do_dia(com_consulta(3, lembretes=["D-3"]), LONGE, HOJE) is None


def test_retorno_ainda_longe_nao_gera_lembrete():
    assert mensagem_do_dia(com_consulta(10), LONGE, HOJE) is None


# ---------------------------------------------------------------- convite para marcar


def test_perto_do_prazo_sem_retorno_vai_o_convite():
    r = retrato(trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=70)), plano=SEM_PASSO)
    assert mensagem_do_dia(r, LONGE, HOJE) == "convite_retorno"


def test_convite_nao_se_repete_em_30_dias():
    r = retrato(
        trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=70)),
        plano=SEM_PASSO,
        historico=[registro("lembrete", 10)],
    )
    assert mensagem_do_dia(r, LONGE, HOJE) is None


def test_quem_pediu_para_remarcar_escolhe_sozinho_sem_convite():
    r = retrato(
        trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=85)),
        consulta=consulta(5, "remarcar"),
        plano=SEM_PASSO,
    )
    assert mensagem_do_dia(r, LONGE, HOJE) is None


# ---------------------------------------------------------------- monitoramento e plano


def test_no_dia_do_monitoramento_vai_o_como_voce_esta():
    assert mensagem_do_dia(retrato(plano=SEM_PASSO), HOJE, HOJE) == "como_voce_esta"


def test_como_voce_esta_espera_7_dias_para_repetir():
    r = retrato(plano=SEM_PASSO, historico=[registro("checkin_enviado", 3)])
    assert mensagem_do_dia(r, HOJE - timedelta(days=5), HOJE) is None


def test_plano_com_passo_pendente_recebe_a_pergunta_da_semana():
    assert mensagem_do_dia(retrato(), LONGE, HOJE) == "pergunta_da_semana"


def test_pergunta_da_semana_sai_uma_vez_por_semana():
    enviada = registro("checkin_habito", 4, NOTA_CHECKIN_HABITO_ENVIADO)
    assert mensagem_do_dia(retrato(historico=[enviada]), LONGE, HOJE) is None
    # "Não consegui" também gera registro checkin_habito, mas não é envio: não segura a pergunta.
    resposta = registro("checkin_habito", 4)
    assert mensagem_do_dia(retrato(historico=[resposta]), LONGE, HOJE) == "pergunta_da_semana"


def test_plano_nao_aberto_nao_recebe_pergunta_da_semana():
    assert mensagem_do_dia(retrato(plano=plano(status="enviado")), LONGE, HOJE) is None


# ---------------------------------------------------------------- limites


def test_no_maximo_uma_mensagem_por_dia():
    r = com_consulta(1)
    r = retrato(consulta=r.consulta, plano=SEM_PASSO, historico=[registro("resultado_liberado", 0)])
    assert mensagem_do_dia(r, HOJE, HOJE) is None


def test_retorno_tem_prioridade_sobre_o_como_voce_esta():
    assert mensagem_do_dia(com_consulta(1), HOJE, HOJE) == "lembrete_d1"


def test_enfermagem_tratando_o_agendador_fica_quieto():
    assert mensagem_do_dia(retrato(plano=plano(dificuldades=[dificuldade("tempo")])), HOJE, HOJE) is None
    assert mensagem_do_dia(retrato(pediu_contato=True), HOJE, HOJE) is None
    assert mensagem_do_dia(retrato(consulta=consulta(-2, "faltou")), HOJE, HOJE) is None
