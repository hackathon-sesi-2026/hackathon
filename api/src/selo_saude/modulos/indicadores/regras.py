"""Regras puras dos indicadores da empresa."""

from collections import Counter

ESPECIALIDADES: dict[str, str] = {
    "ortopedia": "Ortopedia",
    "clinica_geral": "Clínica geral",
    "cardiologia": "Cardiologia",
    "endocrinologia": "Endocrinologia",
    "oftalmologia": "Oftalmologia",
    "dermatologia": "Dermatologia",
    "psiquiatria": "Psiquiatria",
}
"""Especialidades médicas que aparecem no ranking de procura do RH."""


def mais_frequentes(contagem: Counter[str] | dict[str, int], minimo: int, quantos: int = 5) -> list[tuple[str, int]]:
    """Os `quantos` itens mais frequentes. Itens com menos de `minimo` ocorrências ficam de fora: poucas
    ocorrências de um local de dor ou de uma especialidade numa unidade podem apontar pessoas."""
    visiveis = [(item, n) for item, n in contagem.items() if n >= minimo]
    return sorted(visiveis, key=lambda par: (-par[1], par[0]))[:quantos]
