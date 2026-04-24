#!/bin/bash
# 镜像构建/推送的共享变量与工具检测

REGISTRY="zot.murphylan.cloud"
IMAGE_NAME="murphy/scansign"
TAG="${1:-latest}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if command -v podman &>/dev/null; then
  CTR=podman
elif command -v docker &>/dev/null; then
  CTR=docker
else
  echo "[ERROR] 请先安装 podman 或 docker"
  exit 1
fi

TLS_FLAG=""
if [ "$CTR" = "podman" ]; then
  TLS_FLAG="--tls-verify=false"
fi

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"
