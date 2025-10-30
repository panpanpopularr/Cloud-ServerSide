#!/usr/bin/env bash
set -e
cd /var/app/current
echo "[EB] Running Prisma generate and migrate..."
npx prisma generate || true
npx prisma migrate deploy || true
echo "[EB] Prisma setup done."
