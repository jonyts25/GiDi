#!/bin/sh
# Por defecto readiness (incluye consulta a la base). Para solo liveness: HEALTHCHECK_PATH=/health
PORT="${PORT:-3000}"
PATH_SUFFIX="${HEALTHCHECK_PATH:-/health/ready}"
url="http://127.0.0.1:${PORT}${PATH_SUFFIX}"
if [ "$PATH_SUFFIX" = "/health" ]; then
  pattern='"ok":true'
else
  pattern='"db":true'
fi
if ! wget -qO- "$url" | grep -q "$pattern"; then
  exit 1
fi
