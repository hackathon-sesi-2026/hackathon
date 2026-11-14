"""Interface pública da agenda: o retorno do trabalhador e as liberações de turno."""

from datetime import datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from selo_saude.integracoes.splus import splus
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.cadastro.servico import DadosTrabalhador
from selo_saude.nucleo import relogio
from selo_saude.nucleo.erros import NaoEncontrado, RegraViolada
from selo_saude.nucleo.esquema import Esquema, Instante, novo_id
from selo_saude.nucleo.eventos import publicar

from .eventos import (
    CompromissoEscolhido,
    ConsultaAgendada,
    ConsultaConfirmada,
    LembreteAutomaticoRegistrado,
    RemarcacaoPedida,
)
from .modelos import Consulta, Liberacao
from .regras import COMPROMISSOS, DURACAO_NO_TURNO, Horario, Modalidade, montar_horarios

StatusConsulta = Literal["agendada", "confirmada", "remarcar", "faltou"]


class DadosConsulta(Esquema):
    id: str
    data: Instante
    local: str
    profissional: str
    modalidade: Modalidade
    status: StatusConsulta
    nome_para_lideranca: bool
    compromisso: str | None
    lembretes_automaticos: list[str]

    @property
    def em_aberto(self) -> bool:
        return self.status != "faltou"


class DadosLiberacao(Esquema):
    """O que a liderança pode ver de um compromisso de saúde no turno: horário e, se autorizado, o nome."""

    id: str
    unidade: str
    turno: str
    inicio: Instante
    duracao_min: int
    nome: str | None


async def obter(sessao: AsyncSession, trabalhador_id: str) -> DadosConsulta | None:
    consulta = await _buscar(sessao, trabalhador_id)
    return DadosConsulta.model_validate(consulta) if consulta else None


async def por_trabalhador(sessao: AsyncSession) -> dict[str, DadosConsulta]:
    consultas = await sessao.scalars(select(Consulta))
    return {c.trabalhador_id: DadosConsulta.model_validate(c) for c in consultas}


async def confirmar(sessao: AsyncSession, trabalhador_id: str) -> None:
    consulta = await _exigir(sessao, trabalhador_id)
    consulta.status = "confirmada"
    await publicar(sessao, ConsultaConfirmada(trabalhador_id=trabalhador_id))


async def pedir_remarcacao(sessao: AsyncSession, trabalhador_id: str) -> None:
    consulta = await _buscar(sessao, trabalhador_id)
    if consulta:
        consulta.status = "remarcar"
    await publicar(sessao, RemarcacaoPedida(trabalhador_id=trabalhador_id))


def listar_horarios(trabalhador: DadosTrabalhador) -> list[Horario]:
    return montar_horarios(splus, trabalhador.id, trabalhador.turno, trabalhador.unidade, relogio.agora())


async def agendar(
    sessao: AsyncSession,
    trabalhador: DadosTrabalhador,
    inicio: datetime,
    modalidade: Modalidade,
    nome_para_lideranca: bool,
) -> None:
    """Marca o retorno num horário oferecido. Quem escolhe o próprio horário já sai confirmado."""
    horario = next((h for h in listar_horarios(trabalhador) if h.inicio == inicio and h.modalidade == modalidade), None)
    if horario is None:
        raise RegraViolada("Esse horário não está mais disponível. Escolha outro.")

    consulta = await _buscar(sessao, trabalhador.id)
    if consulta is None:
        consulta = Consulta(id=novo_id(), trabalhador_id=trabalhador.id)
        sessao.add(consulta)
    consulta.data = horario.inicio
    consulta.local = horario.local
    consulta.profissional = "Enfermeira de cuidado"
    consulta.modalidade = horario.modalidade
    consulta.status = "confirmada"
    consulta.nome_para_lideranca = horario.modalidade == "no_turno" and nome_para_lideranca
    consulta.compromisso = None
    consulta.lembretes_automaticos = []
    await sessao.flush()
    await publicar(
        sessao,
        ConsultaAgendada(
            trabalhador_id=trabalhador.id,
            inicio=horario.inicio,
            modalidade=horario.modalidade,
            local=horario.local,
            nome_para_lideranca=consulta.nome_para_lideranca,
        ),
    )


async def escolher_compromisso(sessao: AsyncSession, trabalhador_id: str, opcao: str) -> None:
    if opcao not in COMPROMISSOS:
        raise RegraViolada("Opção de compromisso desconhecida")
    consulta = await _exigir(sessao, trabalhador_id)
    if COMPROMISSOS[opcao]:
        consulta.compromisso = COMPROMISSOS[opcao]
    await publicar(sessao, CompromissoEscolhido(trabalhador_id=trabalhador_id, opcao=opcao))


async def registrar_lembrete_automatico(sessao: AsyncSession, trabalhador_id: str, qual: str) -> None:
    consulta = await _exigir(sessao, trabalhador_id)
    consulta.lembretes_automaticos = [*consulta.lembretes_automaticos, qual]
    await publicar(sessao, LembreteAutomaticoRegistrado(trabalhador_id=trabalhador_id, qual=qual))


async def listar_liberacoes(sessao: AsyncSession) -> list[DadosLiberacao]:
    """Liberações já conhecidas mais as consultas marcadas dentro do turno."""
    liberacoes = [DadosLiberacao.model_validate(x) for x in await sessao.scalars(select(Liberacao))]
    trabalhadores = {t.id: t for t in await cadastro.listar(sessao)}
    no_turno = await sessao.scalars(
        select(Consulta).where(Consulta.modalidade == "no_turno", Consulta.status != "faltou")
    )
    for consulta in no_turno:
        trabalhador = trabalhadores.get(consulta.trabalhador_id)
        if trabalhador is None:
            continue
        liberacoes.append(
            DadosLiberacao(
                id=f"consulta-{consulta.id}",
                unidade=trabalhador.unidade,
                turno=trabalhador.turno.nome,
                inicio=consulta.data,
                duracao_min=DURACAO_NO_TURNO,
                nome=_nome_abreviado(trabalhador.nome) if consulta.nome_para_lideranca else None,
            )
        )
    return liberacoes


def _nome_abreviado(nome: str) -> str:
    partes = nome.split()
    return f"{partes[0]} {partes[-1][0]}."


async def _buscar(sessao: AsyncSession, trabalhador_id: str) -> Consulta | None:
    return await sessao.scalar(select(Consulta).where(Consulta.trabalhador_id == trabalhador_id))


async def _exigir(sessao: AsyncSession, trabalhador_id: str) -> Consulta:
    consulta = await _buscar(sessao, trabalhador_id)
    if consulta is None:
        raise NaoEncontrado("Não há retorno marcado")
    return consulta
