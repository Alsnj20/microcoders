#!/usr/bin/env bash
# Build all Stylus WASM binaries inside Docker.
# This ensures consistent builds with the exact Rust toolchain + cargo-stylus
# version that matches the Nitro node, preventing stale-binary panics.
#
# Called automatically by `pnpm deploy:contracts` via the predeploy hook.

set -euo pipefail

CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"
DOCKER_IMAGE="nitro-node-stylus-dev:latest"

echo "🔨 Building Stylus WASM binaries in Docker..."

# Check that the Docker image exists
if ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
  echo "❌ Docker image '$DOCKER_IMAGE' not found."
  echo "   Build it first: cd nitro-devnode && bash ./run-dev-node.sh --stylus"
  exit 1
fi

# Build all workspace members in release mode for wasm32-unknown-unknown.
# The volume mount maps the contracts dir into /build inside the container.
# Output goes to /build/target/ which maps back to the host.
docker run --rm --entrypoint bash \
  -v "$CONTRACTS_DIR:/build" \
  -w /build \
  "$DOCKER_IMAGE" \
  -c "cargo build --target wasm32-unknown-unknown --release 2>&1 && chown -R $(id -u):$(id -g) /build/target"

echo "✅ WASM binaries built successfully"
ls -lh "$CONTRACTS_DIR"/target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || true
