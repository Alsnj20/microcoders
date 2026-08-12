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
  echo "⚠️  Docker image '$DOCKER_IMAGE' not found — building natively with the pinned toolchain."
  echo "   For local Nitro deploys, build the image first: cd nitro-devnode && bash ./run-dev-node.sh --stylus"

  if ! command -v cargo &>/dev/null; then
    echo "❌ cargo not found. Install Rust + cargo-stylus 0.10.8 (see readme.md)."
    exit 1
  fi
  if ! cargo stylus --version &>/dev/null; then
    echo "❌ cargo-stylus not found. Install it: cargo install --force --locked cargo-stylus@0.10.8"
    exit 1
  fi
  if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
    echo "🔧 Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
  fi

  (cd "$CONTRACTS_DIR" && cargo build --target wasm32-unknown-unknown --release 2>&1)
else
  # Build all workspace members in release mode for wasm32-unknown-unknown.
  # The volume mount maps the contracts dir into /build inside the container.
  # Output goes to /build/target/ which maps back to the host.
  docker run --rm --entrypoint bash \
    -v "$CONTRACTS_DIR:/build" \
    -w /build \
    "$DOCKER_IMAGE" \
    -c "cargo build --target wasm32-unknown-unknown --release 2>&1 && chown -R $(id -u):$(id -g) /build/target"
fi

echo "✅ WASM binaries built successfully"
ls -lh "$CONTRACTS_DIR"/target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || true
