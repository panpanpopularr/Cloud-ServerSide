#!/usr/bin/env bash
set -euo pipefail
for p in /var/app/staging /var/app/current; do
  if [ -f "$p/.platform/hooks/postdeploy/01_build.sh" ]; then
    chmod +x "$p/.platform/hooks/postdeploy/01_build.sh" || true
  fi
done
echo "fix_perms: done"