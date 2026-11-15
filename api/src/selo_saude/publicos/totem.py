"""Rotas do totem na unidade. É uma tela pública: o pulso é anônimo e a parte pessoal mostra o mínimo.

Com o CPF, a pessoa vê só data e hora do retorno e quantos passos fez. Nunca o que é o atendimento.
O link pessoal nunca sai por aqui: se a pessoa quiser ir ao celular, ele é enviado ao WhatsApp dela.
"""

from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from selo_saude.configuracao import configuracao
from selo_saude.modulos.agenda import servico as agenda
from selo_saude.modulos.agenda.regras import Modalidade
from selo_saude.modulos.cadastro import servico as cadastro
from selo_saude.modulos.comunicacao import servico as comunicacao
from selo_saude.modulos.indicadores import servico as indicadores
from selo_saude.modulos.indicadores.servico import MetaDoTurno, UnidadeComTotem
from selo_saude.modulos.plano import servico as plano
from selo_saude.modulos.pulso import servico as pulso
from selo_saude.modulos.pulso.regras import BemEstar, LocalDor
from selo_saude.nucleo.banco import Sessao
from selo_saude.nucleo.erros import NaoEncontrado
from selo_saude.nucleo.esquema import Esquema, Instante
from selo_saude.nucleo.tempo_real import resposta_sse, transacional

from . import canais

rota = APIRouter(prefix="/api/totem", tags=["Totem na unidade"])

# Persona oficial do desafio nos dados fictícios (demonstracao/semente.py): o Marcos.
PERSONA_DA_DEMONSTRACAO = "t1"


class TelaInicial(Esquema):
    unidade: str
    turno: str
    respostas_hoje: int
    meta_do_turno: MetaDoTurno | None


class RespostaDoPulso(Esquema):
    bem_estar: BemEstar
    """Como você está hoje: 1 cansado(a), 2 mais ou menos, 3 bem, 4 muito bem."""
    local_dor: LocalDor | None = None
    """Onde dói mais, tocado no boneco. Vazio quando a pessoa não sente dor."""


class Identificacao(Esquema):
    cpf: str
    """Digitado no totem, com ou sem pontuação."""


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
    # Sem token de acesso: a tela é pública e a matrícula não é segredo. Para ir ao celular, a pessoa pede o link
    # e ele é enviado ao WhatsApp dela (rota /identificacao/link).


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
    await pulso.registrar(sessao, nome, corpo.bem_estar, corpo.local_dor)


@rota.post("/{unidade}/identificacao")
async def identificar(unidade: str, corpo: Identificacao, sessao: Sessao) -> CuidadoNoTotem:
    trabalhador = await _da_unidade(sessao, unidade, corpo.cpf)
    consulta = await agenda.obter(sessao, trabalhador.id)
    meu_plano = await plano.obter(sessao, trabalhador.id)
    return CuidadoNoTotem(
        primeiro_nome=trabalhador.primeiro_nome,
        retorno=RetornoNoTotem.model_validate(consulta) if consulta and consulta.em_aberto else None,
        passos_feitos=sum(1 for p in meu_plano.passos if p.feito),
        passos_no_plano=len(meu_plano.passos),
        semanas_seguidas=meu_plano.semanas_seguidas,
    )


@rota.post("/{unidade}/identificacao/link", status_code=204)
@transacional
async def mandar_link_para_o_celular(unidade: str, corpo: Identificacao, sessao: Sessao) -> None:
    trabalhador = await _da_unidade(sessao, unidade, corpo.cpf)
    await comunicacao.enviar_link_pessoal(sessao, trabalhador.id)


@rota.post("/{unidade}/identificacao/confirmacao", status_code=204)
@transacional
async def confirmar_retorno(unidade: str, corpo: Identificacao, sessao: Sessao) -> None:
    trabalhador = await _da_unidade(sessao, unidade, corpo.cpf)
    await agenda.confirmar(sessao, trabalhador.id)


async def _da_unidade(sessao: Sessao, unidade: str, cpf: str) -> cadastro.DadosTrabalhador:
    nome = await indicadores.unidade_do_totem(sessao, unidade)
    try:
        trabalhador = await cadastro.obter_por_cpf(sessao, cpf)
    except NaoEncontrado:
        if not configuracao.modo_demonstracao:
            raise
        return await _persona_da_demonstracao(sessao, nome)
    # CPF cadastrado em outra unidade não entra, nem na demonstração.
    if trabalhador.unidade != nome:
        raise NaoEncontrado("CPF não encontrado nesta unidade")
    return trabalhador


async def _persona_da_demonstracao(sessao: Sessao, unidade: str) -> cadastro.DadosTrabalhador:
    """Na demonstração, qualquer CPF fora do cadastro entra como a persona (o Marcos). Num totem de outra
    unidade, entra como a primeira pessoa dela. Fora do modo de demonstração isso não existe."""
    da_unidade = await cadastro.listar(sessao, unidade=unidade)
    if not da_unidade:
        raise NaoEncontrado("CPF não encontrado nesta unidade")
    return next((t for t in da_unidade if t.id == PERSONA_DA_DEMONSTRACAO), da_unidade[0])
