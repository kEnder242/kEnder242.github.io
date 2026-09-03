#!/bin/bash
# sync_public_benchmarks.sh [v1.0]
# Purpose: Sync the public benchmarks showcase and sanitized telemetry to public airlock.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTERNAL_HTML="$REPO_ROOT/Portfolio_Dev/field_notes/public_benchmarks.html"
PUBLIC_HTML="$REPO_ROOT/www_deploy/public_benchmarks.html"

echo "[1/3] Copying Public Benchmarks Page & Assets..."
cp "$INTERNAL_HTML" "$PUBLIC_HTML"
cp "$REPO_ROOT/Portfolio_Dev/field_notes/mission-control.js" "$REPO_ROOT/www_deploy/mission-control.js"

echo "[2/3] Exporting and Copying Sanitized Benchmark Data..."
python3 "$REPO_ROOT/Portfolio_Dev/field_notes/export_public_benchmarks.py"
mkdir -p "$REPO_ROOT/www_deploy/data"
cp "$REPO_ROOT/Portfolio_Dev/field_notes/data/public_benchmarks.json" "$REPO_ROOT/www_deploy/data/public_benchmarks.json"

echo "[3/3] Public Benchmarks Showcase Synced."
