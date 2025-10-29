#!/bin/bash
set -euo pipefail

cd /var/app/staging
export PATH="$PATH:/var/app/staging/node_modules/.bin"

echo "📦 npm ci (staging)..."
npm ci

echo "🧬 prisma generate"
npx prisma generate || true
