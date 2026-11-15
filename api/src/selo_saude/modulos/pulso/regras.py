"""Regras puras do pulso."""

from typing import Literal

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


def local_guardado(dor: int, local: str | None) -> str | None:
    """O local só faz sentido com dor leve (2) ou forte (3). Sem dor, nada é guardado."""
    return local if dor >= 2 else None
