from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterator

ENCODING = "cp1252"        # arquivo da Caixa vem em Windows-1252
DELIMITER = ";"
# Layout do CSV (linhas 1-4 são preâmbulo, dados começam na 5):
#   1: vazia
#   2: " Lista de Imóveis da Caixa;;Data de geração:;..."
#   3: " Nº do imóvel;UF;Cidade;..."
#   4: vazia
#   5: " 10005120 ;AC ;..."  <- primeira linha de dados
# Em vez de fixar contagem, pulamos enquanto a 1ª célula não for um número de imóvel.
_NUMERO_IMOVEL_PREFIX = re.compile(r"^\s*\d")


@dataclass
class RawRow:
    numero_imovel: str
    uf: str
    cidade: str
    bairro: str | None
    endereco: str | None
    preco_venda: Decimal | None
    valor_avaliacao: Decimal | None
    desconto_percentual: Decimal | None
    aceita_financiamento: bool | None
    descricao: str
    modalidade_venda: str | None
    link_caixa: str | None


def _to_decimal(s: str | None) -> Decimal | None:
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None
    # PT-BR: "66.169,56" -> remove pontos e troca vírgula por ponto.
    # US: "89.45" -> sem vírgula, decimal já está como ponto.
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _strip(s: str | None) -> str | None:
    if s is None:
        return None
    s = s.strip()
    return s or None


_FIN_MAP = {"sim": True, "não": False, "nao": False, "n": False, "s": True}


def parse(path: Path) -> Iterator[RawRow]:
    with open(path, encoding=ENCODING, newline="") as f:
        reader = csv.reader(f, delimiter=DELIMITER)
        for row in reader:
            if not row or not row[0].strip():
                continue
            if len(row) < 12:
                continue
            if not _NUMERO_IMOVEL_PREFIX.match(row[0]):
                continue  # preâmbulo / header / linhas de comentário
            yield RawRow(
                numero_imovel=row[0].strip(),
                uf=row[1].strip(),
                cidade=row[2].strip(),
                bairro=_strip(row[3]),
                endereco=_strip(row[4]),
                preco_venda=_to_decimal(row[5]),
                valor_avaliacao=_to_decimal(row[6]),
                desconto_percentual=_to_decimal(row[7]),
                aceita_financiamento=_FIN_MAP.get((row[8] or "").strip().lower()),
                descricao=(row[9] or "").strip(),
                modalidade_venda=_strip(row[10]),
                link_caixa=_strip(row[11]),
            )
