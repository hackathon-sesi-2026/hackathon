from dataclasses import dataclass

from selo_saude.nucleo.eventos import EventoDominio


@dataclass(frozen=True, kw_only=True)
class TurnoAtualizado(EventoDominio):
    trabalhador_id: str
    turno: str


@dataclass(frozen=True, kw_only=True)
class MotivacaoDefinida(EventoDominio):
    trabalhador_id: str
