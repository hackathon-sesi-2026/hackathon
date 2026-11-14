from dataclasses import dataclass

from selo_saude.nucleo.eventos import EventoDominio


@dataclass(frozen=True, kw_only=True)
class PlanoEnviado(EventoDominio):
    trabalhador_id: str


@dataclass(frozen=True, kw_only=True)
class PlanoRecebido(EventoDominio):
    """O trabalhador abriu o plano pela primeira vez. É uso do canal, não adesão."""

    trabalhador_id: str


@dataclass(frozen=True, kw_only=True)
class PassoFeito(EventoDominio):
    trabalhador_id: str
    titulo: str


@dataclass(frozen=True, kw_only=True)
class PassoDesfeito(EventoDominio):
    trabalhador_id: str


@dataclass(frozen=True, kw_only=True)
class HabitoRespondido(EventoDominio):
    """Resposta ao check-in "conseguiu fazer este passo?"."""

    trabalhador_id: str
    fez: bool


@dataclass(frozen=True, kw_only=True)
class DificuldadeRelatada(EventoDominio):
    trabalhador_id: str
    motivo: str
    origem: str


@dataclass(frozen=True, kw_only=True)
class DificuldadeResolvida(EventoDominio):
    trabalhador_id: str
    motivo: str
    nota: str | None


@dataclass(frozen=True, kw_only=True)
class TeachBackRespondido(EventoDominio):
    trabalhador_id: str
    acertou: bool


@dataclass(frozen=True, kw_only=True)
class SeloConquistado(EventoDominio):
    trabalhador_id: str
    nome: str
    emoji: str
    semanas: int
