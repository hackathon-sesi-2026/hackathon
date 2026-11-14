"""Rotas do totem na unidade. É uma tela pública: o pulso é anônimo e a parte pessoal mostra o mínimo.

Com o crachá, a pessoa vê só data e hora do retorno e quantos passos fez. Nunca o que é o atendimento.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from selo_saude.configuracao import configuracao
from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.regras import Modalidade
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.modulos.indicadores.servico import MetaDoTurno, UnidadeComTotem
from selo_saude.modulos.plano import servico as plano
from selo_saude.modulos.pulso import servico as pulso
from selo_saude.modulos.pulso.servico import Nivel
from selo_saude.nucleo.banco import Sessao
from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, Instante
from selo_saude.nucleo.tempo_real import resposta_sse, transacional

from . import canais

rota = APIRouter(prefix="/api/totem", tags=["Totem na unidade"])


class TelaInicial(Esquema):
    unidade: str
    turno: str
    respostas_hoje: int
    meta_do_turno: MetaDoTurno | None


class RespostaDoPulso(Esquema):
    energia: Nivel
    dor: Nivel
    sono: Nivel


class Cracha(Esquema):
    matricula: str
    nome: str


class Identificacao(Esquema):
    matricula: str


class RetornoNoTotem(Esquema):
    data: Instante
    local: str
    modalidade: Modalidade
    status: Literal["agendada", "confirmada", "remarcar"]


class CuidadoNoTotem(Esquema):
    primeiro_nome: str
    retorno: RetornoNoTotem | None
    passos_feitos: int
    passos_no_plano: int
    semanas_seguidas: int
    token_acesso: str
    """Vira o QR code que leva a pessoa para o próprio celular, onde ela resolve o resto em particular."""


@rota.get("/unidades")
async def unidades(sessao: Sessao) -> list[UnidadeComTotem]:
    return await indicadores.unidades_com_totem(sessao)


@rota.get("/{unidade}")
async def tela_inicial(unidade: str, sessao: Sessao) -> TelaInicial:
    nome = await indicadores.unidade_do_totem(sessao, unidade)
    turno = pulso.turno_agora()
    return TelaInicial(
        unidade=nome,
        turno=turno,
        respostas_hoje=await pulso.respostas_de_hoje(sessao, nome, turno),
        meta_do_turno=await indicadores.meta_do_turno(sessao, nome, turno),
    )


@rota.get("/{unidade}/eventos")
async def eventos(unidade: str, sessao: Sessao) -> StreamingResponse:
    return resposta_sse(canais.do_totem(await indicadores.unidade_do_totem(sessao, unidade)))


@rota.post("/{unidade}/pulsos", status_code=204)
@transacional
async def responder_pulso(unidade: str, corpo: RespostaDoPulso, sessao: Sessao) -> None:
    nome = await indicadores.unidade_do_totem(sessao, unidade)
    await pulso.registrar(sessao, nome, corpo.energia, corpo.dor, corpo.sono)


@rota.get("/{unidade}/crachas")
async def crachas_de_demonstracao(unidade: str, sessao: Sessao) -> list[Cracha]:
    """Substitui o leitor de crachá na demonstração. Não existe fora do modo de demonstração."""
    if not configuracao.modo_demonstracao:
        raise HTTPException(status_code=404)
    nome = await indicadores.unidade_do_totem(sessao, unidade)
    return [Cracha(matricula=t.matricula, nome=t.nome) for t in await cadastro.listar(sessao, unidade=nome)]


@rota.post("/{unidade}/identificacao")
async def identificar(unidade: str, corpo: Identificacao, sessao: Sessao) -> CuidadoNoTotem:
    trabalhador = await _da_unidade(sessao, unidade, corpo.matricula)
    consulta = await agenda.obter(sessao, trabalhador.id)
    meu_plano = await plano.obter(sessao, trabalhador.id)
    return CuidadoNoTotem(
        primeiro_nome=trabalhador.primeiro_nome,
        retorno=RetornoNoTotem.model_validate(consulta) if consulta and consulta.em_aberto else None,
        passos_feitos=sum(1 for p in meu_plano.passos if p.feito),
        passos_no_plano=len(meu_plano.passos),
        semanas_seguidas=meu_plano.semanas_seguidas,
        token_acesso=trabalhador.token_acesso,
    )


@rota.post("/{unidade}/identificacao/confirmacao", status_code=204)
@transacional
async def confirmar_retorno(unidade: str, corpo: Identificacao, sessao: Sessao) -> None:
    trabalhador = await _da_unidade(sessao, unidade, corpo.matricula)
    await agenda.confirmar(sessao, trabalhador.id)


async def _da_unidade(sessao: Sessao, unidade: str, matricula: str) -> cadastro.DadosTrabalhador:
    nome = await indicadores.unidade_do_totem(sessao, unidade)
    trabalhador = await cadastro.obter_por_matricula(sessao, matricula)
    if trabalhador.unidade != nome:
        raise NaoEncontrado("Crachá não reconhecido nesta unidade")
    return trabalhador
