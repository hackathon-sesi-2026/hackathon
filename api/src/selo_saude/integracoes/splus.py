"""Porta para o S+, o sistema de registro e agendamento do SESI.

O domínio só conhece `PortaSPlus`. No hackathon não há API nem ambiente de teste do S+, então a
implementação é simulada; a integração real entra aqui, sem tocar nos módulos.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, Protocol

from selo_saude.nucleo import relogio


@dataclass(frozen=True)
class Vaga:
    """Horário livre na agenda da APS."""

    inicio: datetime
    modalidade: Literal["presencial", "online"]
    local: str


class PortaSPlus(Protocol):
    def vagas_do_dia(self, trabalhador_id: str, dia: datetime) -> list[Vaga]:
        """Horários livres da APS em `dia` (início do dia, hora local), em ordem."""
        ...

    def ambulatorio_livre(self, trabalhador_id: str, inicio: datetime) -> bool:
        """Se o ambulatório dentro da empresa está livre para uma microconsulta em `inicio`."""
        ...


class SPlusSimulado:
    """Agenda fictícia e determinística: parece real e não muda a cada consulta."""

    _HORAS_PRESENCIAIS = (7, 8, 9, 10, 11, 13, 14, 15, 16, 17)
    _HORAS_ONLINE = (12, 18, 19)

    def vagas_do_dia(self, trabalhador_id: str, dia: datetime) -> list[Vaga]:
        dia_da_semana = dia.weekday()
        if dia_da_semana == relogio.DOMINGO:
            return []
        sabado = dia_da_semana == relogio.SABADO
        vagas: list[Vaga] = []
        for hora in sorted(self._HORAS_PRESENCIAIS + self._HORAS_ONLINE):
            online = hora in self._HORAS_ONLINE
            if sabado and hora > 11:
                continue
            if self._ocupado(dia, hora + (50 if online else 0), trabalhador_id):
                continue
            if online:
                local = "Teleatendimento"
            elif sabado or hora < 8:
                local = "Unidade SESI Centro"
            else:
                local = "Ambulatório SESI na empresa"
            vagas.append(Vaga(dia + timedelta(hours=hora), "online" if online else "presencial", local))
        return vagas

    def ambulatorio_livre(self, trabalhador_id: str, inicio: datetime) -> bool:
        local = relogio.local(inicio)
        return not self._ocupado(relogio.inicio_do_dia(local), local.hour + 99, trabalhador_id)

    @staticmethod
    def _ocupado(dia: datetime, chave_da_hora: int, semente: str) -> bool:
        x = dia.toordinal() * 31 + chave_da_hora * 17
        for caractere in semente:
            x = (x * 33 + ord(caractere)) % 9973
        return x % 3 == 0


splus: PortaSPlus = SPlusSimulado()
