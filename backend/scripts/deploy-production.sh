#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/ubuntu/CorpDeals"
BACKEND_DIR="$REPO_DIR/backend"
BRANCH="main"
PM2_APP_NAME="corpdeals-backend"

ensure_swap() {
  if swapon --show --noheadings | grep -q .; then
    echo "[deploy] swap already enabled"
    return 0
  fi

  if ! sudo -n true 2>/dev/null; then
    echo "[deploy] sudo not available for swap setup"
    return 1
  fi

  echo "[deploy] enabling 1G swap file"
  sudo fallocate -l 1G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
}

run_npm_ci() {
  set +e
  npm ci --no-audit --no-fund
  local exit_code=$?
  set -e

  if [ "$exit_code" -eq 0 ]; then
    return 0
  fi

  if [ "$exit_code" -eq 137 ]; then
    echo "[deploy] npm ci was killed, likely due to memory pressure"
    ensure_swap || true
    npm ci --no-audit --no-fund
    return 0
  fi

  return "$exit_code"
}

echo "[deploy] using repo: $REPO_DIR"

cd "$REPO_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[deploy] refusing to deploy: git worktree is dirty on EC2"
  git status --short
  exit 1
fi

echo "[deploy] fetching latest code"
current_rev="$(git rev-parse HEAD)"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
new_rev="$(git rev-parse HEAD)"

if [ "$current_rev" = "$new_rev" ]; then
  echo "[deploy] no new commits on $BRANCH"
  exit 0
fi

if git diff --quiet "$current_rev" "$new_rev" -- backend; then
  echo "[deploy] no backend changes detected; skipping backend deploy"
  exit 0
fi

dependencies_changed=false
if ! git diff --quiet "$current_rev" "$new_rev" -- backend/package.json backend/package-lock.json; then
  dependencies_changed=true
fi

cd "$BACKEND_DIR"
if [ ! -d node_modules ] || [ "$dependencies_changed" = true ]; then
  echo "[deploy] installing backend dependencies"
  run_npm_ci
else
  echo "[deploy] backend dependencies unchanged; skipping npm ci"
fi

echo "[deploy] generating Prisma client"
npx prisma generate

echo "[deploy] building backend"
npm run build

echo "[deploy] restarting PM2 app: $PM2_APP_NAME"
pm2 restart "$PM2_APP_NAME" --update-env

echo "[deploy] done"
