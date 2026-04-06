#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PM2_APP_NAME="${PM2_APP_NAME:-corpdeals-backend}"

if [ "${CONFIRM_UAT_SEED:-}" != "yes" ]; then
  echo "[uat-demo] Refusing to run without CONFIRM_UAT_SEED=yes"
  exit 1
fi

cd "$BACKEND_DIR"

echo "[uat-demo] generating Prisma client"
npx prisma generate

echo "[uat-demo] applying idempotent UAT schema patch"
npx prisma db execute --schema prisma/schema.prisma --file prisma/manual/prepare_uat_demo_schema.sql

echo "[uat-demo] seeding UAT demo data"
npm run db:seed:uat

echo "[uat-demo] building backend"
npm run build

echo "[uat-demo] restarting PM2 app: $PM2_APP_NAME"
pm2 restart "$PM2_APP_NAME" --update-env

echo "[uat-demo] done"
