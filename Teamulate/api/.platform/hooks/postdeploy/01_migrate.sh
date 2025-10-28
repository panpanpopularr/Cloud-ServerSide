#!/bin/bash
# รันหลัง EB ติดตั้งเสร็จในแต่ละ deploy
set -e

echo "[postdeploy] running prisma migrate deploy..."
/usr/bin/npm run migrate --prefix /var/app/staging

echo "[postdeploy] ensure admin seed..."
/usr/bin/npm run seed:admin --prefix /var/app/staging

echo "[postdeploy] done."
