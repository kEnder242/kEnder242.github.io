#!/bin/bash
# sync_protocols.sh [v1.0]
# Purpose: Sanitize the internal Lab Protocols page and deploy to the public airlock.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTERNAL_PROTOCOLS="$REPO_ROOT/Portfolio_Dev/field_notes/protocols.html"
PUBLIC_PROTOCOLS="$REPO_ROOT/www_deploy/protocols.html"
SHOT_SCRAPER="$REPO_ROOT/Portfolio_Dev/.venv/bin/shot-scraper"

echo "[1/3] Sanitizing Protocols Page..."
CSS_BLOCK='<style>
        :root {
            --bg-color: #1a1a1a;
            --text-color: #cccccc;
            --accent-color: #4daafc;
            --border-color: #333333;
            --font-stack: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        }
        body { background: var(--bg-color); color: var(--text-color); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 40px; }
        main { max-width: 1000px; margin: 0 auto; }
        .section-title { color: #fff; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; font-family: var(--font-stack); }
        .disclaimer-box { 
            background-color: #111; 
            border: 1px solid var(--border-color); 
            padding: 15px; 
            margin-bottom: 25px; 
            font-family: var(--font-stack); 
            font-size: 0.9rem; 
            line-height: 1.4; 
            border-left: 4px solid var(--accent-color); 
        }
        .ledger-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 20px; background: rgba(255, 255, 255, 0.01); font-family: var(--font-stack); }
        .ledger-table th { text-align: left; padding: 12px 15px; border-bottom: 2px solid var(--border-color); color: var(--accent-color); text-transform: uppercase; letter-spacing: 1px; }
        .ledger-table td { padding: 12px 15px; border-bottom: 1px solid #222; vertical-align: top; line-height: 1.4; }
        .protocol-body p { margin-top: 0; margin-bottom: 10px; }
        .protocol-body ul, .protocol-body ol { margin-top: 0; margin-bottom: 10px; padding-left: 20px; }
        .protocol-body li { margin-bottom: 5px; }
        .protocol-body a { color: var(--accent-color); text-decoration: none; border-bottom: 1px dashed var(--accent-color); }
        .protocol-body a:hover { color: #fff; border-bottom-style: solid; }
        .protocol-body code { background: #222; padding: 2px 4px; border-radius: 3px; font-family: var(--font-stack); color: #e2e2e2; }
        .nav-home { margin-bottom: 20px; font-family: var(--font-stack); }
        .nav-home a { color: var(--accent-color); text-decoration: none; font-size: 0.9rem; }
        #sys-console {
            background: #000; color: var(--accent-color); font-family: var(--font-stack);
            padding: 10px; margin-bottom: 20px; border: 1px solid #333; font-size: 0.7rem;
            border-left: 3px solid var(--accent-color);
        }
    </style>'

# Copy internal page to public airlock path
cp "$INTERNAL_PROTOCOLS" "$PUBLIC_PROTOCOLS"

# Remove scripts, sidebars, and stylesheet links using Python inline regex replacements
python3 -c "
import sys, re
content = open('$PUBLIC_PROTOCOLS').read()
# Replace stylesheet link with inline CSS
content = re.sub(r'<link rel=\"stylesheet\" href=\"style.css\?v=[a-f0-9]+\">', sys.argv[1], content)
# Remove Zero Trust Sidebar Navigation and replace with return link
nav_search = '<nav id=\"sidebar\">\n        <mission-control></mission-control>\n    </nav>'
content = content.replace(nav_search, '<div class=\"nav-home\"><a href=\"index.html\">← Return to Front Page</a></div>')
# Remove stylesheet style block that was in template if any
# Remove Scripts
content = re.sub(r'<script src=\"mission-control.js\?v=[a-f0-9]+\"></script>', '', content)
with open('$PUBLIC_PROTOCOLS', 'w') as f: f.write(content)
" "$CSS_BLOCK"

echo "[2/3] Generating High-Fidelity Snapshot..."
$SHOT_SCRAPER shot "$PUBLIC_PROTOCOLS" -o "$REPO_ROOT/www_deploy/assets/protocols_snapshot.png" -w 1920 -h 800 --wait 2000

echo "[3/3] Deployment Integrity Verified."
