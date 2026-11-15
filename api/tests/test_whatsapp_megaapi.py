"""Adaptador da Mega-API: o tipo de mensagem escolhido pelos botões e o envio, sem rede (transporte falso do httpx)."""

import asyncio
import json

import httpx

from selo_saude.integracoes import whatsapp as modulo
from selo_saude.integracoes.whatsapp import Botao, Destinatario, WhatsAppMegaApi, montar_envio
from selo_saude.modulos.comunicacao import textos

MARCOS = Destinatario("t1", "Marcos Silva", "10234", "tok123")
NUMERO = "5571999998888"
URL = "https://selo.exemplo/"
CONFIRMAR, REMARCAR, PLANO = (
    Botao("confirmar", "Confirmo ✅"),
    Botao("remarcar", "Preciso remarcar"),
    Botao("plano", "Ver meu plano", link=True),
)


def test_todo_botao_do_trabalhador_tem_rotulo_curto():
    acoes = {"confirmar", "exames", "remarcar", "escolher_horario", "plano", "checkin_ok", "checkin_ajuda"}
    acoes |= {"habito_sim", "habito_nao", "se_turno", "se_folga", "se_so_lembrete"}
    rotulos = textos.BOTAO_DE_RESPOSTA | textos.BOTAO_DE_LINK
    assert acoes <= rotulos.keys()
    assert all(len(r) <= 20 for r in rotulos.values())


def test_resposta_vira_botao_com_o_codigo_da_acao_e_o_link_vai_no_texto():
    envio = montar_envio(MARCOS, "Você consegue ir?", [CONFIRMAR, REMARCAR, PLANO], NUMERO, URL)
    assert envio.rota == "buttonMessage"
    assert envio.corpo["buttons"] == [
        {"type": "reply", "id": "confirmar", "title": "Confirmo ✅"},
        {"type": "reply", "id": "remarcar", "title": "Preciso remarcar"},
    ]
    assert envio.corpo["text"].endswith("Ver meu plano: https://selo.exemplo/t/tok123")
    assert envio.corpo["footer"] == "Teste Selo Saúde · para Marcos Silva"


def test_no_maximo_tres_botoes_de_resposta():
    muitos = [Botao(f"a{n}", f"Opção {n}") for n in range(5)]
    assert len(montar_envio(MARCOS, "?", muitos, NUMERO, URL).corpo["buttons"]) == 3


def test_so_link_vira_botao_que_abre_a_pagina():
    envio = montar_envio(MARCOS, "Seu plano chegou.", [PLANO], NUMERO, URL)
    assert envio.rota == "templateMessage"
    assert envio.corpo["buttons"] == [
        {"type": "url", "title": "Ver meu plano", "payload": "https://selo.exemplo/t/tok123"}
    ]


def test_sem_botoes_vai_como_texto():
    envio = montar_envio(MARCOS, "Combinado, só o lembrete.", [], NUMERO, URL)
    assert envio.rota == "text" and "/t/" not in envio.corpo["text"]


def _com_transporte(monkeypatch, responder):
    pedidos: list[httpx.Request] = []

    def tratar(pedido: httpx.Request) -> httpx.Response:
        pedidos.append(pedido)
        return responder(pedido)

    original = httpx.AsyncClient

    def cliente(*args, **kwargs):
        return original(*args, transport=httpx.MockTransport(tratar), **kwargs)

    monkeypatch.setattr(modulo.httpx, "AsyncClient", cliente)
    return pedidos


def _adaptador(apenas: list[str] | None = None) -> WhatsAppMegaApi:
    return WhatsAppMegaApi("https://mega.exemplo/", "inst-1", "seg", NUMERO, URL, apenas or [])


def test_envia_botoes_para_o_numero_de_teste_com_o_token(monkeypatch):
    pedidos = _com_transporte(monkeypatch, lambda p: httpx.Response(200, json={"error": False}))
    asyncio.run(_adaptador().enviar(MARCOS, "Olá!", [CONFIRMAR]))

    (pedido,) = pedidos
    assert str(pedido.url) == "https://mega.exemplo/rest/sendMessage/inst-1/buttonMessage"
    assert pedido.headers["Authorization"] == "Bearer seg"
    assert json.loads(pedido.content)["messageData"]["to"] == NUMERO


def test_botao_recusado_vai_como_texto_com_as_opcoes(monkeypatch):
    def responder(p: httpx.Request) -> httpx.Response:
        if p.url.path.endswith("/buttonMessage"):
            return httpx.Response(200, json={"error": True, "message": "não suportado"})
        return httpx.Response(200, json={"error": False})

    pedidos = _com_transporte(monkeypatch, responder)
    asyncio.run(_adaptador().enviar(MARCOS, "Olá!", [CONFIRMAR, PLANO]))

    assert [p.url.path.rsplit("/", 1)[1] for p in pedidos] == ["buttonMessage", "text"]
    texto = json.loads(pedidos[1].content)["messageData"]["text"]
    assert "▸ Confirmo ✅" in texto and "https://selo.exemplo/t/tok123" in texto


def test_falha_da_mega_api_nao_derruba_a_acao(monkeypatch):
    _com_transporte(monkeypatch, lambda p: httpx.Response(500))
    asyncio.run(_adaptador().enviar(MARCOS, "Olá!", [CONFIRMAR]))  # não levanta


def test_filtro_de_matriculas(monkeypatch):
    pedidos = _com_transporte(monkeypatch, lambda p: httpx.Response(200))
    asyncio.run(_adaptador(apenas=["99999"]).enviar(MARCOS, "Olá!", []))
    assert pedidos == []
