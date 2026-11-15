"""As telas de verdade, no Chrome da máquina (sem baixar navegador), em modo invisível.

Verifica que cada superfície abre sem quebrar e que as interações principais funcionam com um clique.
"""

import re

import pytest

from conftest import URL_WEB

playwright = pytest.importorskip("playwright.sync_api", reason="Playwright não instalado: pip install -e 'api[qa]'")


@pytest.fixture(scope="session")
def navegador():
    with playwright.sync_playwright() as p:
        try:
            navegador = p.chromium.launch(channel="chrome", headless=True)
        except Exception as erro:  # sem Chrome instalado
            pytest.skip(f"Chrome não encontrado para os testes de tela: {erro}")
        yield navegador
        navegador.close()


class Tela:
    """Uma aba que guarda os erros do navegador enquanto o teste roda."""

    def __init__(self, contexto):
        self.pagina = contexto.new_page()
        self.quebras: list[str] = []
        self.erros_no_console: list[str] = []
        self.pagina.on("pageerror", lambda erro: self.quebras.append(str(erro)))
        self.pagina.on("console", lambda m: m.type == "error" and self.erros_no_console.append(m.text))

    def abrir(self, caminho: str):
        self.pagina.goto(URL_WEB + caminho, wait_until="domcontentloaded")
        return self.pagina


@pytest.fixture
def abrir(navegador):
    contexto = navegador.new_context(viewport={"width": 1366, "height": 860}, locale="pt-BR")
    telas: list[Tela] = []

    def nova(caminho: str, celular: bool = False):
        if celular:
            ctx = navegador.new_context(viewport={"width": 390, "height": 844}, locale="pt-BR", is_mobile=True)
            tela = Tela(ctx)
        else:
            tela = Tela(contexto)
        telas.append(tela)
        tela.abrir(caminho)
        return tela

    yield nova
    contexto.close()
    quebras = [q for t in telas for q in t.quebras]
    assert not quebras, f"a tela quebrou com erro de JavaScript: {quebras}"


def ver(pagina, texto: str, timeout: int = 8000):
    pagina.get_by_text(texto, exact=False).first.wait_for(state="visible", timeout=timeout)


def entrar_no_totem(pagina, cpf: str = "12345678901"):
    """Começar e passar pelo CPF, que é obrigatório. Na demonstração, CPF fora do cadastro entra como o Marcos."""
    ver(pagina, "Olá!")
    pagina.get_by_role("button", name="Começar").click()
    ver(pagina, "Digite seu CPF")
    assert pagina.get_by_role("button", name="Prefiro não informar").count() == 0, "o CPF não pode ser pulado"
    for numero in cpf:
        pagina.get_by_role("button", name=numero, exact=True).click()
    pagina.get_by_role("button", name="Entrar").click()
    ver(pagina, "Você sente alguma dor hoje?")


# ---------------------------------------------------------------- cada superfície abre


@pytest.mark.critico
@pytest.mark.parametrize(
    ("caminho", "texto"),
    [
        ("/painel/aps", "Acompanhamento do cuidado"),
        ("/painel/lideranca", "Agenda de cuidado do turno"),
        ("/painel/rh", "Visão da empresa"),
        ("/totem", "De qual unidade é este totem?"),
        ("/totem/planta-camacari", "Olá!"),
    ],
)
def test_superficie_abre(abrir, caminho, texto):
    """Cada superfície do produto abre e mostra o conteúdo principal."""
    ver(abrir(caminho).pagina, texto)


@pytest.mark.critico
def test_celular_abre_pelo_link_pessoal(abrir, api):
    """O link pessoal abre a conversa; um link inválido mostra aviso em vez de quebrar."""
    pagina = abrir(f"/t/{api.token('t1')}", celular=True).pagina
    ver(pagina, "Selo Saúde · SESI")
    ver(abrir("/t/link-invalido", celular=True).pagina, "Este link não é válido")


# ---------------------------------------------------------------- interações principais


@pytest.mark.critico
def test_confirmar_com_um_toque_no_celular(abrir, api):
    """O botão "Confirmo" da conversa confirma o retorno e a resposta aparece na hora."""
    pagina = abrir(f"/t/{api.token('t1')}", celular=True).pagina
    pagina.get_by_role("button", name=re.compile("Confirmo")).click()
    ver(pagina, "Combinado!")
    assert api.celular("t1")["consulta"]["status"] == "confirmada"


@pytest.mark.critico
def test_meus_exames_no_celular(abrir, api):
    """Do plano dá para chegar em "Meus exames" e ver o resultado do check-up anterior."""
    pagina = abrir(f"/t/{api.token('t1')}", celular=True).pagina
    pagina.get_by_role("button", name="Meu plano", exact=True).click()
    pagina.get_by_role("button", name=re.compile("Meus exames")).click()
    ver(pagina, "Exames do último check-up")


def test_lembrete_da_enfermeira_chega_no_celular_sem_recarregar(abrir, api):
    """Com as duas telas abertas, o lembrete enviado no painel aparece no celular em tempo real."""
    celular = abrir(f"/t/{api.token('t1')}", celular=True).pagina
    ver(celular, "Selo Saúde · SESI")
    antes = celular.get_by_text("Aqui é a Ana").count()

    painel = abrir("/painel/aps").pagina
    painel.get_by_role("button", name=re.compile("Ver todos")).click()
    linha = painel.locator("tr", has_text="Marcos Oliveira Santos")
    linha.get_by_role("button", name="Enviar lembrete pelo WhatsApp").click()

    celular.wait_for_function(
        "n => [...document.querySelectorAll('p')].filter(p => p.textContent.includes('Aqui é a Ana')).length > n",
        arg=antes,
        timeout=8000,
    )


@pytest.mark.regra("3")
def test_painel_do_rh_nao_chama_uso_de_adesao(abrir):
    """Na tela do RH, "adesão" só aparece no aviso de que uso do canal não mede adesão."""
    pagina = abrir("/painel/rh").pagina
    ver(pagina, "Visão da empresa")
    texto = pagina.locator("main").inner_text()
    usos = re.findall(r"[^.]*\bades[ãa]o\b[^.]*", texto, re.IGNORECASE)
    indevidos = [u.strip() for u in usos if "não medem adesão" not in u]
    assert not indevidos, f"métrica rotulada como adesão: {indevidos}"


def test_telas_sem_erros_no_console(abrir, api):
    """Nenhuma superfície registra erro no console do navegador."""
    telas = [abrir(c) for c in ("/painel/aps", "/painel/lideranca", "/painel/rh", "/totem/planta-camacari")]
    telas.append(abrir(f"/t/{api.token('t1')}", celular=True))
    for tela in telas:
        tela.pagina.wait_for_timeout(1200)
    erros = [e for t in telas for e in t.erros_no_console]
    assert not erros, f"erros no console: {erros[:5]}"


@pytest.mark.critico
def test_pulso_no_totem_sem_dor(abrir):
    """Sem dor: Começar, CPF, dor "Nenhuma" (pula o boneco), um rosto e o agradecimento."""
    pagina = abrir("/totem/planta-camacari").pagina
    entrar_no_totem(pagina)
    pagina.get_by_role("button", name="Nenhuma").click()
    ver(pagina, "Como você está hoje?")
    pagina.get_by_role("button", name="Bem", exact=True).click()
    pagina.get_by_role("button", name="Continuar").click()
    ver(pagina, "Obrigado!")


def test_boneco_da_dor_no_totem(abrir):
    """Com CPF: dor "Forte", tocar a lombar no boneco, confirmar, escolher "Cansado(a)" e chegar ao agradecimento."""
    pagina = abrir("/totem/planta-camacari").pagina
    entrar_no_totem(pagina)
    pagina.get_by_role("button", name="Forte").click()
    ver(pagina, "Onde dói mais?")
    pagina.get_by_role("button", name="Lombar (parte de baixo das costas)").click()
    pagina.get_by_role("button", name="Confirmar").click()
    pagina.get_by_role("button", name="Cansado(a)").click()
    pagina.get_by_role("button", name="Continuar").click()
    ver(pagina, "Obrigado!")


@pytest.mark.critico
def test_totem_comeca_pelo_cpf(abrir):
    """O CPF vem antes de tudo; na demonstração qualquer CPF entra (como o Marcos) e "Voltar" retorna ao CPF."""
    pagina = abrir("/totem/planta-camacari").pagina
    entrar_no_totem(pagina, "98765432100")
    pagina.get_by_role("button", name="Voltar").click()
    ver(pagina, "Digite seu CPF")
