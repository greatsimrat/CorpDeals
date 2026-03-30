#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/ubuntu/CorpDeals"
BACKEND_DIR="$REPO_DIR/backend"
BRANCH="main"
PM2_APP_NAME="corpdeals-backend"

echo "[deploy] using repo: $REPO_DIR"

cd "$REPO_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[deploy] refusing to deploy: git worktree is dirty on EC2"
  git status --short
  exit 1
fi

echo "[deploy] fetching latest code"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] installing backend dependencies"
cd "$BACKEND_DIR"
npm ci

echo "[deploy] generating Prisma client"
npx prisma generate

echo "[deploy] building backend"
npm run build

echo "[deploy] restarting PM2 app: $PM2_APP_NAME"
pm2 restart "$PM2_APP_NAME" --update-env

echo "[deploy] done"
