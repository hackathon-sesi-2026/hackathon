"""Totem: a intensidade da dor vem antes do "onde dói mais"."""

import pytest

from selo_saude.modulos.pulso.regras import local_guardado


@pytest.mark.parametrize("intensidade", [1, 2, 3])
def test_com_dor_o_local_e_guardado(intensidade):
    assert local_guardado(intensidade, "lombar") == "lombar"


def test_sem_dor_nenhum_local_e_guardado():
    assert local_guardado(0, "lombar") is None


def test_resposta_sem_a_pergunta_da_intensidade_guarda_o_local_como_veio():
    assert local_guardado(None, "joelhos") == "joelhos"
    assert local_guardado(None, None) is None
