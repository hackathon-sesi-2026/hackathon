"""Regras puras do plano de cuidado: motivos do "não consegui", selos e a pergunta de checagem."""

from typing import Literal

from selo_saude.nucleo.esquema import Esquema

Motivo = Literal["tempo", "transporte", "nao_entendi", "remedio", "dinheiro", "outro"]

ROTULO_MOTIVO: dict[str, str] = {
    "tempo": "Não tive tempo / bate com o turno",
    "transporte": "Transporte / perderia o fretado",
    "nao_entendi": "Não entendi o que fazer",
    "remedio": "O remédio me fez mal",
    "dinheiro": "Custa caro para mim",
    "outro": "Outro motivo",
}

# O que a enfermagem pode fazer em cada caso: agir na causa, não só lembrar de novo.
ACAO_POR_MOTIVO: dict[str, str] = {
    "tempo": "Oferecer horário por vídeo ou colado ao turno",
    "transporte": "Oferecer teleatendimento ou horário antes do fretado",
    "nao_entendi": "Ligar e explicar o plano (pedir para a pessoa repetir com as palavras dela)",
    "remedio": "Levar ao médico de referência para avaliar a medicação",
    "dinheiro": "Orientar Farmácia Popular / alternativas sem custo",
    "outro": "Ligar para entender o que aconteceu",
}

# Motivos que um horário diferente resolve: a resposta já oferece escolher outro.
MOTIVOS_DE_HORARIO = {"tempo", "transporte"}


class Selo(Esquema):
    """Reconhecimento individual e privado por semanas seguidas de cuidado. Sem ranking."""

    semanas: int
    nome: str
    emoji: str


SELOS = [
    Selo(semanas=3, nome="Constância", emoji="🏅"),
    Selo(semanas=6, nome="Cuidado em dia", emoji="🏆"),
    Selo(semanas=12, nome="3 meses se cuidando", emoji="🌟"),
]


def selos_de(semanas_seguidas: int) -> list[Selo]:
    return [s for s in SELOS if semanas_seguidas >= s.semanas]


def selo_do_marco(semanas_seguidas: int) -> Selo | None:
    return next((s for s in SELOS if s.semanas == semanas_seguidas), None)


_DISTRATORES = ["Tomar um remédio novo por conta própria", "Fazer academia todos os dias"]


def opcoes_da_checagem(trabalhador_id: str, primeiro_passo: str) -> list[str]:
    """Opções da pergunta "qual é o seu primeiro passo?". A ordem é fixa por pessoa, para não pular na tela."""
    if ord(trabalhador_id[-1]) % 2:
        return [_DISTRATORES[0], primeiro_passo, _DISTRATORES[1]]
    return [primeiro_passo, *_DISTRATORES]
