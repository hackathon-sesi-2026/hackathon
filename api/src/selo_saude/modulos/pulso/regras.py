"""Regras puras do pulso."""

from typing import Literal

BemEstar = Literal[1, 2, 3, 4]
"""Resposta a "Como você está hoje?": 1 cansado(a), 2 mais ou menos, 3 bem, 4 muito bem."""

IntensidadeDor = Literal[0, 1, 2, 3]
"""Resposta a "Você sente alguma dor hoje?": 0 nenhuma, 1 leve, 2 média, 3 forte."""

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


def local_guardado(intensidade: int | None, local: str | None) -> str | None:
    """Onde dói só faz sentido com dor. Quem disse "nenhuma" não tem local guardado, mesmo que ele chegue.
    Sem a pergunta da intensidade (resposta no formato anterior), o local vale como veio."""
    return None if intensidade == 0 else local
