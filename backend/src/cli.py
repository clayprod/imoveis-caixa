"""CLI do pipeline. Uso:

    python -m src.cli ingest --file Lista_imoveis_geral.csv --scope geral
    python -m src.cli ingest --uf SP
    python -m src.cli ingest                       # baixa lista geral e ingere
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

# Carregar .env do backend antes de importar módulos que leem env vars.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_ROOT / ".env")

from src.ingest.downloader import download_all  # noqa: E402
from src.ingest.parser import parse              # noqa: E402


def _connect():
    import psycopg  # lazy: dry-run não precisa
    url = os.environ["DATABASE_URL"]
    # SQLAlchemy usa "postgresql+psycopg://"; psycopg cru espera "postgresql://".
    if url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    return psycopg.connect(url)


def _scope_from_filename(path: Path) -> str:
    m = re.search(r"Lista_imoveis_([A-Za-z]+)", path.name)
    return m.group(1).lower() if m else "geral"


def cmd_ingest(args: argparse.Namespace) -> int:
    if args.file:
        files = [Path(args.file)]
    else:
        keys = args.uf.split(",") if args.uf else ["geral"]
        dest = Path(args.dest_dir)
        files = asyncio.run(download_all(dest, ufs=keys))

    print(f"[ingest] {len(files)} arquivo(s){' (dry-run)' if args.dry_run else ''}")

    if args.dry_run:
        from src.ingest.description_extractor import extract
        for path in files:
            scope = (args.scope or _scope_from_filename(path)).lower()
            tipos: dict[str, int] = {}
            ufs: dict[str, int] = {}
            modalidades: dict[str, int] = {}
            n = 0
            sample: list[tuple] = []
            for raw in parse(path):
                n += 1
                feats = extract(raw.descricao)
                tipos[feats.tipo_imovel or "?"] = tipos.get(feats.tipo_imovel or "?", 0) + 1
                ufs[raw.uf] = ufs.get(raw.uf, 0) + 1
                modalidades[raw.modalidade_venda or "?"] = (
                    modalidades.get(raw.modalidade_venda or "?", 0) + 1
                )
                if len(sample) < 3:
                    sample.append((raw, feats))
            print(f"  - {path.name} (scope={scope}) -> {n} linhas")
            print(f"    tipos:       {dict(sorted(tipos.items(), key=lambda x: -x[1]))}")
            print(f"    modalidades: {dict(sorted(modalidades.items(), key=lambda x: -x[1]))}")
            top_ufs = sorted(ufs.items(), key=lambda x: -x[1])[:5]
            print(f"    top UFs:     {top_ufs}")
            for raw, feats in sample:
                print(
                    f"    sample: {raw.numero_imovel} | {raw.uf}/{raw.cidade} | "
                    f"R$ {raw.preco_venda} ({raw.desconto_percentual}% desc) | "
                    f"tipo={feats.tipo_imovel} q={feats.quartos} ban={feats.banheiros} "
                    f"vagas={feats.vagas} at={feats.area_total_m2} ap={feats.area_privativa_m2}"
                )
        return 0

    from src.ingest.upserter import upsert_rows  # lazy: dry-run não precisa
    with _connect() as conn:
        for path in files:
            scope = (args.scope or _scope_from_filename(path)).lower()
            print(f"  - {path.name} (scope={scope})", flush=True)
            try:
                stats = upsert_rows(
                    conn,
                    parse(path),
                    scope_uf=scope,
                    source_file=str(path),
                )
            except Exception as exc:
                print(f"    ERRO: {exc}", file=sys.stderr)
                conn.rollback()
                return 1
            print(
                f"    seen={stats['seen']} inserted={stats['inserted']} "
                f"updated={stats['updated']} removed={stats['removed']} "
                f"price_changes={stats['price_changes']}"
            )
    return 0


def cmd_scrape(args: argparse.Namespace) -> int:
    import asyncio
    from src.scraper.worker import run_scrape
    res = asyncio.run(run_scrape(scope=args.scope, limit=args.limit, concurrency=args.concurrency))
    print(
        f"[scrape] run={res['run_id']} scope={res['scope']} "
        f"total={res['total']} ok={res['ok']} failed={res['failed']}"
    )
    return 0 if res["failed"] == 0 else 1


def cmd_download_matriculas(args: argparse.Namespace) -> int:
    import asyncio
    from src.scraper.matricula_downloader import run_download
    res = asyncio.run(run_download(limit=args.limit, concurrency=args.concurrency))
    print(
        f"[matriculas] total={res['total']} ok={res['ok']} "
        f"failed={res['failed']} bytes={res['bytes']}"
    )
    return 0 if res["failed"] == 0 else 1


def cmd_download_photos(args: argparse.Namespace) -> int:
    import asyncio
    from src.scraper.photo_downloader import run_download_photos
    res = asyncio.run(run_download_photos(limit=args.limit, concurrency=args.concurrency))
    print(
        f"[photos] total={res['total']} ok={res['ok']} "
        f"failed={res['failed']} bytes={res['bytes']}"
    )
    return 0 if res["failed"] == 0 else 1


def cmd_geocode(args: argparse.Namespace) -> int:
    import asyncio
    from src.enrichment.geocoder import run_geocode
    res = asyncio.run(run_geocode(limit=args.limit))
    print(f"[geocode] total={res['total']} ok={res['ok']} no_match={res['no_match']} failed={res['failed']}")
    return 0


def cmd_ocr(args: argparse.Namespace) -> int:
    import asyncio
    from src.enrichment.ocr import run_ocr
    res = asyncio.run(run_ocr(limit=args.limit))
    print(f"[ocr] total={res['total']} ok={res['ok']} no_text={res['no_text']} failed={res['failed']}")
    return 0


def cmd_embed(args: argparse.Namespace) -> int:
    import asyncio
    from src.enrichment.embeddings import run_embed
    res = asyncio.run(run_embed(limit=args.limit, batch_size=args.batch))
    print(f"[embed] total={res['total']} ok={res['ok']} failed={res['failed']}")
    return 0


def cmd_neighborhoods(args: argparse.Namespace) -> int:
    import asyncio
    from src.enrichment.neighborhood import run_evaluate_neighborhoods
    res = asyncio.run(run_evaluate_neighborhoods(limit=args.limit))
    print(f"[neighborhoods] total={res['total']} ok={res['ok']} failed={res['failed']}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="imoveis")
    sub = parser.add_subparsers(dest="cmd", required=True)

    ing = sub.add_parser("ingest", help="Baixa/processa lista CSV da Caixa")
    ing.add_argument("--file", help="CSV local (pula o download)")
    ing.add_argument(
        "--uf",
        help="UF(s) separadas por vírgula (ex: SP,MG). Default: 'geral' (lista completa)",
    )
    ing.add_argument(
        "--scope",
        help="Escopo do soft-delete: 'geral' (default p/ lista completa) ou UF (ex: 'SP')",
    )
    ing.add_argument("--dest-dir", default="data/raw")
    ing.add_argument(
        "--dry-run",
        action="store_true",
        help="Apenas parseia e extrai features (sem tocar no banco)",
    )
    ing.set_defaults(func=cmd_ingest)

    scr = sub.add_parser("scrape", help="Scrape das páginas de detalhe")
    scr.add_argument(
        "--scope",
        choices=["pending", "stale", "all"],
        default="pending",
        help="pending: sem detail. stale: detail mais antigo que SCRAPE_STALE_DAYS. all: todos active.",
    )
    scr.add_argument("--limit", type=int, default=100)
    scr.add_argument("--concurrency", type=int, default=10)
    scr.set_defaults(func=cmd_scrape)

    dm = sub.add_parser("download-matriculas", help="Baixa PDFs de matrícula")
    dm.add_argument("--limit", type=int, default=100)
    dm.add_argument("--concurrency", type=int, default=5)
    dm.set_defaults(func=cmd_download_matriculas)

    dp = sub.add_parser("download-photos", help="Baixa fotos da galeria dos imoveis")
    dp.add_argument("--limit", type=int, default=100)
    dp.add_argument("--concurrency", type=int, default=8)
    dp.set_defaults(func=cmd_download_photos)

    geo = sub.add_parser("geocode", help="Preenche lat/lon via Nominatim")
    geo.add_argument("--limit", type=int, default=50)
    geo.set_defaults(func=cmd_geocode)

    ocr = sub.add_parser("ocr", help="Extrai texto e dados estruturados das matrÃ­culas")
    ocr.add_argument("--limit", type=int, default=10)
    ocr.set_defaults(func=cmd_ocr)

    emb = sub.add_parser("embed", help="Gera embeddings pgvector para imÃ³veis sem embedding")
    emb.add_argument("--limit", type=int, default=500)
    emb.add_argument("--batch", type=int, default=50)
    emb.set_defaults(func=cmd_embed)

    nb = sub.add_parser("neighborhoods", help="Avalia bairros com IA e estatÃ­sticas internas")
    nb.add_argument("--limit", type=int, default=20)
    nb.set_defaults(func=cmd_neighborhoods)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
