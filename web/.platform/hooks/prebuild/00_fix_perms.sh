set -e

chmod +x /var/app/staging/.platform/hooks/postdeploy/01_build.sh || true
chmod +x /var/app/current/.platform/hooks/postdeploy/01_build.sh || true
