"""Painel → "Testar no meu WhatsApp": validação do número que o avaliador digita."""

import pytest

from selo_saude.nucleo.erros import RegraViolada
from selo_saude.publicos.demonstracao import mascarar, normalizar_numero


@pytest.mark.parametrize(
    ("digitado", "esperado"),
    [
        ("(71) 99999-8888", "5571999998888"),
        ("71999998888", "5571999998888"),
        ("+55 71 99999-8888", "5571999998888"),
        ("7133334444", "557133334444"),
    ],
)
def test_aceita_celular_brasileiro_com_ou_sem_55(digitado, esperado):
    assert normalizar_numero(digitado) == esperado


@pytest.mark.parametrize("digitado", ["", "123", "999998888", "+1 415 555 0100", "5571999998888123"])
def test_recusa_numero_invalido(digitado):
    with pytest.raises(RegraViolada):
        normalizar_numero(digitado)


def test_numero_aparece_mascarado():
    assert mascarar("5571999998888") == "+55 (71) •••••-8888"
