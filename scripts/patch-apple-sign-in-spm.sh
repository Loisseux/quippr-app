#!/usr/bin/env bash
# CapApp-SPM cannot resolve Capacitor 8 + apple-sign-in@7 (SPM range is 7.x only).
# Patch the plugin Package.swift after npm install until an official Cap 8 release exists.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/node_modules/@capacitor-community/apple-sign-in/Package.swift"

if [[ ! -f "$PKG" ]]; then
  exit 0
fi

# Replace Capacitor 7 SPM lower bound with Capacitor 8.
if grep -q 'capacitor-swift-pm.git", from: "7.0.0"' "$PKG"; then
  # Portable in-place edit for macOS sed.
  sed -i '' 's|capacitor-swift-pm.git", from: "7.0.0"|capacitor-swift-pm.git", from: "8.0.0"|' "$PKG"
  sed -i '' 's|\.iOS(\.v14)|\.iOS(.v15)|' "$PKG"
  echo "Patched @capacitor-community/apple-sign-in Package.swift for Capacitor 8 SPM"
fi
