import re
import unicodedata
import uuid
from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel


class Esquema(BaseModel):
    """Base dos contratos: snake_case no Python, camelCase no JSON."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


def _iso_utc(instante: datetime) -> str:
    return instante.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# Sempre UTC com "Z", o mesmo formato do `toISOString()` do navegador: assim as datas ordenam como texto.
Instante = Annotated[datetime, PlainSerializer(_iso_utc, return_type=str)]


def novo_id() -> str:
    return uuid.uuid4().hex[:16]


def slug(texto: str) -> str:
    """Planta Camaçari -> planta-camacari"""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()).strip("-")
