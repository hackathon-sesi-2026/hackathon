"""Validação das regras de negócio do PRD (docs/prd.md, seções 5 e 6) contra as funções puras.

Cada teste cita o item do PRD que valida. Lacunas conhecidas ficam como `xfail(strict=True)`: o teste
documenta o comportamento esperado e passa a falhar (avisando) quando a lacuna for corrigida.
"""

import re
from datetime import timedelta

import pytest

from selo_saude.integracoes.splus import SPlusSimulado
from selo_saude.modulos.agenda.regras import COMPROMISSOS, hora_no_turno, montar_horarios
from selo_saude.modulos.cadastro.servico import TURNOS
from selo_saude.modulos.comunicacao import textos
from selo_saude.modulos.indicadores.servico import MINIMO_DO_GRUPO, _por_turno
from selo_saude.modulos.monitoramento.regras import PRAZO_EM_DIAS, prazo_retorno, risco_falta, situacao
from selo_saude.modulos.plano.regras import ACAO_POR_MOTIVO, ROTULO_MOTIVO, SELOS, selo_do_marco, selos_de
from selo_saude.modulos.pulso.servico import DadosPulso
from selo_saude.nucleo import relogio
from test_regras import HOJE, consulta, dificuldade, plano, retrato, trabalhador

TURNO_A, TURNO_B, TURNO_C, ADMINISTRATIVO = TURNOS

# Termos clínicos que nunca podem ir numa mensagem ao trabalhador (PRD §6, regra 4).
TERMOS_CLINICOS = re.compile(
    r"psic[oó]log|hemograma|colesterol|glicemia|triglic|diagn[oó]stic|\bCID\b|press[aã]o arterial|mg/dL|"
    r"ansiedade|depress|diabet|hipertens|TDAH",
    re.IGNORECASE,
)


# ---------------------------------------------------------------- §5 Prazo de retorno


def test_prd5_prazos_por_risco():
    assert PRAZO_EM_DIAS == {1: 180, 2: 180, 3: 90, 4: 30}


@pytest.mark.parametrize("risco,dias", [(1, 180), (2, 180), (3, 90), (4, 30)])
def test_prd5_prazo_retorno_soma_os_dias_do_risco(risco, dias):
    t = trabalhador(risco=risco, ultima_consulta_medica=HOJE)
    assert prazo_retorno(t) == HOJE + timedelta(days=dias)


# ---------------------------------------------------------------- §5 Situação (ordem de prioridade)


def test_prd5_dificuldade_vem_antes_de_pediu_contato():
    r = retrato(plano=plano(dificuldades=[dificuldade("tempo")]), pediu_contato=True)
    assert situacao(r, HOJE).codigo == "dificuldade"


def test_prd5_pediu_contato_vem_antes_de_fora_do_prazo():
    r = retrato(trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=200)), pediu_contato=True)
    assert situacao(r, HOJE).codigo == "pediu_ajuda"


def test_prd5_faltou_aparece_na_fila():
    r = retrato(consulta=consulta(-2, status="faltou"))
    assert situacao(r, HOJE).codigo == "faltou"


def test_prd5_plano_nao_recebido():
    assert situacao(retrato(plano=plano(status="nao_enviado")), HOJE).codigo == "plano_nao_recebido"


def test_prd5_prazo_vence_logo_sem_retorno_marcado():
    r = retrato(trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=80)))
    assert situacao(r, HOJE).codigo == "vence_logo"


@pytest.mark.xfail(
    strict=True,
    reason='PRD §5 lista "prazo vence logo" antes de "em contato"; o código avalia "em contato" primeiro '
    "(contato da enfermagem nos últimos 7 dias tira a pessoa de vence_logo). Decidir qual vale e alinhar.",
)
def test_prd5_vence_logo_tem_prioridade_sobre_em_contato():
    r = retrato(
        trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=80)),
        ultimo_contato_enfermagem=HOJE - timedelta(days=2),
    )
    assert situacao(r, HOJE).codigo == "vence_logo"


# ---------------------------------------------------------------- §5 Risco de falta


@pytest.mark.parametrize(
    "campos,pontos,motivo",
    [
        ({"trabalhador": trabalhador(faltas_ultimo_ano=2)}, 30, "2 faltas no último ano"),
        ({"trabalhador": trabalhador(faltas_ultimo_ano=1)}, 15, "1 falta no último ano"),
        ({"plano": plano(dificuldades=[dificuldade("transporte")])}, 20, "relatou falta de tempo ou transporte"),
        ({"trabalhador": trabalhador(turno=TURNO_C)}, 10, "trabalha no turno da noite"),
        ({"plano": plano(status="enviado")}, 10, None),
    ],
)
def test_prd5_cada_fator_do_risco_de_falta_tem_ponto_e_motivo(campos, pontos, motivo):
    risco = risco_falta(retrato(**campos), HOJE)
    assert risco.pontos == pontos
    assert len(risco.motivos) == 1
    if motivo:
        assert risco.motivos[0] == motivo


def test_prd5_risco_de_falta_tem_teto_e_niveis():
    r = retrato(
        trabalhador=trabalhador(
            faltas_ultimo_ano=3, turno=TURNO_C, risco=3, ultima_consulta_medica=HOJE - timedelta(days=200)
        ),
        consulta=None,
        plano=plano(
            status="enviado", teach_back="errou", dificuldades=[dificuldade("transporte"), dificuldade("remedio")]
        ),
    )
    risco = risco_falta(r, HOJE)
    assert risco.pontos <= 100 and risco.nivel == "alto"
    assert risco_falta(retrato(), HOJE).nivel == "baixo"


# ---------------------------------------------------------------- §5 Ação por motivo


def test_prd5_todo_motivo_tem_rotulo_e_acao_na_causa():
    motivos = {"tempo", "transporte", "nao_entendi", "remedio", "dinheiro", "outro"}
    assert set(ROTULO_MOTIVO) == motivos and set(ACAO_POR_MOTIVO) == motivos
    assert "vídeo" in ACAO_POR_MOTIVO["tempo"] and "fretado" in ACAO_POR_MOTIVO["transporte"]
    assert "médico" in ACAO_POR_MOTIVO["remedio"]


# ---------------------------------------------------------------- §5 Horários


@pytest.mark.parametrize("turno", [TURNO_A, TURNO_B, TURNO_C, ADMINISTRATIVO])
def test_prd5_horarios_nunca_no_turno_exceto_microconsulta_de_20_min(turno):
    for h in montar_horarios(SPlusSimulado(), "t1", turno, "Planta Camaçari", HOJE):
        local = relogio.local(h.inicio)
        if h.modalidade == "no_turno":
            assert h.duracao_min == 20 and hora_no_turno(local.hour, turno)
        else:
            assert not hora_no_turno(local.hour, turno)


def test_prd5_domingo_fechado_e_sabado_so_de_manha():
    for h in montar_horarios(SPlusSimulado(), "t1", TURNO_A, "Planta Camaçari", HOJE):
        local = relogio.local(h.inicio)
        assert local.weekday() != relogio.DOMINGO
        if local.weekday() == relogio.SABADO:
            assert local.hour <= 11


def test_prd5_turno_da_noite_nao_tem_microconsulta():
    assert all(
        h.modalidade != "no_turno" for h in montar_horarios(SPlusSimulado(), "t1", TURNO_C, "Planta Camaçari", HOJE)
    )


def test_prd31_plano_se_entao_tem_as_tres_opcoes():
    assert set(COMPROMISSOS) == {"se_turno", "se_folga", "se_so_lembrete"}


# ---------------------------------------------------------------- §5 Selos


def test_prd5_selos_nos_marcos_3_6_12():
    assert [(s.semanas, s.nome) for s in SELOS] == [
        (3, "Constância"),
        (6, "Cuidado em dia"),
        (12, "3 meses se cuidando"),
    ]
    assert [selo_do_marco(n) is not None for n in (2, 3, 6, 12, 13)] == [False, True, True, True, False]
    assert [s.semanas for s in selos_de(12)] == [3, 6, 12]


# ---------------------------------------------------------------- §5 e §6 Grupo mínimo


def _pulsos(n: int, turno: str = "Turno A") -> list[DadosPulso]:
    return [
        DadosPulso(unidade="Planta Camaçari", turno=turno, data=HOJE, bem_estar=1, local_dor="lombar") for _ in range(n)
    ]


def test_prd6_grupo_minimo_e_5():
    assert MINIMO_DO_GRUPO == 5


def test_prd6_turno_com_menos_de_5_respostas_fica_oculto():
    [turno] = _por_turno(_pulsos(MINIMO_DO_GRUPO - 1))
    assert turno.oculto and turno.indicadores is None and turno.alertas == []


def test_prd6_turno_com_5_respostas_aparece_com_alertas_sobre_condicoes_de_trabalho():
    [turno] = _por_turno(_pulsos(MINIMO_DO_GRUPO))
    assert not turno.oculto and turno.indicadores.respostas == 5
    assert turno.alertas, "pulso ruim deve gerar alerta sobre condições de trabalho"


# ---------------------------------------------------------------- §6 Mensagens sem dado clínico


def _todas_as_mensagens() -> list[str]:
    t = trabalhador(motivacao="energia")
    c = consulta(4)
    no_turno = consulta(2, "confirmada", "no_turno")
    p = plano()
    gerados = [
        textos.lembrete(t, c),
        textos.lembrete(t, None),
        textos.lembrete_automatico(t, c, "D-3"),
        textos.lembrete_automatico(t, c, "D-1"),
        textos.confirmado(c),
        textos.agendado(no_turno),
        textos.compromisso(c, "se_turno"),
        textos.compromisso(c, "se_folga"),
        textos.plano_pronto(t),
        textos.checkin_habito(t, p),
        textos.checkin(t),
        textos.resultado_liberado(t),
        textos.selo("Constância", "🏅", 3),
    ]
    return [g.texto for g in gerados if g is not None]


def test_prd6_nenhuma_mensagem_ao_trabalhador_leva_termo_clinico():
    for texto in _todas_as_mensagens():
        achado = TERMOS_CLINICOS.search(texto)
        assert achado is None, f"termo clínico {achado.group()!r} em: {texto}"


def test_prd6_nenhuma_mensagem_usa_culpa_ou_urgencia_artificial():
    proibidas = re.compile(
        r"\bculpa\b|última chance|urgente|corra|perder(á|a) sua vaga|vai se arrepender", re.IGNORECASE
    )
    for texto in _todas_as_mensagens():
        assert not proibidas.search(texto), texto
