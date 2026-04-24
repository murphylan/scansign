#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  推送镜像到 Registry 私服
#
#  用法:
#    ./scripts/push-image.sh              # 推送 :latest
#    ./scripts/push-image.sh v1.2.0       # 推送 :v1.2.0 + :latest
#
#  前提:
#    1. 已执行 ./scripts/build-image.sh 构建镜像
#    2. 已登录 Registry: podman login zot.murphylan.cloud
# ─────────────────────────────────────────────────────────────
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/image-env.sh"

if ! $CTR image exists "${FULL_IMAGE}:${TAG}" 2>/dev/null; then
  echo "[ERROR] 镜像 ${FULL_IMAGE}:${TAG} 不存在，请先运行 ./scripts/build-image.sh ${TAG}"
  exit 1
fi

echo "[1/2] 推送镜像到 ${REGISTRY}..."
$CTR push $TLS_FLAG "${FULL_IMAGE}:${TAG}"

if [ "$TAG" != "latest" ]; then
  $CTR push $TLS_FLAG "${FULL_IMAGE}:latest"
fi

echo "[2/2] 推送完成!"
echo ""
echo "  镜像: ${FULL_IMAGE}:${TAG}"
echo ""
echo "  C 机器部署:"
echo "    1. 同步部署脚本到服务器:"
echo "       cd ~/work/murphy/murphy-deploy && ./sync-to-server.sh c"
echo "    2. SSH 到 C 机器执行:"
echo "       cd ~/murphy-deploy/products/scansign && bash install.sh"
