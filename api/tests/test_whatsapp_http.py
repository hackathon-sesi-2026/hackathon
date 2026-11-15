"""Fluxo do WhatsApp ponta a ponta (docs/whatsapp.md): o "Como você está" e a cadência do dia.

Roda só com `SELO_API_URL` apontando para uma API em modo demonstração. Reinicia os dados antes.
"""

import os

import httpx
import pytest

URL = os.environ.get("SELO_API_URL")
pytestmark = pytest.mark.skipif(not URL, reason="defina SELO_API_URL com uma API rodando em modo demonstração")

TERMOS_CLINICOS = ("exame", "glicem", "colesterol", "pressão", "remédio", "diagnóstico")


@pytest.fixture(scope="module")
def api():
    with httpx.Client(base_url=f"{URL}/api", timeout=30) as cliente:
        assert cliente.post("/demonstracao/reinicio").status_code == 204
        yield cliente


def ultima_mensagem(api, token: str) -> dict:
    return api.get(f"/trabalhador/{token}").json()["mensagens"][-1]


def test_enfermeira_pergunta_como_esta_e_a_resposta_volta_para_a_fila(api):
    linha = next(x for x in api.get("/aps/fila").json() if not x["pediuContato"])
    tid, token = linha["trabalhador"]["id"], linha["trabalhador"]["tokenAcesso"]

    assert api.post(f"/aps/trabalhadores/{tid}/checkin").status_code == 204
    msg = ultima_mensagem(api, token)
    assert msg["de"] == "sesi" and "como você está" in msg["texto"].lower()
    assert msg["acoes"] == ["checkin_ok", "checkin_ajuda"]

    depois = next(x for x in api.get("/aps/fila").json() if x["trabalhador"]["id"] == tid)
    assert depois["historico"][-1]["tipo"] == "checkin_enviado"

    assert api.post(f"/trabalhador/{token}/checkin", json={"tudoBem": False}).status_code == 204
    final = next(x for x in api.get("/aps/fila").json() if x["trabalhador"]["id"] == tid)
    assert final["pediuContato"] and final["situacao"]["codigo"] in ("pediu_ajuda", "dificuldade")


def test_cadencia_manda_no_maximo_uma_mensagem_por_pessoa_e_nao_repete_no_dia(api):
    api.post("/demonstracao/reinicio")
    envios = api.post("/aps/cadencia").json()
    assert envios, "o seed deveria ter alguém com mensagem para hoje"
    ids = [e["trabalhadorId"] for e in envios]
    assert len(ids) == len(set(ids))

    fila = {x["trabalhador"]["id"]: x for x in api.get("/aps/fila").json()}
    for envio in envios:
        linha = fila[envio["trabalhadorId"]]
        assert not linha["pediuContato"]
        assert not any(not d["resolvida"] for d in linha["plano"]["dificuldades"])
        msg = ultima_mensagem(api, linha["trabalhador"]["tokenAcesso"])
        assert msg["de"] == "sesi"
        assert not any(t in msg["texto"].lower() for t in TERMOS_CLINICOS), msg["texto"]

    assert api.post("/aps/cadencia").json() == []


def test_cadencia_registra_o_lembrete_automatico_na_consulta(api):
    api.post("/demonstracao/reinicio")
    envios = api.post("/aps/cadencia").json()
    fila = {x["trabalhador"]["id"]: x for x in api.get("/aps/fila").json()}
    for envio in envios:
        if envio["mensagem"] in ("lembrete_d1", "lembrete_d3"):
            qual = "D-1" if envio["mensagem"] == "lembrete_d1" else "D-3"
            assert qual in fila[envio["trabalhadorId"]]["consulta"]["lembretesAutomaticos"]
