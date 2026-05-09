from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Optional

# Cobre os 2 formatos vistos:
# - CSV (lista geral): "Apartamento, 89.45 de área total, 43.06 de área privativa, 0.00 de área do terreno."
# - Detalhe (humano): "2 Quartos, 1 Vaga na Garagem, Área de Serviço, Wc, Sala, Cozinha. ."


@dataclass
class ExtractedFeatures:
    tipo_imovel: Optional[str] = None
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    vagas: Optional[int] = None
    area_total_m2: Optional[Decimal] = None
    area_privativa_m2: Optional[Decimal] = None
    area_terreno_m2: Optional[Decimal] = None


_TIPO_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bapartamento\b", re.I), "apartamento"),
    (re.compile(r"\bsobrado\b", re.I), "casa"),
    (re.compile(r"\bcasa\b", re.I), "casa"),
    (re.compile(r"\bterreno\b", re.I), "terreno"),
    (re.compile(r"\bgalp[ãa]o\b", re.I), "galpao"),
    (re.compile(r"\bsala\s+comercial\b|\bsala\b(?!\s*,)", re.I), "sala_comercial"),
    (re.compile(r"\bloja\b", re.I), "loja"),
    (re.compile(r"\bcomercial\b", re.I), "comercial"),
]

_AREA_TOTAL_RE     = re.compile(r"([\d.,]+)\s*de\s*[áa]rea\s*total", re.I)
_AREA_PRIVATIVA_RE = re.compile(r"([\d.,]+)\s*de\s*[áa]rea\s*privativa", re.I)
_AREA_TERRENO_RE   = re.compile(r"([\d.,]+)\s*de\s*[áa]rea\s*do\s*terreno", re.I)
_QUARTOS_RE        = re.compile(r"(\d+)\s*Quartos?", re.I)
_BANHEIROS_NUM_RE  = re.compile(r"(\d+)\s*Banheiros?", re.I)
_BANHEIRO_WC_RE    = re.compile(r"\bWc\b", re.I)
_VAGAS_RE          = re.compile(
    r"(\d+)\s*Vagas?\s*(?:na\s+)?(?:Garagem)?|(\d+)\s*Garagem", re.I
)


def _to_decimal(s: str) -> Optional[Decimal]:
    s = s.strip()
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def extract(descricao: str) -> ExtractedFeatures:
    feats = ExtractedFeatures()
    if not descricao:
        return feats

    for pattern, label in _TIPO_PATTERNS:
        if pattern.search(descricao):
            feats.tipo_imovel = label
            break

    if m := _AREA_TOTAL_RE.search(descricao):
        feats.area_total_m2 = _to_decimal(m.group(1))
    if m := _AREA_PRIVATIVA_RE.search(descricao):
        feats.area_privativa_m2 = _to_decimal(m.group(1))
    if m := _AREA_TERRENO_RE.search(descricao):
        feats.area_terreno_m2 = _to_decimal(m.group(1))

    if m := _QUARTOS_RE.search(descricao):
        feats.quartos = int(m.group(1))
    if m := _BANHEIROS_NUM_RE.search(descricao):
        feats.banheiros = int(m.group(1))
    elif _BANHEIRO_WC_RE.search(descricao):
        feats.banheiros = 1
    if m := _VAGAS_RE.search(descricao):
        feats.vagas = int(m.group(1) or m.group(2))

    return feats
