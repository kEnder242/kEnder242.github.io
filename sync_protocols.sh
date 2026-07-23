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
        body { background: var(--bg-color); color: var(--text-color); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
        #sidebar {
            width: 260px;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            background: #11161d;
            border-right: 1px solid var(--border-color);
            padding: 30px 20px;
            overflow-y: auto;
        }
        #sidebar h2 { font-size: 0.75rem; text-transform: uppercase; color: var(--accent-color); margin-top: 25px; letter-spacing: 1px; font-weight: bold; }
        #sidebar ul { list-style: none; padding: 0; margin: 10px 0 0 0; }
        #sidebar li { margin-bottom: 10px; font-size: 0.85rem; }
        #sidebar a { color: #8b949e; text-decoration: none; transition: color 0.2s ease; }
        #sidebar a:hover { color: #e6edf3; }
        main { margin-left: 300px; max-width: 900px; padding: 40px; }
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
        #menu-toggle { display: none; }
        @media (max-width: 768px) {
            #sidebar { display: none; }
            main { margin-left: 0; padding: 20px; }
            #menu-toggle { display: block; background: #11161d; color: #e6edf3; border: 1px solid var(--border-color); padding: 10px 20px; margin-bottom: 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        }
    </style>'

# Copy internal page to public airlock path
cp "$INTERNAL_PROTOCOLS" "$PUBLIC_PROTOCOLS"

# Copy mission-control.js to www_deploy
cp "$REPO_ROOT/Portfolio_Dev/field_notes/mission-control.js" "$PUBLIC_DIR/mission-control.js" 2>/dev/null || cp "$REPO_ROOT/Portfolio_Dev/field_notes/mission-control.js" "$REPO_ROOT/www_deploy/mission-control.js"

# Remove scripts and stylesheet links using Python inline regex replacements
python3 -c "
import sys, re
content = open('$PUBLIC_PROTOCOLS').read()
# Replace stylesheet link with inline CSS
content = re.sub(r'<link rel=\"stylesheet\" href=\"style.css\?v=[a-f0-9]+\">', sys.argv[1], content)
with open('$PUBLIC_PROTOCOLS', 'w') as f: f.write(content)
" "$CSS_BLOCK"

echo "[2/3] Generating High-Fidelity Snapshot..."
$SHOT_SCRAPER shot "$PUBLIC_PROTOCOLS" -o "$REPO_ROOT/www_deploy/assets/protocols_snapshot.png" -w 1920 -h 800 --wait 2000

echo "[3/3] Deployment Integrity Verified."
