"""Os fluxos que a demonstração promete, ponta a ponta pela API (através do front)."""

import threading
import time
import urllib.request

import pytest

from conftest import URL_API


@pytest.mark.critico
def test_confirmar_retorno(api):
    """Confirmar pelo celular responde na conversa e aparece na linha do tempo da enfermagem."""
    base = f"/trabalhador/{api.token('t1')}"
    assert api.post(f"{base}/consulta/confirmacao") == 204
    cuidado = api.celular("t1")
    assert cuidado["consulta"]["status"] == "confirmada"
    textos = [m["texto"] for m in cuidado["mensagens"]]
    assert any(t.startswith("Confirmo") for t in textos) and any(t.startswith("Combinado!") for t in textos)
    assert "confirmou" in [r["tipo"] for r in api.linha("t1")["historico"]]


@pytest.mark.critico
def test_remarcar_num_horario_que_cabe_no_turno(api):
    """Remarcar mostra horários fora do turno (ou microconsulta no turno) e agenda o escolhido."""
    base = f"/trabalhador/{api.token('t1')}"
    assert api.post(f"{base}/consulta/remarcacao") == 204
    horarios = api.get(f"{base}/horarios")["horarios"]
    assert horarios and {"online", "no_turno"} <= {h["modalidade"] for h in horarios}
    escolhido = next(h for h in horarios if h["modalidade"] == "online")
    assert api.post(f"{base}/consulta", {"inicio": escolhido["inicio"], "modalidade": "online"}) == 204
    consulta = api.celular("t1")["consulta"]
    assert consulta["status"] == "confirmada" and consulta["modalidade"] == "online"
    assert api.pedir("POST", f"{base}/consulta", {"inicio": "2020-01-01T10:00:00Z", "modalidade": "online"})[0] == 409


@pytest.mark.critico
def test_nao_consegui_chega_na_enfermagem_e_e_resolvido(api):
    """O "não consegui" vira situação na fila, com ação na causa, e sai dela quando resolvido."""
    base = f"/trabalhador/{api.token('t13')}"
    passo = api.celular("t13")["passos"][0]["id"]
    assert api.post(f"{base}/plano/dificuldades", {"motivo": "transporte", "origem": "plano", "passoId": passo}) == 204
    linha = api.linha("t13")
    assert linha["situacao"]["codigo"] == "dificuldade"
    assert "fretado" in linha["situacao"]["sugestao"] or "teleatendimento" in linha["situacao"]["sugestao"]
    dificuldade = next(d for d in linha["plano"]["dificuldades"] if not d["resolvida"])
    assert api.post(f"/aps/trabalhadores/t13/dificuldades/{dificuldade['id']}/resolucao", {"nota": "por vídeo"}) == 204
    assert api.linha("t13")["situacao"]["codigo"] != "dificuldade"


@pytest.mark.critico
def test_exames_da_coleta_ao_resultado(api):
    """Marcar o passo de exames registra a coleta; o resultado liberado é avisado e some ao ser visto."""
    token = api.token("t1")
    passo = next(p for p in api.celular("t1")["passos"] if p["categoria"] == "exames")
    assert api.put(f"/trabalhador/{token}/plano/passos/{passo['id']}", {"feito": True}) == 204
    assert {e["id"]: e for e in api.celular("t1")["exames"]}["t1-ex1"]["status"] == "coletado"
    assert api.post("/aps/trabalhadores/t1/exames/t1-ex1/resultado") == 204
    cuidado = api.celular("t1")
    assert cuidado["resultadoNaoVisto"] and cuidado["mensagens"][-1]["acoes"] == ["exames"]
    assert api.post(f"/trabalhador/{token}/exames/visualizacao") == 204
    assert not api.celular("t1")["resultadoNaoVisto"]


@pytest.mark.critico
def test_registrar_monitoramento(api):
    """O desfecho da enfermagem entra no histórico e marca o contato."""
    desfecho = {
        "feitoContato": True, "agendamentoRealizado": False, "mensagemEnviada": True, "aguardandoRetorno": True,
        "observacao": "aguardo resposta", "proximoMonitoramento": "2027-01-10T12:00:00Z",
    }  # fmt: skip
    assert api.post("/aps/trabalhadores/t5/monitoramentos", desfecho) == 204
    linha = api.linha("t5")
    assert linha["historico"][-1]["tipo"] == "monitoramento" and linha["ultimoContatoEnfermagem"]
    assert not linha["pediuContato"]


@pytest.mark.critico
def test_pulso_do_totem(api):
    """Três toques no totem somam no contador do turno, sem identificar ninguém."""
    antes = api.get("/totem/planta-camacari")["respostasHoje"]
    assert api.post("/totem/planta-camacari/pulsos", {"bemEstar": 1, "localDor": None}) == 204
    assert api.get("/totem/planta-camacari")["respostasHoje"] == antes + 1


def test_aviso_em_tempo_real(api):
    """Uma ação da enfermagem chega como aviso SSE em quem está com o celular aberto."""
    recebido = threading.Event()
    token = api.token("t2")

    def escutar():
        with urllib.request.urlopen(f"{URL_API}/trabalhador/{token}/eventos", timeout=8) as fluxo:
            for linha in fluxo:
                if linha.startswith(b"event: mudou"):
                    recebido.set()
                    return

    threading.Thread(target=escutar, daemon=True).start()
    time.sleep(0.8)
    assert api.post("/aps/trabalhadores/t2/lembrete") == 204
    assert recebido.wait(6), "o aviso SSE não chegou em 6 s"


def test_reiniciar_demonstracao_volta_ao_estado_inicial(api):
    """O botão de reinício desfaz tudo o que foi feito na apresentação."""
    api.post(f"/trabalhador/{api.token('t1')}/consulta/confirmacao")
    assert api.post("/demonstracao/reinicio") == 204
    assert api.celular("t1")["consulta"]["status"] == "agendada"


@pytest.mark.critico
def test_dor_tocada_no_boneco_soma_no_rh(api):
    """O local tocado no boneco do totem entra no ranking "Onde mais dói" do RH; sem dor, o local é ignorado."""

    def lombar():
        return {i["codigo"]: i["vezes"] for i in api.get("/rh/painel")["locaisDeDor"]}.get("lombar", 0)

    antes = lombar()
    assert api.post("/totem/planta-camacari/pulsos", {"bemEstar": 2, "localDor": "lombar"}) == 204
    assert lombar() == antes + 1
    assert api.post("/totem/planta-camacari/pulsos", {"bemEstar": 3, "localDor": None}) == 204
    assert lombar() == antes + 1, '"Não sinto dor" não soma em nenhum local'
    assert api.post("/totem/planta-camacari/pulsos", {"bemEstar": 2, "localDor": "nariz"}) == 422
    assert api.post("/totem/planta-camacari/pulsos", {"bemEstar": 5, "localDor": None}) == 422
