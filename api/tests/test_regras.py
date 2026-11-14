"""Regras puras do domínio: não precisam de banco nem de API."""

from datetime import timedelta

from selo_saude.integracoes.splus import SPlusSimulado
from selo_saude.modulos.agenda.regras import hora_no_turno, montar_horarios
from selo_saude.modulos.agenda.servico import DadosConsulta
from selo_saude.modulos.cadastro.servico import TURNOS, DadosTrabalhador
from selo_saude.modulos.comunicacao import textos
from selo_saude.modulos.monitoramento.regras import RegistroHistorico, Retrato, risco_falta, situacao
from selo_saude.modulos.plano.regras import selo_do_marco, selos_de
from selo_saude.modulos.plano.servico import DadosDificuldade, DadosPasso, DadosPlano
from selo_saude.nucleo import relogio

HOJE = relogio.em_dias(relogio.agora(), 0, 12)
TURNO_A, _, TURNO_C, _ = TURNOS


def trabalhador(**campos) -> DadosTrabalhador:
    base = dict(
        id="t1", token_acesso="x", matricula="1", nome="Marcos Oliveira Santos", funcao="Operador", empresa="Metal",
        unidade="Planta Camaçari", medico_referencia="Dra. Beatriz", enfermeira="Ana", motivacao=None, turno=TURNO_A,
        risco=2, ultima_consulta_medica=HOJE - timedelta(days=30), faltas_ultimo_ano=0,
    )  # fmt: skip
    return DadosTrabalhador(**{**base, **campos})


def consulta(dias: int, status: str = "agendada", modalidade: str = "presencial") -> DadosConsulta:
    return DadosConsulta(
        id="c1", data=relogio.em_dias(HOJE, dias, 15), local="Ambulatório SESI na empresa", profissional="Enfermeira",
        modalidade=modalidade, status=status, nome_para_lideranca=False, compromisso=None, lembretes_automaticos=[],
    )  # fmt: skip


def plano(status: str = "recebido", dificuldades: list[DadosDificuldade] | None = None, **campos) -> DadosPlano:
    passo = DadosPasso(
        id="p1", categoria="exames", titulo="Fazer os exames", detalhe="", ganho="", prazo=HOJE, feito=False,
        itens_tecnicos=None,
    )  # fmt: skip
    base = dict(
        status=status, data_envio=HOJE - timedelta(days=1), teach_back="acertou", semanas_seguidas=0, selos=[],
        passos=[passo], dificuldades=dificuldades or [],
    )  # fmt: skip
    return DadosPlano(**{**base, **campos})


def retrato(**campos) -> Retrato:
    base = dict(
        trabalhador=trabalhador(), consulta=None, plano=plano(), historico=[], ultimo_contato_enfermagem=None,
        pediu_contato=False,
    )  # fmt: skip
    return Retrato(**{**base, **campos})


def dificuldade(motivo: str) -> DadosDificuldade:
    return DadosDificuldade(
        id="d1", motivo=motivo, passo_id="p1", origem="plano", data=HOJE, resolvida=False, nota=None,
        acao_sugerida="Oferecer teleatendimento",
    )  # fmt: skip


# ---------------------------------------------------------------- situação na fila da enfermagem


def test_quem_esta_dentro_do_prazo_fica_em_dia():
    s = situacao(retrato(), HOJE)
    assert s.codigo == "em_dia" and not s.precisa_acao


def test_dificuldade_aberta_vem_antes_de_tudo():
    r = retrato(plano=plano(dificuldades=[dificuldade("transporte")]), pediu_contato=True)
    s = situacao(r, HOJE)
    assert s.codigo == "dificuldade" and s.prioridade == 0
    assert s.sugestao == "Oferecer teleatendimento"


def test_prazo_do_risco_vencido_sem_retorno_marcado():
    r = retrato(trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=100)))
    assert situacao(r, HOJE).codigo == "fora_do_prazo"


def test_retorno_marcado_cobre_o_prazo_vencido():
    r = retrato(
        trabalhador=trabalhador(risco=3, ultima_consulta_medica=HOJE - timedelta(days=100)), consulta=consulta(3)
    )
    assert situacao(r, HOJE).codigo == "em_dia"


def test_lembrete_sem_resposta_ha_tres_dias():
    antigo = RegistroHistorico(id="e1", tipo="lembrete", data=HOJE - timedelta(days=4), nota=None)
    assert situacao(retrato(historico=[antigo]), HOJE).codigo == "sem_resposta"
    resposta = RegistroHistorico(id="e2", tipo="confirmou", data=HOJE - timedelta(days=3), nota=None)
    assert situacao(retrato(historico=[antigo, resposta]), HOJE).codigo == "em_dia"


# ---------------------------------------------------------------- risco de falta


def test_risco_de_falta_explica_cada_ponto():
    r = retrato(
        trabalhador=trabalhador(faltas_ultimo_ano=2, turno=TURNO_C),
        plano=plano(status="enviado", dificuldades=[dificuldade("transporte")]),
    )
    risco = risco_falta(r, HOJE)
    assert risco.pontos == 30 + 20 + 10 + 10 and risco.nivel == "alto"
    assert "trabalha no turno da noite" in risco.motivos


def test_sem_fatores_o_risco_de_falta_e_baixo():
    risco = risco_falta(retrato(), HOJE)
    assert risco.pontos == 0 and risco.nivel == "baixo" and risco.motivos == []


# ---------------------------------------------------------------- horários que cabem no turno


def test_turno_noturno_vira_o_dia():
    assert hora_no_turno(23, TURNO_C) and hora_no_turno(3, TURNO_C)
    assert not hora_no_turno(10, TURNO_C)


def test_horarios_fora_do_turno_ou_microconsulta_dentro_dele():
    horarios = montar_horarios(SPlusSimulado(), "t1", TURNO_A, "Planta Camaçari", HOJE)
    assert len(horarios) == 15
    for h in horarios:
        hora = relogio.local(h.inicio).hour
        if h.modalidade == "no_turno":
            assert hora_no_turno(hora, TURNO_A) and h.duracao_min == 20
        else:
            assert not hora_no_turno(hora, TURNO_A)
    assert any(h.modalidade == "online" for h in horarios)


def test_sem_ambulatorio_nao_ha_microconsulta_no_turno():
    horarios = montar_horarios(SPlusSimulado(), "t1", TURNO_A, "Unidade única", HOJE)
    assert all(h.modalidade != "no_turno" for h in horarios)


# ---------------------------------------------------------------- selos e mensagens


def test_selo_so_no_marco_exato():
    assert selo_do_marco(3).nome == "Constância"
    assert selo_do_marco(4) is None
    assert [s.semanas for s in selos_de(7)] == [3, 6]


def test_checkin_de_habito_nao_cita_o_passo_pelo_nome():
    """O título de um passo pode ser sensível (psicóloga, remédio). No WhatsApp vai só o número."""
    texto = textos.checkin_habito(trabalhador(), plano())
    assert texto is not None and "Fazer os exames" not in texto.texto and "passo 1" in texto.texto


def test_lembrete_cita_a_motivacao_da_pessoa_e_oferece_remarcar():
    texto = textos.lembrete(trabalhador(motivacao="familia"), consulta(4))
    assert "estar bem para a sua família" in texto.texto
    assert texto.acoes == ["confirmar", "remarcar", "plano"]


def test_consulta_no_turno_avisa_que_a_lideranca_nunca_ve_o_motivo():
    assert "nunca o motivo" in textos.agendado(consulta(2, "confirmada", "no_turno")).texto


def test_aviso_de_resultado_nao_leva_detalhe_nenhum():
    """Resultado de exame só aparece na página pessoal. O WhatsApp avisa e aponta o caminho."""
    texto = textos.resultado_liberado(trabalhador())
    assert texto.acoes == ["exames"]
    assert not any(termo in texto.texto for termo in ("mg/dL", "Colesterol", "Glicemia", "%"))
