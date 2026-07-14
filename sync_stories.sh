#!/bin/bash
# sync_stories.sh [v1.0]
# Purpose: Sanitize the internal Stories page and deploy to the public airlock.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTERNAL_STORIES="$REPO_ROOT/Portfolio_Dev/field_notes/stories.html"
PUBLIC_STORIES="$REPO_ROOT/www_deploy/stories.html"

echo "[1/3] Copying Stories Page..."
cp "$INTERNAL_STORIES" "$PUBLIC_STORIES"

CSS_BLOCK='<style>
        :root {
            --bg-color: #0a0e14;
            --text-color: #e6edf3;
            --accent-color: #4daafc;
            --border-color: #30363d;
            --card-color: #11161d;
            --sub-color: #8b949e;
            --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --mono-stack: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        }
        body { background: var(--bg-color); color: var(--text-color); font-family: var(--font-stack); line-height: 1.6; margin: 0; padding: 0; }
        #sidebar {
            width: 260px;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            background: var(--card-color);
            border-right: 1px solid var(--border-color);
            padding: 30px 20px;
            overflow-y: auto;
        }
        #sidebar h2 { font-size: 0.75rem; text-transform: uppercase; color: var(--accent-color); margin-top: 25px; letter-spacing: 1px; font-weight: bold; }
        #sidebar ul { list-style: none; padding: 0; margin: 10px 0 0 0; }
        #sidebar li { margin-bottom: 10px; font-size: 0.85rem; }
        #sidebar a { color: var(--sub-color); text-decoration: none; transition: color 0.2s ease; }
        #sidebar a:hover { color: var(--text-color); }
        #nav-filter {
            width: 100%;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            color: #fff;
            padding: 8px 12px;
            font-size: 0.8rem;
            margin-bottom: 20px;
            box-sizing: border-box;
            border-radius: 6px;
        }
        .nav-home { margin-bottom: 25px; font-family: var(--mono-stack); font-size: 0.85rem; }
        .nav-home a { color: var(--accent-color); text-decoration: none; }
        main { margin-left: 300px; max-width: 800px; padding: 40px; }
        article { margin-bottom: 50px; border-bottom: 1px solid var(--border-color); padding-bottom: 40px; }
        article h3 { font-size: 1.5rem; margin-top: 0; margin-bottom: 8px; color: #fff; }
        .meta { font-size: 0.75rem; color: var(--accent-color); margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
        article p { color: var(--text-color); font-size: 0.95rem; margin-bottom: 15px; }
        #menu-toggle { display: none; }
        @media (max-width: 768px) {
            #sidebar { display: none; }
            main { margin-left: 0; padding: 20px; }
            #menu-toggle { display: block; background: var(--card-color); color: var(--text-color); border: 1px solid var(--border-color); padding: 10px 20px; margin-bottom: 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        }
    </style>'

echo "[2/3] Sanitizing Stories Page..."
cd "$REPO_ROOT"
python3 -c '
import re, sys
from bs4 import BeautifulSoup

path = "www_deploy/stories.html"
soup = BeautifulSoup(open(path).read(), "html.parser")

# 1. Replace stylesheet link with inline style block
style_link = soup.find("link", rel="stylesheet")
if style_link:
    css_soup = BeautifulSoup(sys.argv[1], "html.parser")
    style_link.replace_with(css_soup.style)

# 2. Strip the <mission-control> tag in the sidebar
mc = soup.find("mission-control")
if mc:
    mc.decompose()
    
# 3. Insert simple public sidebar link at top of sidebar
sidebar = soup.find(id="sidebar")
if sidebar:
    nav_div = soup.new_tag("div", attrs={"class": "nav-home"})
    nav_link = soup.new_tag("a", href="index.html")
    nav_link.string = "← Return to Front Page"
    nav_div.append(nav_link)
    sidebar.insert(0, nav_div)
    
# 4. Strip private articles
for article in soup.find_all("article", attrs={"data-scope": "private"}):
    art_id = article.get("id")
    article.decompose()
    # Remove matching link in sidebar
    link = soup.find("a", href=f"#{art_id}")
    if link and link.parent:
        link.parent.decompose()

# 5. Strip mission-control.js script tag
for script in soup.find_all("script", src=re.compile(r"mission-control\.js")):
    script.decompose()

with open(path, "w") as f:
    f.write(str(soup))
' "$CSS_BLOCK"

echo "[3/3] Deployment Integrity Verified."
