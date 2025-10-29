#!/bin/bash
set -e
cd /var/app/current

echo "Installing dependencies..."
npm ci --omit=dev

echo "Building Next.js (standalone)..."
npm run build

echo "Build done."
