#!/usr/bin/env bash
set -e
chmod +x .platform/hooks/postdeploy/*.sh || true
echo "[EB] Permissions fixed"
