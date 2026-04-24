#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  本地构建镜像
#
#  用法:
#    ./scripts/build-image.sh              # 构建 :latest
#    ./scripts/build-image.sh v1.2.0       # 构建 :v1.2.0 + :latest
# ─────────────────────────────────────────────────────────────
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/image-env.sh"
cd "$PROJECT_DIR"

echo "[1/2] 构建镜像..."
$CTR build $TLS_FLAG -t "${FULL_IMAGE}:${TAG}" -f Containerfile .

if [ "$TAG" != "latest" ]; then
  $CTR tag "${FULL_IMAGE}:${TAG}" "${FULL_IMAGE}:latest"
fi

echo "[2/2] 构建完成!"
echo ""
echo "  镜像: ${FULL_IMAGE}:${TAG}"
echo "  推送: ./scripts/push-image.sh ${TAG}"
