#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/.local/share/tf2-vscript-ls"
git clone --depth 1 https://github.com/ocet247/tf2-vscript-support /tmp/tf2-vscript-support
cd /tmp/tf2-vscript-support

RUSTFLAGS="-C target-cpu=native" cargo build --release
mkdir -p "$INSTALL_DIR"

cp target/release/tf2-vscript-ls "$INSTALL_DIR/"
cp -r vscript_lib "$INSTALL_DIR/"

echo "Installed to $INSTALL_DIR"