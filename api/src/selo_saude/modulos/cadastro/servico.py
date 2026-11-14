"""Interface pública do módulo de cadastro: quem é o trabalhador, onde e em que turno trabalha."""

from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, Instante
from selo_saude.nucleo.eventos import publicar

from .eventos import MotivacaoDefinida, TurnoAtualizado
from .modelos import Trabalhador

Motivacao = Literal["familia", "energia", "menos_dor", "sono"]
Risco = Literal[1, 2, 3, 4]


class Turno(Esquema):
    nome: str
    inicio: int
    """Hora de início (0 a 23)."""
    fim: int
    """Hora de fim. Menor que o início quando o turno vira a noite."""

    @property
    def noturno(self) -> bool:
        return self.inicio > self.fim


TURNOS = [
    Turno(nome="Turno A", inicio=6, fim=14),
    Turno(nome="Turno B", inicio=14, fim=22),
    Turno(nome="Turno C (noite)", inicio=22, fim=6),
    Turno(nome="Administrativo", inicio=8, fim=17),
]


class DadosTrabalhador(Esquema):
    id: str
    token_acesso: str
    matricula: str
    nome: str
    funcao: str
    empresa: str
    unidade: str
    medico_referencia: str
    enfermeira: str
    motivacao: Motivacao | None
    turno: Turno
    risco: Risco
    ultima_consulta_medica: Instante
    faltas_ultimo_ano: int

    @property
    def primeiro_nome(self) -> str:
        return self.nome.split()[0]


def _dados(t: Trabalhador) -> DadosTrabalhador:
    return DadosTrabalhador(
        id=t.id,
        token_acesso=t.token_acesso,
        matricula=t.matricula,
        nome=t.nome,
        funcao=t.funcao,
        empresa=t.empresa,
        unidade=t.unidade,
        medico_referencia=t.medico_referencia,
        enfermeira=t.enfermeira,
        motivacao=t.motivacao,  # type: ignore[arg-type]
        turno=Turno(nome=t.turno_nome, inicio=t.turno_inicio, fim=t.turno_fim),
        risco=t.risco,  # type: ignore[arg-type]
        ultima_consulta_medica=t.ultima_consulta_medica,
        faltas_ultimo_ano=t.faltas_ultimo_ano,
    )


async def _buscar(sessao: AsyncSession, **filtro: str) -> Trabalhador:
    trabalhador = await sessao.scalar(select(Trabalhador).filter_by(**filtro))
    if trabalhador is None:
        raise NaoEncontrado("Trabalhador não encontrado")
    return trabalhador


async def obter(sessao: AsyncSession, trabalhador_id: str) -> DadosTrabalhador:
    return _dados(await _buscar(sessao, id=trabalhador_id))


async def obter_por_token(sessao: AsyncSession, token: str) -> DadosTrabalhador:
    return _dados(await _buscar(sessao, token_acesso=token))


async def obter_por_matricula(sessao: AsyncSession, matricula: str) -> DadosTrabalhador:
    return _dados(await _buscar(sessao, matricula=matricula))


async def listar(sessao: AsyncSession, unidade: str | None = None) -> list[DadosTrabalhador]:
    consulta = select(Trabalhador).order_by(Trabalhador.nome)
    if unidade:
        consulta = consulta.where(Trabalhador.unidade == unidade)
    return [_dados(t) for t in await sessao.scalars(consulta)]


async def definir_motivacao(sessao: AsyncSession, trabalhador_id: str, motivacao: Motivacao) -> None:
    trabalhador = await _buscar(sessao, id=trabalhador_id)
    trabalhador.motivacao = motivacao
    await publicar(sessao, MotivacaoDefinida(trabalhador_id=trabalhador_id))


async def atualizar_turno(sessao: AsyncSession, trabalhador_id: str, nome_do_turno: str) -> None:
    turno = next((t for t in TURNOS if t.nome == nome_do_turno), None)
    if turno is None:
        raise NaoEncontrado("Turno não encontrado")
    trabalhador = await _buscar(sessao, id=trabalhador_id)
    trabalhador.turno_nome, trabalhador.turno_inicio, trabalhador.turno_fim = turno.nome, turno.inicio, turno.fim
    await publicar(sessao, TurnoAtualizado(trabalhador_id=trabalhador_id, turno=turno.nome))
