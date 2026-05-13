#!/usr/bin/env sh
set -eu

if [ "$#" -eq 0 ]; then
  set -- web
fi

if [ "$1" = "web" ]; then
  exec gunicorn --bind "0.0.0.0:${PORT:-5000}" --workers "${WEB_CONCURRENCY:-2}" src.main:app
fi

exec python -m src.cli "$@"
