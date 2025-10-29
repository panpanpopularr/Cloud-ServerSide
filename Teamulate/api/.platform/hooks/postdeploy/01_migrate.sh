#!/bin/bash
set -euo pipefail

# โค้ดจริงที่ EB รันหลังปล่อย
cd /var/app/current

# ให้ EB หา npx/npm ที่ node_modules/.bin ได้
export PATH="$PATH:/var/app/current/node_modules/.bin"

echo "[postdeploy] prisma generate"
npx prisma generate || true

echo "[postdeploy] prisma migrate deploy"
# แนะนำให้ใช้เฉพาะ migrate deploy บนโปรดักชัน
npx prisma migrate deploy

echo "[postdeploy] done"
