"""Datas no fuso da operação. O banco guarda em UTC; todo texto e toda regra de dia usam o horário local."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from selo_saude.configuracao import configuracao

FUSO = ZoneInfo(configuracao.fuso)
_DIAS_DA_SEMANA = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
SABADO, DOMINGO = 5, 6


def agora() -> datetime:
    return datetime.now(FUSO)


def local(instante: datetime) -> datetime:
    return instante.astimezone(FUSO)


def inicio_do_dia(instante: datetime) -> datetime:
    return local(instante).replace(hour=0, minute=0, second=0, microsecond=0)


def em_dias(base: datetime, dias: int, hora: int = 9, minuto: int = 0) -> datetime:
    """`dias` dias depois (ou antes) de `base`, na hora local indicada."""
    return inicio_do_dia(base) + timedelta(days=dias, hours=hora, minutes=minuto)


def dias_entre(inicio: datetime, fim: datetime) -> int:
    """Dias de calendário de `inicio` até `fim`. Negativo se `fim` vem antes."""
    return (local(fim).date() - local(inicio).date()).days


def dia_semana(instante: datetime) -> str:
    """quinta-feira, 20/11"""
    d = local(instante)
    return f"{_DIAS_DA_SEMANA[d.weekday()]}, {d:%d/%m}"


def hora_curta(instante: datetime) -> str:
    """15h ou 15h30"""
    d = local(instante)
    return f"{d.hour}h{d.minute:02d}" if d.minute else f"{d.hour}h"


def data(instante: datetime) -> str:
    """20/11/2026"""
    return f"{local(instante):%d/%m/%Y}"


def data_curta(instante: datetime) -> str:
    """20/11"""
    return f"{local(instante):%d/%m}"


def semana_iso(instante: datetime) -> str:
    """2026-47: identifica a semana, para contar uma ação de cuidado por semana."""
    ano, semana, _ = local(instante).isocalendar()
    return f"{ano}-{semana:02d}"
