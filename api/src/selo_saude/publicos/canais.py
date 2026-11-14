"""Canais de tempo real, um por público. Decide quem precisa buscar de novo depois de cada evento."""

from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.modulos.agenda.eventos import ConsultaAgendada
from selo_saude.modulos.pulso.servico import PulsoRegistrado
from selo_saude.nucleo.esquema import slug
from selo_saude.nucleo.eventos import EventoDominio
from selo_saude.nucleo.tempo_real import avisar

APS = "aps"
LIDERANCA = "lideranca"
RH = "rh"


def do_trabalhador(trabalhador_id: str) -> str:
    return f"trabalhador:{trabalhador_id}"


def do_totem(unidade: str) -> str:
    return f"totem:{slug(unidade)}"


async def avisar_publicos(sessao: AsyncSession, evento: EventoDominio) -> None:
    trabalhador_id = getattr(evento, "trabalhador_id", None)
    if trabalhador_id:
        avisar(sessao, APS, do_trabalhador(trabalhador_id))
    if isinstance(evento, ConsultaAgendada):
        avisar(sessao, LIDERANCA)  # uma consulta no turno pode ter entrado ou saído da agenda de liberações
    if isinstance(evento, PulsoRegistrado):
        avisar(sessao, RH, do_totem(evento.unidade))
