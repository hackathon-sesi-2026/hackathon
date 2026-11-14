from dataclasses import dataclass

from selo_saude.nucleo.eventos import EventoDominio


@dataclass(frozen=True, kw_only=True)
class ExameColetado(EventoDominio):
    trabalhador_id: str
    titulo: str


@dataclass(frozen=True, kw_only=True)
class ResultadoLiberado(EventoDominio):
    trabalhador_id: str
    titulo: str


@dataclass(frozen=True, kw_only=True)
class ResultadoVisto(EventoDominio):
    trabalhador_id: str
