"""Regras puras do pulso."""

from typing import Literal

BemEstar = Literal[1, 2, 3, 4]
"""Resposta a "Como você está hoje?": 1 cansado(a), 2 mais ou menos, 3 bem, 4 muito bem."""

LocalDor = Literal[
    "cabeca", "pescoco", "ombros", "peito", "barriga", "bracos", "maos_punhos",
    "costas", "lombar", "quadril", "joelhos", "pernas_pes",
]  # fmt: skip

LOCAIS_DE_DOR: dict[str, str] = {
    "cabeca": "Cabeça",
    "pescoco": "Pescoço",
    "ombros": "Ombros",
    "peito": "Peito ou seios",
    "barriga": "Barriga",
    "bracos": "Braços e cotovelos",
    "maos_punhos": "Mãos e punhos",
    "costas": "Costas (parte de cima)",
    "lombar": "Lombar (parte de baixo das costas)",
    "quadril": "Quadril",
    "joelhos": "Joelhos",
    "pernas_pes": "Pernas e pés",
}
