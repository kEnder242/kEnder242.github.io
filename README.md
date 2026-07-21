# 🌐 Acme Lab Public Airlock (`www.jason-lab.dev`)

> High-density architecture specification and setup guide for a hybrid public/private Zero Trust web infrastructure.

---

## 🏛️ Executive Summary & Topology

This repository (`kEnder242.github.io`) serves as the **Public Airlock** for the Acme Lab environment. It provides a 100% uptime, zero-attack-surface front door hosted on GitHub Pages, presenting sanitized public work stories, lab protocols, and research ledgers. High-security assets (raw daily notes, vector artifact indexes, live GPU telemetry, and AI Intercom) reside behind a **Cloudflare Zero Trust Access Tunnel** on internal hardware.

### 🌐 System Topology

| Endpoint | Hosting Infrastructure | Security / Access Model | Description / Function |
| :--- | :--- | :--- | :--- |
| **`www.jason-lab.dev`** | GitHub Pages (`kEnder242.github.io`) | 🌍 **Public (Zero Auth)** | **The Airlock.** Static HTML/CSS welcome portal. Public research, protocols, and stories. |
| **`notes.jason-lab.dev`** | Z87-Linux (`http.server 9001`) | 🔐 **Auth (Cloudflare Access)** | **The Portfolio.** 18-year tactical log archive, search index, and artifact map. |
| **`acme.jason-lab.dev`** | Z87-Linux (`acme_lab.py 8765`) | 🔐 **Auth (Zero Trust WSS)** | **The API.** Secure WebSocket bridge for the resident LLM nodes (Pinky/Brain). |

---

## 📐 Architecture Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Guest as External Guest / Recruiter
    actor Admin as Authenticated Admin
    participant Airlock as GitHub Pages (www.jason-lab.dev)
    participant CF as Cloudflare Edge & Access Policy
    participant Tunnel as cloudflared Tunnel Daemon
    participant Origin as Local Origin Server (z87-Linux)

    %% Public Flow
    Guest->>Airlock: HTTP GET / (index.html)
    Airlock-->>Guest: Render Public Airlock + Static Snapshots
    Guest->>CF: Probing Fetch (notes.jason-lab.dev/data/status.json)
    alt Tunnel Active & Reachable
        CF-->>Guest: 200 OK / Response Headers
        Guest->>Airlock: Status Pill = "LAB UPLINK NOMINAL"
    else Tunnel Down / Unreachable
        CF-->>Guest: Connection Refused / 521 Error
        Guest->>Airlock: Status Pill = "LAB UPLINK OFFLINE"
    end

    %% Private Flow
    Admin->>Airlock: Click "Work Notes" (notes.jason-lab.dev)
    Airlock->>CF: Redirect to notes.jason-lab.dev
    alt Valid Cloudflare Access JWT Cookie
        CF->>Tunnel: Forward HTTP GET
        Tunnel->>Origin: http://127.0.0.1:9001
        Origin-->>Admin: Render Private Field Manual & Live Intercom
    else No Valid Auth Cookie
        CF-->>Admin: Challenge (One-Time PIN / OAuth Identity Provider)
    end
```

---

## 🔒 The "Knock" Protocol (Origin Probing)

The **Knock Protocol** (Pre-Flight Probing) allows the static public Airlock to display real-time availability of the private home lab hardware without exposing credentials or triggering CORS errors.

### Implementation Logic (`index.html`)

```javascript
const TARGET_URL = 'https://notes.jason-lab.dev/data/status.json';
const dot = document.getElementById('statusDot');
const text = document.getElementById('statusText');

async function checkStatus() {
    try {
        // Opaque probe request: mode: 'no-cors' prevents CORS failure loops
        const r = await fetch(TARGET_URL, { mode: 'no-cors' });
        dot.className = 'dot online';
        text.innerText = 'LAB UPLINK NOMINAL';
    } catch (error) {
        dot.className = 'dot offline';
        text.innerText = 'LAB UPLINK OFFLINE';
    }
}
checkStatus();
setInterval(checkStatus, 30000);
```

### Cloudflare Access Configuration for the Probe:
- **Bypass / Public Endpoint Policy:** Create a specific Cloudflare Access policy rule allowing unauthenticated `GET` requests to `/data/status.json` (or use `no-cors` pre-flight detection) while protecting `/` and all other HTML assets with One-Time PIN / Email domain policies.

---

## ⚙️ Compilation & Deployment Pipeline ("Static Synthesis")

Public pages are automatically synthesized from internal Markdown notes, sanitized to strip private tags, and published via a single master command.

```
┌───────────────────────────────┐
│ HomeLabAI/docs/Protocols.md   │
│ Portfolio_Dev/FeatureTracker  │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ build_site.py (Master Builder)│ ──► Compiles Markdown -> HTML & injects ?v=md5
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ www_deploy/sync_*.sh (Guard) │ ──► 1. Strips <mission-control> & data-scope="private"
└──────────────┬────────────────┘     2. Injects "← Return to Front Page"
               │                      3. Captures trailers (shot-scraper)
               ▼
┌───────────────────────────────┐
│ GitHub Pages (www_deploy)     │ ──► Atomic push to kEnder242.github.io
└───────────────────────────────┘
```

### Build & Deploy Execution Command:
```bash
# Run Master Builder (Compiles HTML, hashes assets, runs airlock sanitizers)
python3 field_notes/build_site.py

# Perform Git Commit & Push (handled by developer/orchestrator)
cd www_deploy && git add . && git commit -m "build(airlock): deploy static release"
```

---

## 🚀 Setup & Replication Guide (Tutorial)

Follow these steps to replicate this hybrid public/private Zero Trust architecture:

### Step 1: GitHub Pages Setup
1. Create a public repository named `username.github.io` (e.g. `kEnder242.github.io`).
2. Add your sanitized `index.html` and static assets.
3. In Repository **Settings > Pages**, set **Source** to `Deploy from a branch` (`main` / root).
4. Add custom domain (e.g. `www.jason-lab.dev`). GitHub auto-creates a `CNAME` file.

### Step 2: Cloudflare DNS Configuration
1. Point domain DNS to Cloudflare nameservers.
2. Add **CNAME** record:
   - `Type`: `CNAME`
   - `Name`: `www`
   - `Target`: `username.github.io`
   - `Proxy Status`: **Proxied (Orange Cloud)** 🟠

### Step 3: Cloudflare Zero Trust Tunnel (`cloudflared`)
1. On local host (e.g., Z87-Linux), install `cloudflared`:
   ```bash
   sudo cloudflared service install <tunnel-token>
   ```
2. In Cloudflare Zero Trust Dashboard > **Access > Tunnels**:
   - Route `notes.yourdomain.com` -> `http://localhost:9001`
   - Route `acme.yourdomain.com` -> `http://localhost:8765`

### Step 4: Split Access Policy Configuration
1. In Cloudflare Zero Trust > **Access > Applications**:
   - **App 1: Public Airlock (`www`)**: No Access policies (Public).
   - **App 2: Private Notes (`notes`)**: Policy = `Allow` email domain or specific emails via One-Time PIN (OTP).
   - **App 3: Status Probe (`notes/data/status.json`)**: Policy = `Bypass` / `Allow Everyone` for non-sensitive status pings.

---

## 📜 Repository Structure

```
www_deploy/
├── index.html            # Public Airlock Homepage & Origin Status Probe
├── protocols.html        # Sanitized Public Operational Protocols
├── research.html         # Sanitized Public Research Ledger
├── stories.html          # Sanitized Public Work Stories & Engineering History
├── sync_protocols.sh     # Airlock Sanitizer & Snapshot Generator for protocols.html
├── sync_research.sh      # Airlock Sanitizer & Snapshot Generator for research.html
├── sync_stories.sh       # Airlock Sanitizer & Snapshot Generator for stories.html
├── assets/               # High-fidelity static trailers & page snapshots
│   ├── protocols_snapshot.png
│   ├── research_snapshot.png
│   └── trailers/
└── CNAME                 # Custom domain configuration (www.jason-lab.dev)
```
