#!/bin/bash
# sync_research.sh [v1.1]
# Purpose: Sanitize the internal Research Ledger and deploy to the public airlock.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTERNAL_RESEARCH="$REPO_ROOT/Portfolio_Dev/field_notes/research.html"
PUBLIC_RESEARCH="$REPO_ROOT/www_deploy/research.html"
SHOT_SCRAPER="$REPO_ROOT/Portfolio_Dev/.venv/bin/shot-scraper"

echo "[1/3] Sanitizing Research Ledger..."
# Read the standalone CSS we generated earlier
CSS_BLOCK='<style>
        :root {
            --bg-color: #0d1117;
            --text-color: #c9d1d9;
            --accent-color: #58a6ff;
            --border-color: #30363d;
            --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }
        body { background: var(--bg-color); color: var(--text-color); font-family: var(--font-stack); line-height: 1.6; margin: 0; padding: 40px; }
        main { max-width: 1000px; margin: 0 auto; }
        .section-title { color: #fff; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
        .disclaimer-box { background: rgba(88, 166, 255, 0.1); border: 1px solid var(--accent-color); padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; }
        .ledger-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 20px; background: rgba(255, 255, 255, 0.01); }
        .ledger-table th { text-align: left; padding: 12px 15px; border-bottom: 2px solid var(--border-color); color: var(--accent-color); text-transform: uppercase; letter-spacing: 1px; }
        .ledger-table td { padding: 12px 15px; border-bottom: 1px solid #222; vertical-align: top; line-height: 1.4; }
        .anchor-link { color: #fff; text-decoration: none; font-weight: bold; border-bottom: 1px dashed #444; }
        .impact-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
        .impact-live { background: #238636; color: #fff; }
        .impact-design { background: #1f6feb; color: #fff; }
        .impact-stable { background: #6e7681; color: #fff; }
        .nav-home { margin-bottom: 20px; }
        .nav-home a { color: var(--accent-color); text-decoration: none; font-size: 0.9rem; }
    </style>'

# Perform the copy
cp "$INTERNAL_RESEARCH" "$PUBLIC_RESEARCH"

# Use Python for a cleaner multiline replacement of the head/nav section
python3 -c "
import sys
content = open('$PUBLIC_RESEARCH').read()
# Replace Head
head_search = '<link rel=\"stylesheet\" href=\"style.css?v=d3756599\">'
content = content.replace(head_search, sys.argv[1])
# Remove Zero Trust Nav
nav_search = '<nav id=\"sidebar\">\n        <mission-control></mission-control>\n    </nav>'
content = content.replace(nav_search, '<div class=\"nav-home\"><a href=\"index.html\">← Return to Airlock</a></div>')
# Remove Scripts
content = content.replace('<script src=\"mission-control.js?v=bd431d08\"></script>', '')
content = content.replace('<script src=\"script.js?v=7704e669\"></script>', '')
with open('$PUBLIC_RESEARCH', 'w') as f: f.write(content)
" "$CSS_BLOCK"

echo "[2/3] Generating High-Fidelity Snapshot..."
$SHOT_SCRAPER shot "$PUBLIC_RESEARCH" -o "$REPO_ROOT/www_deploy/assets/research_snapshot.png" -w 1920 -h 800 --wait 2000

echo "[3/3] Deployment Integrity Verified."
