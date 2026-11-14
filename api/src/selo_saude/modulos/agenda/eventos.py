from dataclasses import dataclass
from datetime import datetime

from selo_saude.nucleo.eventos import EventoDominio


@dataclass(frozen=True, kw_only=True)
class ConsultaConfirmada(EventoDominio):
    trabalhador_id: str


@dataclass(frozen=True, kw_only=True)
class RemarcacaoPedida(EventoDominio):
    trabalhador_id: str


@dataclass(frozen=True, kw_only=True)
class ConsultaAgendada(EventoDominio):
    trabalhador_id: str
    inicio: datetime
    modalidade: str
    local: str
    nome_para_lideranca: bool


@dataclass(frozen=True, kw_only=True)
class CompromissoEscolhido(EventoDominio):
    trabalhador_id: str
    opcao: str
    """se_turno, se_folga ou se_so_lembrete"""


@dataclass(frozen=True, kw_only=True)
class LembreteAutomaticoRegistrado(EventoDominio):
    trabalhador_id: str
    qual: str
