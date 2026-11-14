"""Regras puras da agenda: quais horários cabem na vida de quem trabalha em turno."""

from datetime import datetime, timedelta
from typing import Literal

from selo_saude.integracoes.splus import PortaSPlus
from selo_saude.modulos.cadastro.servico import Turno
from selo_saude.nucleo import relogio
from selo_saude.nucleo.esquema import Esquema, Instante

Modalidade = Literal["presencial", "online", "no_turno"]

DURACAO_NO_TURNO = 20
DURACAO_PADRAO = 30
LOCAL_NO_TURNO = "Ambulatório SESI na empresa"
# Empresas de unidade única ainda não têm ambulatório próprio para a microconsulta.
UNIDADE_SEM_AMBULATORIO = "Unidade única"

# Plano se-então que a pessoa pode combinar depois de confirmar. "Só me lembre" não gera compromisso.
COMPROMISSOS = {"se_turno": "sair do turno e ir direto", "se_folga": "ir no dia de folga", "se_so_lembrete": None}


class Horario(Esquema):
    inicio: Instante
    local: str
    modalidade: Modalidade
    duracao_min: int
    dica: str | None = None
    """Por que este horário é bom para a pessoa, ex.: "logo após o turno"."""


def hora_no_turno(hora: float, turno: Turno) -> bool:
    if not turno.noturno:
        return turno.inicio <= hora < turno.fim
    return hora >= turno.inicio or hora < turno.fim


def montar_horarios(
    splus: PortaSPlus, trabalhador_id: str, turno: Turno, unidade: str, hoje: datetime, quantidade: int = 15
) -> list[Horario]:
    """Próximos horários que não batem com o turno, mais a microconsulta de 20 min dentro dele.

    Olha até 21 dias à frente. A opção por vídeo evita ficar na empresa depois do turno e perder o fretado.
    """
    horarios: list[Horario] = []
    for d in range(1, 22):
        if len(horarios) >= quantidade:
            break
        dia = relogio.inicio_do_dia(hoje) + timedelta(days=d)
        dia_da_semana = dia.weekday()
        if dia_da_semana == relogio.DOMINGO:
            continue

        dia_util = dia_da_semana != relogio.SABADO
        if dia_util and not turno.noturno and unidade != UNIDADE_SEM_AMBULATORIO:
            inicio = dia + timedelta(hours=turno.inicio + 2 + d % 3, minutes=30)
            if splus.ambulatorio_livre(trabalhador_id, inicio):
                horarios.append(
                    Horario(
                        inicio=inicio,
                        local=LOCAL_NO_TURNO,
                        modalidade="no_turno",
                        duracao_min=DURACAO_NO_TURNO,
                        dica="no turno · 20 min",
                    )
                )

        for vaga in splus.vagas_do_dia(trabalhador_id, dia):
            hora = vaga.inicio.hour
            if hora_no_turno(hora, turno) or hora_no_turno(hora + 0.99, turno):
                continue
            horarios.append(
                Horario(
                    inicio=vaga.inicio,
                    local=vaga.local,
                    modalidade=vaga.modalidade,
                    duracao_min=DURACAO_PADRAO,
                    dica=_dica(vaga.modalidade, hora, turno, dia_da_semana),
                )
            )
            if len(horarios) >= quantidade:
                break
    return horarios


def _dica(modalidade: str, hora: int, turno: Turno, dia_da_semana: int) -> str | None:
    if modalidade == "online":
        return "por vídeo, de casa"
    if hora == turno.fim:
        return "logo após o turno"
    if hora + 1 == turno.inicio:
        return "antes do turno"
    if dia_da_semana == relogio.SABADO:
        return "sábado"
    return None
