from dataclasses import dataclass

from selo_saude.nucleo.eventos import EventoDominio


@dataclass(frozen=True, kw_only=True)
class LembreteEnviado(EventoDominio):
    trabalhador_id: str


@dataclass(frozen=True, kw_only=True)
class CheckinHabitoEnviado(EventoDominio):
    trabalhador_id: str
