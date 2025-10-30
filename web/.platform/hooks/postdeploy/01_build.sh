set -euo pipefail

cd /var/app/current

echo "Installing dependencies..."
npm ci

echo "Building Next.js (standalone)..."
npm run build

echo "Build done."
