#!/usr/bin/env bash
set -euo pipefail

echo "[EB] === PREDEPLOY BUILD START ==="

cd /var/app/staging

echo "[EB] Installing dependencies..."
npm ci --omit=dev

echo "[EB] Building Next.js..."
npm run build

echo "[EB] Copy build output to /var/app/current ..."
rsync -a --delete /var/app/staging/ /var/app/current/

echo "[EB] Build & copy done."
