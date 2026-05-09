"""Parser HTML da página de detalhe da Caixa.

Resiliente: a página tem layout heterogêneo (venda direta vs licitação vs leilão SFI),
hidden inputs vazios e dados embutidos como texto. Estratégia: regex sobre o raw HTML,
fallback para None quando o campo não existe.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional


@dataclass
class DetailExtract:
    nome_empreendimento: Optional[str] = None
    tipo_imovel: Optional[str] = None
    situacao: Optional[str] = None
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    vagas: Optional[int] = None
    matricula_numero: Optional[str] = None
    comarca: Optional[str] = None
    oficio: Optional[str] = None
    inscricao_imobiliaria: Optional[str] = None
    averbacao_leiloes_negativos: Optional[bool] = None
    area_total_m2: Optional[Decimal] = None
    area_privativa_m2: Optional[Decimal] = None
    area_terreno_m2: Optional[Decimal] = None
    endereco_full: Optional[str] = None
    descricao_full: Optional[str] = None
    link_matricula_pdf: Optional[str] = None
    link_edital_pdf: Optional[str] = None
    link_pregoeiro: Optional[str] = None
    nome_leiloeiro: Optional[str] = None
    edital: Optional[str] = None
    numero_item: Optional[str] = None
    data_leilao_1: Optional[datetime] = None
    data_leilao_2: Optional[datetime] = None
    valor_leilao_1: Optional[Decimal] = None
    valor_leilao_2: Optional[Decimal] = None
    corretores_cidade_id: Optional[str] = None
    photo_urls: list[str] = field(default_factory=list)
    formas_pagamento: list[str] = field(default_factory=list)
    regras_despesas: dict[str, str] = field(default_factory=dict)
    # Riscos jurídicos averbados na matrícula (taxonomia + raw text)
    riscos_juridicos: list[str] = field(default_factory=list)
    riscos_juridicos_raw: Optional[str] = None


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_NBSP_RE = re.compile(r"&nbsp;|&#160;|\xa0")


def _strip_tags(s: str) -> str:
    s = _TAG_RE.sub(" ", s)
    s = _NBSP_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def _to_decimal_brl(s: str) -> Optional[Decimal]:
    if not s:
        return None
    s = s.strip().replace("R$", "").strip()
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _to_decimal_area(s: str) -> Optional[Decimal]:
    """Aceita '89,45' ou '89.45'."""
    if not s:
        return None
    s = s.strip().replace("m2", "").replace("m²", "").strip()
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _yesno(s: Optional[str]) -> Optional[bool]:
    if s is None:
        return None
    s = s.strip().lower()
    if s in ("averbado", "sim", "s"):
        return True
    if s in ("não averbado", "nao averbado", "não", "nao", "n"):
        return False
    return None


def _parse_dt_brt(s: str) -> Optional[datetime]:
    """Parses '13/05/2026 - 10h00' -> naive datetime (UTC-3 = BRT, mas guardamos naive)."""
    s = s.strip()
    m = re.match(
        r"(\d{1,2})/(\d{1,2})/(\d{4})\s*-?\s*(\d{1,2})h(\d{1,2})",
        s,
    )
    if not m:
        return None
    d, mo, y, h, mi = (int(x) for x in m.groups())
    try:
        return datetime(y, mo, d, h, mi)
    except ValueError:
        return None


# === regex de campos ===

_RE_NOME = re.compile(
    r'<h5[^>]*>\s*([^<\n]+?)\s*<input', re.S
)
_RE_TIPO = re.compile(r"Tipo de im[óo]vel:\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_SITUACAO = re.compile(r"Situa[çc][ãa]o:\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_QUARTOS = re.compile(r"Quartos:\s*<\s*strong\s*>\s*(\d+)\s*<", re.I)
_RE_GARAGEM = re.compile(r"Garagem:\s*<\s*strong\s*>\s*(\d+)\s*<", re.I)
_RE_MATRICULA_NUM = re.compile(r"Matr[íi]cula\(s\):\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_COMARCA = re.compile(r"Comarca:\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_OFICIO = re.compile(r"Of[íi]cio:\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_INSCRICAO = re.compile(r"Inscri[çc][ãa]o imobili[áa]ria:\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_AVERBACAO = re.compile(r"Averba[çc][ãa]o dos leil[õo]es negativos:\s*<\s*strong\s*>\s*([^<]+?)\s*<", re.I)
_RE_AREA_TOTAL = re.compile(r"[ÁA]rea total\s*=\s*<\s*strong\s*>\s*([\d.,]+)\s*m", re.I)
_RE_AREA_PRIVATIVA = re.compile(r"[ÁA]rea privativa\s*=\s*<\s*strong\s*>\s*([\d.,]+)\s*m", re.I)
_RE_AREA_TERRENO = re.compile(r"[ÁA]rea do terreno\s*=\s*<\s*strong\s*>\s*([\d.,]+)\s*m", re.I)
_RE_ENDERECO = re.compile(r"<strong>\s*Endere[çc]o:\s*</strong>(.*?)</p>", re.S | re.I)
_RE_DESCRICAO = re.compile(r"<strong>\s*Descri[çc][ãa]o:\s*</strong>\s*<br\s*/?>\s*(.*?)</p>", re.S | re.I)
_RE_EXIBEDOC_PDF = re.compile(r"ExibeDoc\(\s*['\"]([^'\"]+\.(?:pdf|PDF))['\"]\s*\)")
_RE_PREGOEIRO = re.compile(r"SiteLeiloeiro\(\s*['\"]([^'\"]+)['\"]\s*\)", re.I)
_RE_LEILOEIRO_NOME = re.compile(r"Leiloeiro\(a\):\s*([^<\n]+)", re.I)
_RE_EDITAL_TEXT = re.compile(r"Edital:\s*([^<\n]+?)(?:<|$)", re.I)
_RE_NUMERO_ITEM = re.compile(r"N[úu]mero do item:\s*([^<\n]+?)(?:<|$)", re.I)
_RE_DATA_LICITACAO = re.compile(r"Data da Licita[çc][ãa]o[^-]*-\s*([^<\n]+?)(?:<|$)", re.I)
_RE_DATA_LEILAO_1 = re.compile(r"1[ºoa°]\s*Leil[ãa]o[^<]*?(\d{1,2}/\d{1,2}/\d{4}[^<]*?\d{1,2}h\d{1,2})", re.I)
_RE_DATA_LEILAO_2 = re.compile(r"2[ºoa°]\s*Leil[ãa]o[^<]*?(\d{1,2}/\d{1,2}/\d{4}[^<]*?\d{1,2}h\d{1,2})", re.I)
_RE_VALOR_LEILAO_1 = re.compile(r"1[ºoa°]\s*Leil[ãa]o[^<]*?R\$\s*([\d.,]+)", re.I)
_RE_VALOR_LEILAO_2 = re.compile(r"2[ºoa°]\s*Leil[ãa]o[^<]*?R\$\s*([\d.,]+)", re.I)
_RE_CORRETORES_CALL = re.compile(
    r"lista_corretores\(\s*\d+\s*,\s*['\"][^'\"]+['\"]\s*,\s*(\d+)\s*\)", re.I
)
_RE_FORMAS_BLOCK = re.compile(
    r"FORMAS DE PAGAMENTO ACEITAS:(.*?)(?:REGRAS PARA PAGAMENTO|</p>)", re.S | re.I
)
# Padrões de risco jurídico que aparecem como linhas avulsas no bloco
# de informações (geralmente abaixo das regras de despesas).
_RISCO_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"gravame", re.I), "gravame"),
    (re.compile(r"penhora", re.I), "penhora"),
    (re.compile(r"indisponibilidade", re.I), "indisponibilidade"),
    (re.compile(r"hipoteca", re.I), "hipoteca"),
    (re.compile(r"a[çc][ãa]o\s+judicial", re.I), "acao_judicial"),
    (re.compile(r"lit[íi]gio", re.I), "litigio"),
    (re.compile(r"regulariza[çc][ãa]o\s+por\s+conta\s+do\s+adquirente", re.I), "regularizacao_adquirente"),
    (re.compile(r"d[íi]vida\s+ativa", re.I), "divida_ativa"),
    (re.compile(r"usucapi[ãa]o", re.I), "usucapiao"),
    (re.compile(r"invas[ãa]o|invadid", re.I), "invasao"),
]

# Frases-marker que indicam linha de risco (caso o regex acima não case
# mas a linha começa com um marker conhecido).
_RISCO_LINE_RE = re.compile(
    r"<i[^>]*></i>[^<]*?(im[óo]vel\s+com|regulariza[çc][ãa]o|gravame|penhora|indisponibilidade|hipoteca|a[çc][ãa]o\s+judicial|lit[íi]gio|d[íi]vida\s+ativa|usucapi[ãa]o|invas|sob\s+lit[íi]gio)[^<]+",
    re.I,
)


_RE_REGRAS_BLOCK = re.compile(
    r"REGRAS PARA PAGAMENTO DAS DESPESAS[^:]*:(.*?)(?:<br\s*/?>\s*<br|</p>)",
    re.S | re.I,
)
_RE_BR_SPLIT = re.compile(r"<br\s*/?>", re.I)
_RE_DESCRICAO_BANHEIROS = re.compile(r"(\d+)\s*Banheiros?", re.I)
_RE_DESCRICAO_WC = re.compile(r"\bWc\b", re.I)
_RE_DESCRICAO_VAGAS = re.compile(r"(\d+)\s*Vaga", re.I)
_RE_PHOTO_SRC = re.compile(r"""src\s*=\s*['"]([^'"]*/fotos/[^'"]+\.(?:jpg|jpeg|png))['"]""", re.I)
_RE_PHOTO_PREVIEW = re.compile(r"""preview\.src\s*=\s*['"]([^'"]*/fotos/[^'"]+\.(?:jpg|jpeg|png))['"]""", re.I)


def parse_detail(html: str) -> DetailExtract:
    out = DetailExtract()

    if m := _RE_NOME.search(html):
        nome = m.group(1).strip()
        if nome and nome.lower() not in ("topo",):
            out.nome_empreendimento = nome

    if m := _RE_TIPO.search(html):
        out.tipo_imovel = m.group(1).strip().lower() or None
    if m := _RE_SITUACAO.search(html):
        out.situacao = m.group(1).strip().lower() or None
    if m := _RE_QUARTOS.search(html):
        out.quartos = int(m.group(1))
    if m := _RE_GARAGEM.search(html):
        out.vagas = int(m.group(1))
    if m := _RE_MATRICULA_NUM.search(html):
        v = m.group(1).strip()
        if v.lower() not in ("não informado", "nao informado", "não identificado", "nao identificado"):
            out.matricula_numero = v
    if m := _RE_COMARCA.search(html):
        out.comarca = m.group(1).strip() or None
    if m := _RE_OFICIO.search(html):
        out.oficio = m.group(1).strip() or None
    if m := _RE_INSCRICAO.search(html):
        v = m.group(1).strip()
        if v.lower() not in ("não informado", "nao informado", "não identificado", "nao identificado"):
            out.inscricao_imobiliaria = v
    if m := _RE_AVERBACAO.search(html):
        out.averbacao_leiloes_negativos = _yesno(m.group(1))
    if m := _RE_AREA_TOTAL.search(html):
        out.area_total_m2 = _to_decimal_area(m.group(1))
    if m := _RE_AREA_PRIVATIVA.search(html):
        out.area_privativa_m2 = _to_decimal_area(m.group(1))
    if m := _RE_AREA_TERRENO.search(html):
        out.area_terreno_m2 = _to_decimal_area(m.group(1))

    if m := _RE_ENDERECO.search(html):
        out.endereco_full = _strip_tags(m.group(1))
    if m := _RE_DESCRICAO.search(html):
        out.descricao_full = _strip_tags(m.group(1))
        # Banheiros / vagas extra da descrição quando garagem não preenchido
        d = out.descricao_full
        if mb := _RE_DESCRICAO_BANHEIROS.search(d):
            out.banheiros = int(mb.group(1))
        elif _RE_DESCRICAO_WC.search(d):
            out.banheiros = 1
        if out.vagas is None:
            if mv := _RE_DESCRICAO_VAGAS.search(d):
                out.vagas = int(mv.group(1))

    for m in _RE_EXIBEDOC_PDF.finditer(html):
        path = m.group(1)
        if "/matricula/" in path.lower():
            out.link_matricula_pdf = path
        else:
            out.link_edital_pdf = path
    if m := _RE_PREGOEIRO.search(html):
        out.link_pregoeiro = m.group(1)
    if m := _RE_LEILOEIRO_NOME.search(html):
        out.nome_leiloeiro = m.group(1).strip() or None
    if m := _RE_EDITAL_TEXT.search(html):
        edital = _NBSP_RE.sub(" ", m.group(1)).strip()
        out.edital = edital or None
    if m := _RE_NUMERO_ITEM.search(html):
        out.numero_item = m.group(1).strip() or None
    if m := _RE_CORRETORES_CALL.search(html):
        out.corretores_cidade_id = m.group(1)

    photos: list[str] = []
    for rx in (_RE_PHOTO_SRC, _RE_PHOTO_PREVIEW):
        for m in rx.finditer(html):
            photos.append(m.group(1).strip())
    out.photo_urls = list(dict.fromkeys(photos))

    if m := _RE_DATA_LICITACAO.search(html):
        dt = _parse_dt_brt(m.group(1))
        if dt:
            out.data_leilao_1 = dt
    if m := _RE_DATA_LEILAO_1.search(html):
        dt = _parse_dt_brt(m.group(1))
        if dt:
            out.data_leilao_1 = dt
    if m := _RE_DATA_LEILAO_2.search(html):
        dt = _parse_dt_brt(m.group(1))
        if dt:
            out.data_leilao_2 = dt
    if m := _RE_VALOR_LEILAO_1.search(html):
        out.valor_leilao_1 = _to_decimal_brl(m.group(1))
    if m := _RE_VALOR_LEILAO_2.search(html):
        out.valor_leilao_2 = _to_decimal_brl(m.group(1))

    if m := _RE_FORMAS_BLOCK.search(html):
        for chunk in _RE_BR_SPLIT.split(m.group(1)):
            text = _strip_tags(chunk).rstrip(".").strip()
            if len(text) >= 5:
                out.formas_pagamento.append(text)

    if m := _RE_REGRAS_BLOCK.search(html):
        for chunk in _RE_BR_SPLIT.split(m.group(1)):
            text = _strip_tags(chunk).strip().rstrip(".")
            if len(text) < 5:
                continue
            if ":" in text:
                k, _, v = text.partition(":")
                out.regras_despesas[k.strip().lower()] = v.strip().rstrip(".")
            else:
                out.regras_despesas.setdefault("outros", text)

    # ==== Riscos jurídicos ====
    # Esses bullets aparecem fora do bloco de "regras de despesas", próximo
    # ao final do card de informações (junto de "Corretores credenciados").
    raw_lines: list[str] = []
    seen_categorias: set[str] = set()

    # 1) Linhas marker-based no HTML cru
    for m in _RISCO_LINE_RE.finditer(html):
        line = _strip_tags(m.group(0)).strip().rstrip(".")
        if line and len(line) >= 6:
            raw_lines.append(line)

    # 2) Também escaneia o que entrou em regras_despesas['outros'] e formas_pagamento
    extra_corpus = []
    if "outros" in out.regras_despesas:
        extra_corpus.append(out.regras_despesas["outros"])
    extra_corpus.extend(out.formas_pagamento)
    extra_corpus.extend(raw_lines)

    for line in extra_corpus:
        for pat, key in _RISCO_PATTERNS:
            if pat.search(line):
                seen_categorias.add(key)

    if seen_categorias:
        out.riscos_juridicos = sorted(seen_categorias)
    if raw_lines:
        out.riscos_juridicos_raw = " | ".join(dict.fromkeys(raw_lines))

    return out
