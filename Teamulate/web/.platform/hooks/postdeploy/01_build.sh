#!/bin/bash
set -e

cd /var/app/current

echo "📦 Installing dependencies..."
npm ci --omit=dev

echo "🏗️ Building Next.js..."
npm run build

echo "✅ Build completed successfully."
