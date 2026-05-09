#!/usr/bin/env bash
# Wrapper de ingestão — chamado 2x/dia (07h e 19h BRT) via cron, systemd timer ou n8n.
#
# Comportamento: baixa Lista_imoveis_geral.csv, faz upsert e soft-delete dos imóveis
# que sumiram da lista. Histórico (price + status='removed') é preservado.

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/home/ubuntu/imoveis-caixa}"
LOG_DIR="${LOG_DIR:-/var/log/imoveis-caixa}"
mkdir -p "$LOG_DIR"

cd "$PROJECT_ROOT/backend"

# shellcheck disable=SC1091
source venv/bin/activate

LOG="$LOG_DIR/ingest-$(date +%Y%m%d-%H%M).log"
echo "==== ingest start $(date -Is) ====" >> "$LOG"
python -m src.cli ingest >> "$LOG" 2>&1
echo "==== ingest end   $(date -Is) ====" >> "$LOG"
