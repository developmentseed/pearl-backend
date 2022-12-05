#!/bin/bash

echo 'Run migrations if not already run'
pypgstac migrate --dsn $DATABASE_URL

psql $DATABASE_URL -f $(pwd)/mc_ricr_api/dbfuncs.sql

uvicorn mc_ricr_api.app:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
