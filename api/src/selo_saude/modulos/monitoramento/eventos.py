from dataclasses import dataclass

from selo_saude.nucleo.eventos import EventoDominio


@dataclass(frozen=True, kw_only=True)
class CheckinRespondido(EventoDominio):
    """Resposta ao "como você está?". `tudo_bem=False` significa que a pessoa pediu contato."""

    trabalhador_id: str
    tudo_bem: bool


@dataclass(frozen=True, kw_only=True)
class MonitoramentoRegistrado(EventoDominio):
    trabalhador_id: str
