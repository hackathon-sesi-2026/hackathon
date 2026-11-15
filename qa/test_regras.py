"""As "Regras que não se negociam" de docs/produto.md, verificadas contra o sistema rodando.

Cada teste diz qual regra cobre. Regra nova no produto.md precisa de um teste aqui (ou de uma
justificativa em REGRAS_MANUAIS, no qa/rodar.py), senão o QA aponta a falta de cobertura.
"""

import json
import re
from urllib.parse import quote

import pytest

# Termos que denunciam dado clínico: nomes de exame do seed, unidades de laboratório, remédio.
TERMOS_CLINICOS = re.compile(
    r"mg/dL|ng/mL|HbA1c|hemoglobina|glicemia|colesterol|triglicer|hemograma|creatinina|vitamina D|"
    r"diagn[óo]stic|hipertens|diabet|depress|ansiedade|psicol[óo]g|rem[ée]dio|medica[çc][ãa]o",
    re.IGNORECASE,
)
# Linguagem de culpa, medo, escassez falsa ou urgência artificial.
TERMOS_DE_PRESSAO = re.compile(
    r"culpa|[úu]ltima chance|urgente|corra|vagas? limitadas?|s[óo] hoje|perder[áa]? (a|sua) vaga|"
    r"puni[çc][ãa]o|advert[êe]ncia|irrespons|descaso|obrigat[óo]ri",
    re.IGNORECASE,
)


def todas_as_mensagens_do_sesi(api) -> list[tuple[str, str]]:
    textos = []
    for linha in api.fila():
        trabalhador_id = linha["trabalhador"]["id"]
        for mensagem in api.celular(trabalhador_id)["mensagens"]:
            if mensagem["de"] == "sesi":
                textos.append((trabalhador_id, mensagem["texto"]))
    return textos


def provocar_todas_as_mensagens(api, trabalhador_id: str = "t1") -> None:
    """Dispara os textos que o sistema sabe mandar, para a verificação de linguagem pegar todos."""
    base = f"/trabalhador/{api.token(trabalhador_id)}"
    aps = f"/aps/trabalhadores/{trabalhador_id}"
    api.post(f"{aps}/lembrete")
    api.post(f"{aps}/lembretes-automaticos", {"qual": "D-3"})
    api.post(f"{aps}/plano/envio")
    api.post(f"{aps}/checkin-habito")
    api.post(f"{base}/consulta/confirmacao")
    api.post(f"{base}/consulta/compromisso", {"opcao": "se_turno"})
    api.post(f"{base}/plano/dificuldades", {"motivo": "remedio", "origem": "plano", "passoId": None})
    api.post(f"{base}/checkin", {"tudoBem": False})
    api.post(f"{base}/consulta/remarcacao")
    horario = api.get(f"{base}/horarios")["horarios"][0]
    api.post(f"{base}/consulta", {"inicio": horario["inicio"], "modalidade": horario["modalidade"]})
    pendente = next((e for e in api.celular(trabalhador_id)["exames"] if e["status"] != "resultado"), None)
    if pendente:
        api.post(f"{aps}/exames/{pendente['id']}/resultado")


# ---------------------------------------------------------------- Regra 1: dado clínico fica no S+


@pytest.mark.regra("1")
@pytest.mark.critico
def test_mensagens_nao_levam_dado_clinico(api):
    """Nenhuma mensagem do SESI ao trabalhador cita exame, valor, remédio ou diagnóstico."""
    provocar_todas_as_mensagens(api)
    vazadas = [(t, texto[:90]) for t, texto in todas_as_mensagens_do_sesi(api) if TERMOS_CLINICOS.search(texto)]
    assert not vazadas, f"mensagens com dado clínico: {vazadas}"


@pytest.mark.regra("1")
@pytest.mark.critico
def test_enfermagem_ve_so_o_andamento_dos_exames(api):
    """A fila da APS mostra a etapa do exame, nunca os valores do resultado."""
    api.post("/aps/trabalhadores/t1/exames/t1-ex1/resultado")
    for linha in api.fila():
        for exame in linha["exames"]:
            assert set(exame) == {"id", "titulo", "status", "resultadoVisto"}, f"campos a mais: {set(exame)}"
    assert not re.search(r"mg/dL|ng/mL|\"valor\"", json.dumps(api.fila())), "valor de exame na fila da APS"


@pytest.mark.regra("1")
@pytest.mark.critico
def test_resultado_so_sai_do_servidor_depois_de_liberado(api):
    """Exame ainda não liberado chega ao celular sem os itens do resultado."""
    exames = {e["id"]: e for e in api.celular("t1")["exames"]}
    assert exames["t1-ex1"]["status"] == "pedido" and exames["t1-ex1"]["itens"] == []
    assert api.post("/aps/trabalhadores/t1/exames/t1-ex1/resultado") == 204
    exames = {e["id"]: e for e in api.celular("t1")["exames"]}
    assert exames["t1-ex1"]["status"] == "resultado" and exames["t1-ex1"]["itens"]


@pytest.mark.regra("1")
@pytest.mark.critico
def test_totem_mostra_so_data_e_hora(api):
    """A tela pública do totem não mostra o que é o atendimento, passos do plano nem exames."""
    cracha = api.get("/totem/planta-camacari/crachas")[0]
    status, cuidado = api.pedir("POST", "/totem/planta-camacari/identificacao", {"matricula": cracha["matricula"]})
    assert status == 200
    assert set(cuidado) <= {"primeiroNome", "retorno", "passosFeitos", "passosNoPlano", "semanasSeguidas"}
    assert "tokenAcesso" not in cuidado, "o totem nunca devolve o link pessoal (decisão de 14/11 no produto.md)"
    assert not TERMOS_CLINICOS.search(json.dumps(cuidado, ensure_ascii=False))


# ---------------------------------------------------------------- Regra 2: a empresa nunca vê o indivíduo


@pytest.mark.regra("2")
@pytest.mark.critico
def test_rh_recebe_so_agregados_de_grupos_grandes(api):
    """O painel do RH não traz nenhum nome, matrícula ou link, e omite grupos com menos de 5 pessoas."""
    painel = api.get("/rh/painel?unidade=todas")
    bruto = json.dumps(painel, ensure_ascii=False)
    for linha in api.fila():
        t = linha["trabalhador"]
        assert t["nome"] not in bruto and t["matricula"] not in bruto and t["tokenAcesso"] not in bruto
    minimo = painel["minimoDoGrupo"]
    assert minimo >= 5
    assert all(u["vidas"] >= minimo for u in painel["unidades"])
    assert painel["unidadesOcultas"], "o seed tem uma unidade pequena que precisa aparecer como oculta"
    for turno in painel["turnos"]:
        assert turno["oculto"] or turno["indicadores"]["respostas"] >= minimo
    pequena = painel["unidadesOcultas"][0]
    status, _ = api.pedir("GET", f"/rh/painel?unidade={quote(pequena)}")
    assert status == 404, "unidade abaixo do mínimo não pode ser consultada diretamente"


@pytest.mark.regra("2")
@pytest.mark.critico
def test_rankings_do_rh_sem_contagem_pequena_nem_pessoa(api):
    """Especialidades e locais de dor chegam só como top 5 agregado, sem itens com menos de 5 ocorrências."""
    painel = api.get("/rh/painel?unidade=todas")
    for chave in ("especialidades", "locaisDeDor"):
        itens = painel[chave]
        assert len(itens) <= 5, chave
        assert all(set(i) == {"codigo", "rotulo", "vezes"} and i["vezes"] >= painel["minimoDoGrupo"] for i in itens), (
            chave
        )
        assert [i["vezes"] for i in itens] == sorted((i["vezes"] for i in itens), reverse=True), chave


@pytest.mark.regra("2")
@pytest.mark.critico
def test_lideranca_ve_horario_nunca_o_motivo(api):
    """Liberações trazem só horário, turno e duração. Nome só com autorização da própria pessoa."""
    base = f"/trabalhador/{api.token('t1')}"
    no_turno = next(h for h in api.get(f"{base}/horarios")["horarios"] if h["modalidade"] == "no_turno")

    api.post(f"{base}/consulta", {"inicio": no_turno["inicio"], "modalidade": "no_turno", "nomeParaLideranca": False})
    agenda = api.get("/lideranca/agenda")
    for liberacao in agenda["liberacoes"]:
        assert set(liberacao) == {"id", "unidade", "turno", "inicio", "duracaoMin", "nome"}
    da_pessoa = [x for x in agenda["liberacoes"] if x["id"].startswith("consulta-")]
    assert len(da_pessoa) == 1 and da_pessoa[0]["nome"] is None

    api.post(f"{base}/consulta", {"inicio": no_turno["inicio"], "modalidade": "no_turno", "nomeParaLideranca": True})
    da_pessoa = [x for x in api.get("/lideranca/agenda")["liberacoes"] if x["id"].startswith("consulta-")]
    assert da_pessoa[0]["nome"] == "Marcos S.", "com autorização, só primeiro nome e inicial"
    assert not TERMOS_CLINICOS.search(json.dumps(api.get("/lideranca/agenda"), ensure_ascii=False))


@pytest.mark.regra("2")
@pytest.mark.critico
def test_link_pessoal_so_abre_os_dados_da_propria_pessoa(api):
    """Token inválido não abre nada, e ninguém mexe no exame ou na dificuldade de outra pessoa."""
    assert api.pedir("GET", "/trabalhador/token-que-nao-existe")[0] == 404
    assert api.pedir("POST", "/aps/trabalhadores/t2/exames/t1-ex1/resultado")[0] == 404
    marcos = api.celular("t1")
    assert all(e["id"].startswith("t1-") for e in marcos["exames"])
    assert all(p["id"].startswith("t1-") for p in marcos["passos"])


@pytest.mark.regra("2")
@pytest.mark.critico
def test_celular_nao_recebe_dados_internos_da_equipe(api):
    """A página do trabalhador não traz risco de falta, situação, histórico da enfermagem nem notas."""
    cuidado = api.celular("t2")
    for proibido in ("riscoFalta", "situacao", "historico", "risco", "faltasUltimoAno", "proximoMonitoramento"):
        assert proibido not in cuidado, f"campo interno no celular: {proibido}"
    for dificuldade in cuidado["dificuldades"]:
        assert "nota" not in dificuldade and "acaoSugerida" not in dificuldade


# ---------------------------------------------------------------- Regra 3: uso do canal não é adesão


@pytest.mark.regra("3")
@pytest.mark.critico
def test_nenhuma_metrica_da_empresa_se_chama_adesao(api):
    """Os indicadores de RH e liderança não rotulam uso do canal como "adesão"."""
    for caminho in ("/rh/painel?unidade=todas", "/lideranca/agenda"):
        assert not re.search(r"\bades[ãa]o", json.dumps(api.get(caminho), ensure_ascii=False), re.IGNORECASE), caminho


# ---------------------------------------------------------------- Regra 4: sem culpa, medo, urgência, ranking


@pytest.mark.regra("4")
@pytest.mark.critico
def test_mensagens_sem_culpa_medo_ou_urgencia(api):
    """Nenhum texto enviado ao trabalhador usa culpa, medo, escassez falsa ou urgência artificial."""
    provocar_todas_as_mensagens(api)
    provocar_todas_as_mensagens(api, "t3")
    pressao = [(t, texto[:90]) for t, texto in todas_as_mensagens_do_sesi(api) if TERMOS_DE_PRESSAO.search(texto)]
    assert not pressao, f"linguagem de pressão: {pressao}"


@pytest.mark.regra("4")
@pytest.mark.critico
def test_sem_ranking_nem_comparacao_entre_pessoas(api):
    """Reconhecimento é individual e privado: ninguém vê selo ou sequência de outra pessoa."""
    marcos = api.celular("t1")
    for chave in ("ranking", "posicao", "colegas", "outros"):
        assert chave not in json.dumps(marcos).lower(), f"campo de comparação no celular: {chave}"
    agenda = json.dumps(api.get("/lideranca/agenda")).lower()
    rh = json.dumps(api.get("/rh/painel?unidade=todas")).lower()
    assert "semanasseguidas" not in agenda and "semanasseguidas" not in rh
    assert "selo" not in agenda and "selo" not in rh


# ---------------------------------------------------------------- Regra 5: regras explicáveis


@pytest.mark.regra("5")
@pytest.mark.critico
def test_toda_pontuacao_vem_com_o_porque(api):
    """Cada ponto de risco de falta tem motivo escrito, e cada situação traz a sugestão à equipe."""
    for linha in api.fila():
        risco, situacao = linha["riscoFalta"], linha["situacao"]
        assert 0 <= risco["pontos"] <= 100
        assert (risco["pontos"] > 0) == bool(risco["motivos"]), f"{linha['trabalhador']['nome']}: pontos sem motivo"
        esperado = "alto" if risco["pontos"] >= 45 else "medio" if risco["pontos"] >= 25 else "baixo"
        assert risco["nivel"] == esperado
        assert situacao["sugestao"].strip() and situacao["detalhe"].strip()
