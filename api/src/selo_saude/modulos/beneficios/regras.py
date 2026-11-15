"""Regras dos benefícios. Funções puras: pontos por participação, saldo e código de resgate.

Os pontos premiam participação (passo feito, semana seguida de cuidado), nunca resultado clínico. Os benefícios do
protótipo são fictícios: no produto viriam das parcerias do SESI com academias, marketplaces e cursos.
"""

from dataclasses import dataclass
from hashlib import sha256

PONTOS_POR_PASSO = 10
PONTOS_POR_SEMANA = 20


@dataclass(frozen=True)
class Beneficio:
    id: str
    titulo: str
    descricao: str
    pontos: int
    icone: str
    """Nome do ícone na tela do celular: academia, marketplace, curso ou saude."""


CATALOGO: list[Beneficio] = [
    Beneficio("voucher_marketplace", "Voucher de R$ 20", "Para usar em marketplaces parceiros.", 30, "marketplace"),
    Beneficio("curso_sesi", "Curso SESI online", "Um curso à sua escolha, no seu ritmo.", 40, "curso"),
    Beneficio("atendimento_nutricao", "Atendimento de nutrição", "Uma consulta de nutrição do SESI.", 50, "saude"),
    Beneficio("rede_academias", "Rede de academias", "Um mês de acesso à rede parceira.", 60, "academia"),
]


def beneficio(beneficio_id: str) -> Beneficio | None:
    return next((b for b in CATALOGO if b.id == beneficio_id), None)


def pontos_ganhos(passos_feitos: int, semanas_seguidas: int) -> int:
    return passos_feitos * PONTOS_POR_PASSO + semanas_seguidas * PONTOS_POR_SEMANA


def saldo(ganhos: int, gastos: int) -> int:
    return max(ganhos - gastos, 0)


def pode_resgatar(saldo_atual: int, custo: int) -> bool:
    return saldo_atual >= custo


def codigo_do_resgate(trabalhador_id: str, beneficio_id: str, indice: int) -> str:
    """Código curto e estável para mostrar ao resgatar (ex.: SELO-7K3QD2). Fictício: não vale em lugar nenhum."""
    resumo = sha256(f"{trabalhador_id}:{beneficio_id}:{indice}".encode()).hexdigest().upper()
    return f"SELO-{resumo[:6]}"
