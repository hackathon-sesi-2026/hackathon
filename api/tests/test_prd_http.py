"""Validação ponta a ponta do PRD (docs/prd.md, seções 3, 4 e 6) contra a API rodando.

Roda só quando `SELO_API_URL` aponta para uma API em modo demonstração (ex.: http://127.0.0.1:8000).
O módulo reinicia os dados fictícios antes de começar. Sem a variável, os testes são pulados.

    SELO_API_URL=http://127.0.0.1:8000 SELO_URL_BANCO=postgresql://... pytest tests/test_prd_http.py

Lacunas conhecidas ficam como `xfail(strict=True)`.
"""

import asyncio
import os

import httpx
import pytest

URL = os.environ.get("SELO_API_URL")
pytestmark = pytest.mark.skipif(not URL, reason="defina SELO_API_URL com uma API rodando em modo demonstração")

CHAVES_INDIVIDUAIS = {"nome", "matricula", "tokenAcesso", "trabalhador", "trabalhadorId", "motivacao", "primeiroNome"}
CHAVES_DE_VALOR_CLINICO = {"valor", "referencia", "explicacao", "simples"}


def chaves(obj) -> set[str]:
    """Todas as chaves de um JSON, em qualquer profundidade."""
    if isinstance(obj, dict):
        return set(obj) | {k for v in obj.values() for k in chaves(v)}
    if isinstance(obj, list):
        return {k for v in obj for k in chaves(v)}
    return set()


@pytest.fixture(scope="module")
def api():
    with httpx.Client(base_url=f"{URL}/api", timeout=20) as cliente:
        assert cliente.post("/demonstracao/reinicio").status_code == 204
        yield cliente


@pytest.fixture
def fila(api):
    resposta = api.get("/aps/fila")
    assert resposta.status_code == 200
    return resposta.json()


def da_fila(fila: list[dict], primeiro_nome: str) -> dict:
    return next(linha for linha in fila if linha["trabalhador"]["nome"].startswith(primeiro_nome))


# ---------------------------------------------------------------- §4 Rotas por público


def test_prd4_rotas_de_cada_publico_respondem(api, fila):
    token = fila[0]["trabalhador"]["tokenAcesso"]
    for rota in ("/aps/fila", "/lideranca/agenda", "/rh/painel", "/totem/unidades", f"/trabalhador/{token}"):
        assert api.get(rota).status_code == 200, rota


def test_prd4_link_pessoal_invalido_nao_abre_nada(api):
    assert api.get("/trabalhador/token-que-nao-existe").status_code == 404


# ---------------------------------------------------------------- §6 RH e Direção: só agregados


def test_prd6_rh_nao_recebe_nenhum_dado_individual(api):
    painel = api.get("/rh/painel").json()
    assert not chaves(painel) & CHAVES_INDIVIDUAIS


def test_prd6_rh_oculta_unidade_com_menos_de_5_pessoas(api):
    painel = api.get("/rh/painel").json()
    assert painel["minimoDoGrupo"] == 5
    assert all(u["vidas"] >= 5 for u in painel["unidades"])
    visiveis = {u["unidade"] for u in painel["unidades"]}
    assert painel["unidadesOcultas"] and not visiveis & set(painel["unidadesOcultas"])


def test_prd6_rh_turno_oculto_nao_tem_indicadores(api):
    for turno in api.get("/rh/painel").json()["turnos"]:
        if turno["oculto"]:
            assert turno["indicadores"] is None and turno["alertas"] == []
        else:
            assert turno["indicadores"]["respostas"] >= 5


# ---------------------------------------------------------------- §6 Liderança: horário, nunca o motivo


def test_prd6_lideranca_recebe_so_horario_e_nunca_o_motivo(api):
    agenda = api.get("/lideranca/agenda").json()
    for liberacao in agenda["liberacoes"]:
        assert set(liberacao) <= {"id", "unidade", "turno", "inicio", "duracaoMin", "nome"}
    assert not chaves(agenda) & {"motivo", "dificuldades", "risco", "exames", "plano"}


@pytest.mark.parametrize("autorizou", [False, True])
def test_prd31_nome_na_lideranca_so_com_autorizacao(api, fila, autorizou):
    token = da_fila(fila, "Marcos")["trabalhador"]["tokenAcesso"]
    no_turno = [
        h for h in api.get(f"/trabalhador/{token}/horarios").json()["horarios"] if h["modalidade"] == "no_turno"
    ]
    assert no_turno, "o Marcos (turno A, planta com ambulatório) deve ter microconsulta no turno"
    escolhido = no_turno[0]
    corpo = {"inicio": escolhido["inicio"], "modalidade": "no_turno", "nomeParaLideranca": autorizou}
    assert api.post(f"/trabalhador/{token}/consulta", json=corpo).status_code == 204
    liberacoes = [
        lib for lib in api.get("/lideranca/agenda").json()["liberacoes"] if lib["inicio"] == escolhido["inicio"]
    ]
    nomes = {lib["nome"] for lib in liberacoes}
    if autorizou:
        assert "Marcos S." in nomes
    else:
        assert "Marcos S." not in nomes and None in nomes


# ---------------------------------------------------------------- §6 APS: andamento do exame, sem valores


def test_prd6_aps_nao_recebe_valor_de_exame(api, fila):
    assert not chaves(fila) & CHAVES_DE_VALOR_CLINICO


def test_prd33_aps_ve_situacao_e_risco_de_falta_com_motivos(fila):
    for linha in fila:
        assert {"codigo", "rotulo", "detalhe", "prioridade", "precisaAcao", "sugestao"} <= set(linha["situacao"])
        risco = linha["riscoFalta"]
        assert risco["nivel"] in {"baixo", "medio", "alto"}
        assert (risco["pontos"] == 0) == (risco["motivos"] == []), "todo ponto de risco vem com o motivo escrito"
        assert isinstance(linha["situacao"]["prioridade"], int)
    # A ordenação por prioridade é feita pelo painel (PainelAps.tsx); a API entrega a prioridade de cada linha.
    assert any(linha["situacao"]["precisaAcao"] for linha in fila)


# ---------------------------------------------------------------- §6 Celular: só os dados da própria pessoa


def test_prd6_link_pessoal_so_mostra_a_propria_pessoa(api, fila):
    a, b = fila[0]["trabalhador"], fila[1]["trabalhador"]
    meu = api.get(f"/trabalhador/{a['tokenAcesso']}").json()
    assert meu["id"] == a["id"]
    texto = str(meu)
    assert b["id"] not in texto and b["nome"] not in texto
    # Risco clínico, risco de falta, situação e histórico da enfermagem são da equipe de saúde, não do trabalhador.
    # (A chave "situacao" dentro de exames[].itens[] é a do item do próprio exame: normal/atenção.)
    assert not set(meu) & {"riscoFalta", "historico", "risco", "situacao", "ultimoContatoEnfermagem"}


def test_prd6_nao_da_para_mexer_no_plano_de_outra_pessoa(api, fila):
    a, b = fila[0], fila[1]
    passo_de_b = b["plano"]["passos"][0]["id"]
    resposta = api.put(
        f"/trabalhador/{a['trabalhador']['tokenAcesso']}/plano/passos/{passo_de_b}", json={"feito": True}
    )
    assert resposta.status_code == 404


# ---------------------------------------------------------------- §3 Fluxos do ecossistema


def test_prd3_nao_consegui_chega_a_enfermeira_com_a_acao_para_a_causa(api, fila):
    linha = da_fila(fila, "Marcos")
    token, passo = linha["trabalhador"]["tokenAcesso"], linha["plano"]["passos"][0]["id"]
    corpo = {"motivo": "transporte", "origem": "plano", "passoId": passo}
    assert api.post(f"/trabalhador/{token}/plano/dificuldades", json=corpo).status_code == 204

    marcos = da_fila(api.get("/aps/fila").json(), "Marcos")
    assert marcos["situacao"]["codigo"] == "dificuldade"
    assert "fretado" in marcos["situacao"]["sugestao"]
    assert "relatou falta de tempo ou transporte" in marcos["riscoFalta"]["motivos"]

    resposta = api.get(f"/trabalhador/{token}").json()["mensagens"][-1]
    assert resposta["de"] == "sesi" and "escolher_horario" in (resposta["acoes"] or [])


def test_prd31_confirmar_da_horario_garantido_e_oferece_se_entao(api, fila):
    token = da_fila(fila, "Edson")["trabalhador"]["tokenAcesso"]  # retorno agendado, ainda não confirmado
    assert api.post(f"/trabalhador/{token}/consulta/confirmacao").status_code == 204
    mensagens = api.get(f"/trabalhador/{token}").json()["mensagens"]
    confirmacao = next(m for m in reversed(mensagens) if "garantido" in m["texto"])
    assert {"se_turno", "se_folga", "se_so_lembrete"} <= set(confirmacao["acoes"] or [])


def test_prd31_resultado_de_exame_so_aparece_para_o_trabalhador(api, fila):
    linha = da_fila(fila, "Marcos")
    token = linha["trabalhador"]["tokenAcesso"]
    pendente = next(e for e in linha["exames"] if e["status"] != "resultado")
    rota = f"/aps/trabalhadores/{linha['trabalhador']['id']}/exames/{pendente['id']}/resultado"
    assert api.post(rota).status_code == 204

    meu = api.get(f"/trabalhador/{token}").json()
    exame = next(e for e in meu["exames"] if e["id"] == pendente["id"])
    assert exame["status"] == "resultado" and exame["itens"], "o trabalhador vê os itens explicados"
    assert all(i["simples"] and i["explicacao"] for i in exame["itens"])
    aviso = meu["mensagens"][-1]
    assert aviso["acoes"] == ["exames"] and "mg/dL" not in aviso["texto"]

    assert not chaves(api.get("/aps/fila").json()) & CHAVES_DE_VALOR_CLINICO


def test_prd32_pulso_do_totem_alimenta_o_rh(api):
    unidade = api.get("/totem/unidades").json()[0]
    antes = next(u for u in api.get("/rh/painel").json()["unidades"] if u["unidade"] == unidade["unidade"])[
        "respostasNoTotem"
    ]
    assert api.post(f"/totem/{unidade['slug']}/pulsos", json={"energia": 1, "dor": 3, "sono": 1}).status_code == 204
    depois = next(u for u in api.get("/rh/painel").json()["unidades"] if u["unidade"] == unidade["unidade"])[
        "respostasNoTotem"
    ]
    assert depois == antes + 1


def test_prd32_pulso_e_gravado_sem_identificar_ninguem():
    url_banco = os.environ.get("SELO_URL_BANCO")
    if not url_banco:
        pytest.skip("defina SELO_URL_BANCO para inspecionar a tabela")
    import asyncpg

    async def colunas() -> set[str]:
        conexao = await asyncpg.connect(url_banco)
        try:
            linhas = await conexao.fetch(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'pulso_resposta'"
            )
            return {linha["column_name"] for linha in linhas}
        finally:
            await conexao.close()

    # local_dor é a região do corpo, sem nada que aponte a pessoa (decisão de 14/11 no produto.md).
    assert asyncio.run(colunas()) == {"id", "unidade", "turno", "data", "energia", "dor", "sono", "local_dor"}


def test_prd32_totem_nao_aceita_cracha_de_outra_unidade(api, fila):
    unidades = {u["unidade"]: u["slug"] for u in api.get("/totem/unidades").json()}
    de_fora = next(linha["trabalhador"] for linha in fila if linha["trabalhador"]["unidade"] not in unidades)
    slug = next(iter(unidades.values()))
    assert api.post(f"/totem/{slug}/identificacao", json={"matricula": de_fora["matricula"]}).status_code == 404


def test_prd6_totem_nao_entrega_o_link_pessoal_so_pela_matricula(api, fila):
    """Corrige o vazamento achado na validação: a matrícula não é segredo, então o totem não devolve o token."""
    unidades = {u["unidade"]: u["slug"] for u in api.get("/totem/unidades").json()}
    marcos = da_fila(fila, "Marcos")["trabalhador"]
    resposta = api.post(f"/totem/{unidades[marcos['unidade']]}/identificacao", json={"matricula": marcos["matricula"]})
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert "tokenAcesso" not in corpo and marcos["tokenAcesso"] not in str(corpo)


def test_prd6_totem_manda_o_link_so_para_o_whatsapp_da_propria_pessoa(api, fila):
    unidades = {u["unidade"]: u["slug"] for u in api.get("/totem/unidades").json()}
    marcos = da_fila(fila, "Marcos")["trabalhador"]
    rota = f"/totem/{unidades[marcos['unidade']]}/identificacao/link"
    resposta = api.post(rota, json={"matricula": marcos["matricula"]})
    assert resposta.status_code == 204 and resposta.content == b"", "o totem não recebe o link de volta"
    ultima = api.get(f"/trabalhador/{marcos['tokenAcesso']}").json()["mensagens"][-1]
    assert ultima["de"] == "sesi" and "só seu" in ultima["texto"]
    assert "escolher_horario" in (ultima["acoes"] or [])


# ---------------------------------------------------------------- §6 RH: grupo mínimo também nos totais


def test_prd6_rh_total_do_pulso_so_conta_grupos_visiveis(api):
    """O total não pode incluir turno oculto, senão dá para descobrir o oculto por diferença."""
    for filtro in ["todas", *[u["unidade"] for u in api.get("/rh/painel").json()["unidades"]]]:
        painel = api.get("/rh/painel", params={"unidade": filtro} if filtro != "todas" else None).json()
        visiveis = sum(t["indicadores"]["respostas"] for t in painel["turnos"] if not t["oculto"])
        assert painel["pulso"]["respostas"] == visiveis, filtro
        assert painel["pulso"]["respostas"] == 0 or painel["pulso"]["respostas"] >= 5
        assert sum(s["respostas"] for s in painel["semanas"]) <= visiveis


def test_prd6_rh_motivos_por_unidade_sem_contagem_de_1_a_4(api):
    for unidade in api.get("/rh/painel").json()["unidades"]:
        assert all(n == 0 or n >= 5 for n in unidade["motivos"].values()), unidade["unidade"]
