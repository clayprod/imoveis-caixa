#!/usr/bin/env sh
set -eu

if [ "$#" -eq 0 ]; then
  echo "imoveis-ingest idle: no CLI command provided. Use: ingest, scrape, download-matriculas, download-photos, geocode, ocr, embed, neighborhoods."
  exec tail -f /dev/null
fi

exec python -m src.cli "$@"
