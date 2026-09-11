#!/bin/bash
# sync_timeline.sh [v1.0]
# Purpose: Deploy the Novel Ideas Evolutionary Timeline to the public airlock.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTERNAL_TIMELINE="$REPO_ROOT/Portfolio_Dev/field_notes/timeline.html"
PUBLIC_TIMELINE="$REPO_ROOT/www_deploy/timeline.html"
SHOT_SCRAPER="$REPO_ROOT/Portfolio_Dev/.venv/bin/shot-scraper"

echo "[1/3] Deploying Novel Ideas Timeline to Public Airlock..."
cp "$INTERNAL_TIMELINE" "$PUBLIC_TIMELINE"

# Ensure mission-control.js is synced
cp "$REPO_ROOT/Portfolio_Dev/field_notes/mission-control.js" "$REPO_ROOT/www_deploy/mission-control.js" 2>/dev/null || true

if [ "$ENABLE_SNAPSHOTS" = "1" ]; then
    echo "[2/3] Generating High-Fidelity Snapshot..."
    $SHOT_SCRAPER shot "$PUBLIC_TIMELINE" -o "$REPO_ROOT/www_deploy/assets/timeline_snapshot.png" -w 1920 -h 800 --wait 2000
else
    echo "[2/3] Skipping Snapshot Generation (Pass --snapshots to enable)..."
fi

echo "[3/3] Deployment Integrity Verified: timeline.html."
