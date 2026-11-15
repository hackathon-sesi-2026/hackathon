from selo_saude.modulos.beneficios.regras import (
    CATALOGO,
    PONTOS_POR_PASSO,
    PONTOS_POR_SEMANA,
    beneficio,
    codigo_do_resgate,
    pode_resgatar,
    pontos_ganhos,
    saldo,
)


def test_pontos_vem_so_de_participacao():
    assert pontos_ganhos(0, 0) == 0
    assert pontos_ganhos(1, 2) == PONTOS_POR_PASSO + 2 * PONTOS_POR_SEMANA
    assert pontos_ganhos(3, 0) == 3 * PONTOS_POR_PASSO


def test_saldo_nunca_fica_negativo():
    assert saldo(50, 30) == 20
    assert saldo(10, 30) == 0


def test_so_resgata_com_pontos_suficientes():
    assert pode_resgatar(30, 30)
    assert not pode_resgatar(29, 30)


def test_marcos_da_demonstracao_resgata_pelo_menos_um_beneficio():
    # O Marcos (1 passo e 2 semanas seguidas na semente) precisa conseguir resgatar na apresentação.
    ganhos = pontos_ganhos(1, 2)
    assert any(pode_resgatar(ganhos, b.pontos) for b in CATALOGO)


def test_catalogo_tem_ids_unicos_e_busca_por_id():
    ids = [b.id for b in CATALOGO]
    assert len(ids) == len(set(ids))
    assert beneficio("rede_academias") is not None
    assert beneficio("nao_existe") is None


def test_codigo_e_estavel_e_muda_por_resgate():
    a = codigo_do_resgate("t1", "curso_sesi", 0)
    assert a == codigo_do_resgate("t1", "curso_sesi", 0)
    assert a != codigo_do_resgate("t1", "curso_sesi", 1)
    assert a.startswith("SELO-")
