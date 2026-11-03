/**
 * Federated Silicon Benchmarks & Round Table Delta-T Engine
 * [FEAT-525] Multi-Seat Hardware Dashboard, ROI & Cumulative Stage Delta-T Telemetry
 */

let cachedData = null;
let cachedDeltas = null;

// ==============================================================================
// 1. HARDWARE & ROI BENCHMARKS LOADER
// ==============================================================================
async function loadBenchmarks() {
    try {
        const resp = await fetch('benchmarks_cache.json?t=' + Date.now());
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        cachedData = await resp.json();
        
        renderAll(cachedData.results || []);
        await loadLiveUsageStream();
        await loadCumulativeTelemetry();
    } catch (e) {
        console.warn("[Benchmarks] Telemetry cache unreachable:", e);
        renderAll([]);
        await loadLiveUsageStream();
        await loadCumulativeTelemetry();
    }
        await initDeltaTView();
        await loadDelegationRuns();
    }

function renderAll(results) {
    renderSeatCards(results);
    renderBars(results);
}

function renderSeatCards(results) {
    const container = document.getElementById('seat-cards-container');
    if (!container) return;
    
    let html = '';
    results.forEach(r => {
        const isOnline = r.status === 'online';
        const statusClass = isOnline ? 'status-online' : 'status-offline';
        const statusText = isOnline ? 'ONLINE' : 'OFFLINE / SLEEP';
        const modelText = (r.model !== null && r.model !== undefined) ? r.model : '--';
        const ctxText = (r.context_window && r.context_window !== 'null') ? r.context_window : '--';
        const tpText = (typeof r.throughput === 'number' && isOnline) ? r.throughput.toFixed(1) + ' tok/s' : '--';
        const ttftText = (typeof r.warm_ttft_ms === 'number' && isOnline) ? r.warm_ttft_ms.toFixed(0) + ' ms' : '--';
        const nameClean = r.display_name.split(' (')[0];
        const powerText = (r.power_watts !== null && r.power_watts !== undefined) ? r.power_watts.toFixed(0) + 'W' : 'N/A (Cloud Hosted)';
        html += `
            <div class="seat-card">
                <div class="seat-header">
                    <div>
                        <h3 class="seat-title">${nameClean}</h3>
                        <div class="seat-subtitle">${r.architecture}</div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Resident Model:</span>
                    <span class="stat-value" style="color:#58a6ff;">${modelText}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Context Window:</span>
                    <span class="stat-value" style="color:#d2a8ff;">${ctxText}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Target Role:</span>
                    <span class="stat-value">${r.role}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Throughput:</span>
                    <span class="stat-value" style="color:#3fb950;">${tpText}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Warm TTFT:</span>
                    <span class="stat-value">${ttftText}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Power Draw:</span>
                    <span class="stat-value" style="color:#e3b341;">${powerText}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderBars(results) {
    const throughputContainer = document.getElementById('throughput-bars');
    const ttftContainer = document.getElementById('ttft-bars');
    const tokensJouleContainer = document.getElementById('tokens-joule-bars');
    const roiMultipliersContainer = document.getElementById('roi-multipliers-bars');
    const reasoningContainer = document.getElementById('reasoning-bars');

    const maxThroughput = Math.max(...results.map(r => r.throughput), 50);
    const maxTtft = Math.max(...results.map(r => r.warm_ttft_ms), 1500);
    const validTokensJoule = results.map(r => r.tokens_per_joule).filter(v => v !== null && v !== undefined);
    const maxTokJoule = validTokensJoule.length > 0 ? Math.max(...validTokensJoule, 1.0) : 1.0;

    // 1. Throughput Bars
    if (throughputContainer) {
        let tpHtml = '';
        results.forEach(r => {
            const pct = (r.throughput / maxThroughput) * 100;
            tpHtml += `
                <div class="bar-row">
                    <div class="bar-label">${r.display_name.split(' (')[0]}</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill" style="width:${pct}%; background:#3fb950;"></div>
                    </div>
                    <div class="bar-value">${r.throughput.toFixed(1)} tok/s</div>
                </div>
            `;
        });
        throughputContainer.innerHTML = tpHtml;
    }

    // 2. TTFT Bars
    if (ttftContainer) {
        let ttftHtml = '';
        results.forEach(r => {
            const pct = (r.warm_ttft_ms / maxTtft) * 100;
            ttftHtml += `
                <div class="bar-row">
                    <div class="bar-label">${r.display_name.split(' (')[0]}</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill" style="width:${pct}%; background:#58a6ff;"></div>
                    </div>
                    <div class="bar-value">${r.warm_ttft_ms.toFixed(0)} ms</div>
                </div>
            `;
        });
        ttftContainer.innerHTML = ttftHtml;
    }

    // 3. Tokens per Joule Bars
    if (tokensJouleContainer) {
        let tjHtml = '';
        results.forEach(r => {
            const isCloud = (r.power_watts === null || r.tokens_per_joule === null);
            const tjVal = isCloud ? 'N/A (Offloaded)' : r.tokens_per_joule.toFixed(3) + ' Tok/J';
            const pct = (!isCloud && r.tokens_per_joule > 0) ? (r.tokens_per_joule / maxTokJoule) * 100 : 2;
            const color = isCloud ? '#30363d' : (r.tokens_per_joule >= 0.7 ? '#3fb950' : (r.tokens_per_joule >= 0.3 ? '#58a6ff' : '#e3b341'));
            tjHtml += `
                <div class="bar-row">
                    <div class="bar-label">${r.display_name.split(' (')[0]}</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill" style="width:${pct}%; background:${color};"></div>
                    </div>
                    <div class="bar-value">${tjVal}</div>
                </div>
            `;
        });
        tokensJouleContainer.innerHTML = tjHtml;
    }

    // 4. ROI Multipliers Bars
    if (roiMultipliersContainer) {
        const validMultipliers = results.map(r => r.cloud_multiplier).filter(m => m !== null && m !== undefined);
        const maxMultiplier = validMultipliers.length > 0 ? Math.max(...validMultipliers, 10.0) : 10.0;

        let roiHtml = '';
        results.forEach(r => {
            const isCloud = (r.electricity_cost_per_1m === null);
            const costVal = isCloud ? 'Cloud Baseline ($3.00)' : '$' + r.electricity_cost_per_1m.toFixed(4) + ' (' + r.cloud_multiplier + 'x)';
            const multiplier = isCloud ? 1.0 : (r.cloud_multiplier || 1.0);
            const pct = Math.max(3, (multiplier / maxMultiplier) * 100);
            const color = isCloud ? '#30363d' : (multiplier >= 50 ? '#3fb950' : (multiplier >= 25 ? '#58a6ff' : '#e3b341'));
            roiHtml += `
                <div class="bar-row">
                    <div class="bar-label">${r.display_name.split(' (')[0]}</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill" style="width:${pct}%; background:${color};"></div>
                    </div>
                    <div class="bar-value" style="width:200px;">${costVal}</div>
                </div>
            `;
        });
        roiMultipliersContainer.innerHTML = roiHtml;
    }

    // 5. Reasoning CoT Depth Bars
    if (reasoningContainer) {
        let reasoningHtml = '';
        results.forEach(r => {
            const pct = (r.reasoning_token_ratio || 0.1) * 100;
            reasoningHtml += `
                <div class="bar-row">
                    <div class="bar-label">${r.display_name.split(' (')[0]} (${r.model})</div>
                    <div class="bar-wrapper">
                        <div class="bar-fill" style="width:${pct}%; background:#d2a8ff;"></div>
                    </div>
                    <div class="bar-value">${pct.toFixed(0)}% CoT Depth</div>
                </div>
            `;
        });
        reasoningContainer.innerHTML = reasoningHtml;
    }
}

function renderThroughputLiveChart(records) {
    const canvas = document.getElementById('throughput-live-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background reset
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    const SEAT_COLORS = {
        'Windows 4090RTX': '#58a6ff',
        'Linux 2080ti': '#3fb950',
        'Apple M5 Air': '#bc8cff',
        'Cloud Swarm': '#f778ba'
    };
    const SEAT_LABELS = {
        'Windows 4090RTX': 'Kender 4090',
        'Linux 2080ti': '2080 Ti',
        'Apple M5 Air': 'M5 Air',
        'Cloud Swarm': 'Cloud'
    };
    const colorFor = (seat) => SEAT_COLORS[seat] || '#8b949e';
    const labelFor = (seat) => SEAT_LABELS[seat] || seat || 'Unknown';

    // Filter valid receipts with true hardware throughput (Metric 1)
    const validRecords = (Array.isArray(records) ? records : []).filter(r => {
        const dur = Number(r.duration_seconds);
        const tp = (r.throughput_tok_s !== null && r.throughput_tok_s !== undefined) ? Number(r.throughput_tok_s) : NaN;
        const ts = Number(r.timestamp);
        return isFinite(tp) && tp > 0 && tp <= 1000.0 && isFinite(dur) && dur >= 1.0 && isFinite(ts) && ts > 0;
    });

    if (!validRecords.length) {
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ No live throughput telemetry recorded yet. Awaiting workload dispatches.', width / 2, height / 2);
        return;
    }

    validRecords.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // Full empirical timeline starting from 2026-08-31 across all recorded receipts
    const bySeat = {};
    validRecords.forEach(r => {
        const seat = r.seat || 'Unknown';
        if (!bySeat[seat]) bySeat[seat] = [];
        bySeat[seat].push(r);
    });
    const seatNames = Object.keys(bySeat);

    const padLeft = 70;
    const padRight = 50;
    const padTop = 40;
    const padBottom = 45;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const maxVal = Math.max(10, ...validRecords.map(r => Number(r.throughput_tok_s) || 0)) * 1.25;
    const minTime = Math.min(...validRecords.map(r => Number(r.timestamp)));
    const maxTime = Math.max(...validRecords.map(r => Number(r.timestamp)));
    const timeSpan = maxTime - minTime;

    const getX = (ts) => padLeft + (timeSpan > 0 ? ((ts - minTime) / timeSpan) * chartW : chartW / 2);
    const getY = (val) => padTop + chartH - (val / maxVal) * chartH;

    // Horizontal grid + Y labels (tok/s)
    const ySteps = 4;
    ctx.lineWidth = 1;
    for (let i = 0; i <= ySteps; i++) {
        const val = (maxVal / ySteps) * i;
        const y = getY(val);
        ctx.strokeStyle = '#1f242c';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(1), padLeft - 10, y + 3);
    }

    // Universal Timeline X ticks & gridlines
    const timeSteps = 5;
    for (let i = 0; i <= timeSteps; i++) {
        const curTs = minTime + (timeSpan > 0 ? (timeSpan * i) / timeSteps : 0);
        const x = padLeft + (i / timeSteps) * chartW;
        ctx.strokeStyle = '#161b22';
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, height - padBottom);
        ctx.stroke();

        const d = new Date(curTs * 1000);
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const hr = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const dateLabel = `${mo}/${da} ${hr}:${mi}`;

        ctx.fillStyle = '#8b949e';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dateLabel, x, height - padBottom + 18);
    }

    // Per-seat lines + points + value badges (all overlaid across universal time axis)
    seatNames.forEach(seat => {
        const pts = bySeat[seat];
        const color = colorFor(seat);

        // Multi-point series line connecting points chronologically
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        pts.forEach((r, idx) => {
            const x = getX(Number(r.timestamp));
            const y = getY(Number(r.throughput_tok_s));
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Dots on each sample point
        pts.forEach(r => {
            const x = getX(Number(r.timestamp));
            const val = Number(r.throughput_tok_s);
            const y = getY(val);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0d1117';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // Value badge above the latest point(s) of this seat
        const seatPts = pts.slice(-2);
        seatPts.forEach(r => {
            const x = getX(Number(r.timestamp));
            const y = getY(Number(r.throughput_tok_s));
            ctx.fillStyle = color;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(Number(r.throughput_tok_s).toFixed(1), x, y - 8);
        });
    });

    ctx.fillStyle = '#8b949e';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('▲ Live Throughput (tok/s)', padLeft, padTop - 12);
    ctx.textAlign = 'right';
    ctx.fillText('Universal Timeline (Chronological) ►', width - padRight, height - padBottom + 34);
}

async function loadLiveUsageStream() {
    const container = document.getElementById('live-usage-container');
    if (!container) return;

    try {
        const resp = await fetch('data/live_usage_stream.jsonl?t=' + Date.now());
        if (!resp.ok) {
            container.innerHTML = '<div style="font-family:monospace; font-size:0.75rem; color:#8b949e;">Live usage stream initialized. Awaiting workload dispatches...</div>';
            return;
        }
        const text = await resp.text();
        const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) {
            container.innerHTML = '<div style="font-family:monospace; font-size:0.75rem; color:#8b949e;">Live usage stream initialized. Awaiting workload dispatches...</div>';
            return;
        }

        const allRecords = lines.map(l => {
            try { return JSON.parse(l); } catch(e) { return null; }
        }).filter(r => r !== null && Number(r.duration_seconds) >= 1.0);
        window.cachedLiveRecords = allRecords;
        renderThroughputLiveChart(allRecords);

        const records = [...allRecords].reverse();
        let tableHtml = '<div style="overflow-x:auto;"><table class="live-stream-table" style="margin:0;"><thead><tr><th style="background:#0d1117;">Timestamp</th><th style="background:#0d1117;">Tier</th><th style="background:#0d1117;">Seat</th><th style="background:#0d1117;">Task / Story</th><th style="background:#0d1117;">Model</th><th style="background:#0d1117; text-align:right;">Output Tokens</th><th style="background:#0d1117; text-align:right;">Duration</th><th style="background:#0d1117; text-align:right;">Throughput</th></tr></thead><tbody>';
        records.forEach(r => {
            const timeStr = r.date_str ? r.date_str : (r.timestamp ? new Date(r.timestamp * 1000).toLocaleString() : 'N/A');
            const isLocal = (r.tier === 'sovereign_local') || (r.seat && !r.seat.includes('Cloud') && r.provider !== 'openrouter');
            const tierBadge = isLocal 
                ? '<span style="display:inline-block; padding:2px 6px; font-size:0.68rem; font-weight:700; border-radius:4px; background:#1b4728; color:#3fb950; border:1px solid #238636;">LOCAL</span>'
                : '<span style="display:inline-block; padding:2px 6px; font-size:0.68rem; font-weight:700; border-radius:4px; background:#382714; color:#f78166; border:1px solid #bd561d;">CLOUD</span>';
            const seatBadge = r.seat || (r.provider === 'openrouter' ? 'Cloud Swarm' : (r.provider.includes('m5') ? 'Apple M5 Air' : 'Windows 4090RTX'));
            const hasValidTp = (r.throughput_tok_s !== null && r.throughput_tok_s !== undefined && isFinite(Number(r.throughput_tok_s)) && Number(r.throughput_tok_s) > 0);
            const tpDisplay = hasValidTp
                ? `<span style="font-weight:700; color:#3fb950;">${Number(r.throughput_tok_s).toFixed(1)} tok/s</span>`
                : '<span style="color:#8b949e; font-weight:400;">— (N/A)</span>';
            tableHtml += '<tr>' +
                '<td style="color:#8b949e;">' + timeStr + '</td>' +
                '<td>' + tierBadge + '</td>' +
                '<td style="font-weight:700; color:#58a6ff;">' + seatBadge + '</td>' +
                '<td style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (r.task_title || r.source) + '</td>' +
                '<td style="color:#d2a8ff;">' + r.model + '</td>' +
                '<td style="text-align:right;">' + r.tokens_generated + '</td>' +
                '<td style="text-align:right;">' + r.duration_seconds + 's</td>' +
                '<td style="text-align:right;">' + tpDisplay + '</td>' +
            '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        container.innerHTML = tableHtml;
    } catch (e) {
        container.innerHTML = '<div style="font-family:monospace; font-size:0.75rem; color:#8b949e;">Live usage stream initialized. Awaiting workload dispatches...</div>';
    }
}

async function loadCumulativeTelemetry() {
    try {
        const resp = await fetch('data/cumulative_tokens.json?t=' + Date.now());
        if (!resp.ok) return;
        const data = await resp.json();

        const tokensEl = document.getElementById('realizedTokensVal');
        const apiEl = document.getElementById('realizedApiCostVal');
        const powerEl = document.getElementById('realizedPowerCostVal');
        const savingsEl = document.getElementById('realizedSavingsVal');
        const pctEl = document.getElementById('realizedPctVal');
        const syncEl = document.getElementById('realized-sync-time');

        if (tokensEl) {
            const toks = data.lifetime_tokens_generated || 0;
            tokensEl.textContent = toks >= 1000000 ? (toks / 1000000).toFixed(2) + ' MTok' : toks.toLocaleString() + ' tok';
        }
        if (apiEl) apiEl.textContent = '$' + (data.commercial_api_cost_usd || 0).toFixed(2);
        if (powerEl) powerEl.textContent = '$' + (data.actual_electricity_cost_usd || 0).toFixed(4);
        if (savingsEl) savingsEl.textContent = '$' + (data.net_dollars_saved_usd || 0).toFixed(2);
        if (pctEl) pctEl.textContent = (data.percent_saved || 100.0).toFixed(1) + '% Reduction';
        if (syncEl && data.last_updated) syncEl.textContent = 'Last Activity: ' + data.last_updated;
    } catch (e) {
        console.error(e);
    }
}

// ==============================================================================
// SHARED EXPANDABLE DRAWER HELPER [STORY 102.22]
// ==============================================================================
// Standardizes the <details class="feature-details"> boilerplate shared by the
// blackboard ledger turn drawers and the batch scans ledger drawer.
// options: { id: string, open: boolean, summaryHtml: string, contentHtml: string }
function createExpandableDrawer(options) {
    const details = document.createElement('details');
    details.className = 'feature-details';
    if (options.id) details.id = options.id;
    if (options.open) details.setAttribute('open', '');
    details.innerHTML = `
        <summary${options.summaryStyle ? ` ${options.summaryStyle}` : ''}>
            ${options.summaryHtml}
        </summary>
        <div class="details-content" style="${options.contentBorder || ''}">
            ${options.contentHtml}
        </div>
    `;
    return details;
}

// ==============================================================================
// 2. ROUND TABLE DELTA-T & BLACKBOARD LEDGER ENGINE [FEAT-525]
// ==============================================================================
async function loadDeltaTData() {
    if (cachedDeltas) return cachedDeltas;
    try {
        const resp = await fetch('data/round_table_deltas.json?t=' + Date.now());
        if (resp.ok) {
            cachedDeltas = await resp.json();
            return cachedDeltas;
        }
    } catch (e) {
        console.warn("[Delta-T] Telemetry ledger fetch failed:", e);
    }
    cachedDeltas = [];
    return cachedDeltas;
}

function renderDeltaTChart(data) {
    const canvas = document.getElementById('delta-t-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background reset
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    if (!data || data.length === 0) {
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ No live Round Table telemetry turns recorded yet. Run live deliberation to stream data.', width / 2, height / 2);
        return;
    }

    const padLeft = 70;
    const padRight = 50;
    const padTop = 40;
    const padBottom = 55;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Calculate Y-max from highest total_elapsed_s
    const maxVal = Math.max(1.5, ...data.map(d => d.total_elapsed_s || d.total_s || (d.checkpoints_elapsed_s && d.checkpoints_elapsed_s.pinky_judgment) || (d.cumulative && d.cumulative.pinky_judgment) || 1.0)) * 1.25;

    // Horizontal grid lines (Time in seconds)
    const ySteps = 4;
    ctx.lineWidth = 1;
    for (let i = 0; i <= ySteps; i++) {
        const val = (maxVal / ySteps) * i;
        const y = padTop + chartH - (val / maxVal) * chartH;
        
        ctx.strokeStyle = '#1f242c';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#8b949e';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${val.toFixed(2)}s`, padLeft - 10, y + 3);
    }

    const series = [
        { key: 'triage', name: 'Δt1: Triage', color: '#58a6ff' },
        { key: 'pinky_stance', name: 'Δt2: Pinky', color: '#f778ba' },
        { key: 'brain_arch', name: 'Δt3: Brain', color: '#f85149' },
        { key: 'oracle', name: 'Δt4: Oracle', color: '#bc8cff' },
        { key: 'pinky_judgment', name: 'Δt5: Judgment', color: '#3fb950' }
    ];

    const numTurns = data.length;
    const getX = (idx) => padLeft + (numTurns > 1 ? (idx / (numTurns - 1)) * chartW : chartW / 2);
    const getY = (val) => padTop + chartH - (val / maxVal) * chartH;

    // Vertical turn grid lines & Turn labels
    data.forEach((turnData, idx) => {
        const x = getX(idx);
        ctx.strokeStyle = '#1a202c';
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + chartH);
        ctx.stroke();

        // X-axis label (Turn Integer)
        ctx.fillStyle = '#c9d1d9';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(turnData.turn, x, height - padBottom + 18);
    });

    // Draw Monotonic Elapsed Lines from top (Judgment) down to bottom (Triage)
    series.slice().reverse().forEach(s => {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        data.forEach((d, idx) => {
            const x = getX(idx);
            const checkpoints = d.checkpoints_elapsed_s || d.cumulative || {};
            const val = checkpoints[s.key] || 0;
            const y = getY(val);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Plot points & badges
        data.forEach((d, idx) => {
            const x = getX(idx);
            const checkpoints = d.checkpoints_elapsed_s || d.cumulative || {};
            const val = checkpoints[s.key] || 0;
            const y = getY(val);

            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#0d1117';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Total elapsed duration badge at Judgment level
            if (s.key === 'pinky_judgment') {
                ctx.fillStyle = '#3fb950';
                ctx.font = 'bold 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                const totalElapsed = d.total_elapsed_s || d.total_s || val;
                ctx.fillText(`${totalElapsed.toFixed(3)}s`, x, y - 9);
            }
        });
    });

    // Axis titles
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('▲ Live Elapsed Time (s)', padLeft, padTop - 12);
    ctx.textAlign = 'right';
    ctx.fillText('Turn Sequence (Chronological) ►', width - padRight, height - padBottom + 45);
}

function renderSwarmTokenChart(runs) {
    const canvas = document.getElementById('swarm-token-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background reset
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    const classify = (r) => {
        const mode = String(r.mode || '').toLowerCase();
        const tier = String(r.tier || '').toUpperCase();
        if (mode === 'local' || tier.includes('LOCAL')) return 'local';
        if (mode === 'agy' || tier.includes('AGY') || tier.includes('PRIMARY')) return 'agy';
        if (mode === 'cloud' || mode === 'oracle' || tier.includes('CLOUD') || tier.includes('ORACLE') || tier.includes('HYBRID')) return 'cloud_oracle';
        return null;
    };

    const agg = {};
    (Array.isArray(runs) ? runs : []).forEach(r => {
        const rawS = (r.sprint && String(r.sprint).trim()) ? String(r.sprint).trim() : '';
        const cleanS = rawS.replace(/^SPR_/i, '').trim();
        if (!cleanS || cleanS === '0' || cleanS === '000') return;
        const tierKey = classify(r);
        if (!tierKey) return;
        const tok = Number((r.tokens && r.tokens.total) || 0);
        if (!agg[cleanS]) agg[cleanS] = { local: 0, agy: 0, cloud_oracle: 0 };
        agg[cleanS][tierKey] += tok;
    });

    const sprints = Object.keys(agg).sort((a, b) => Number(a) - Number(b));
    if (!sprints.length) {
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🐝 No swarm token telemetry recorded yet.', width / 2, height / 2);
        return;
    }

    const padLeft = 70;
    const padRight = 50;
    const padTop = 40;
    const padBottom = 45;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const maxVal = Math.max(1000, ...sprints.flatMap(s => Object.values(agg[s]))) * 1.25;
    const fmt = (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v.toFixed(0));

    const ySteps = 4;
    ctx.lineWidth = 1;
    for (let i = 0; i <= ySteps; i++) {
        const val = (maxVal / ySteps) * i;
        const y = padTop + chartH - (val / maxVal) * chartH;
        ctx.strokeStyle = '#1f242c';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(fmt(val), padLeft - 10, y + 3);
    }

    const series = [
        { key: 'cloud_oracle', color: '#f778ba' },
        { key: 'agy', color: '#bc8cff' },
        { key: 'local', color: '#3fb950' }
    ];

    const n = sprints.length;
    const getX = (idx) => padLeft + (n > 1 ? (idx / (n - 1)) * chartW : chartW / 2);
    const getY = (val) => padTop + chartH - (val / maxVal) * chartH;

    sprints.forEach((s, idx) => {
        const x = getX(idx);
        ctx.strokeStyle = '#1a202c';
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + chartH);
        ctx.stroke();
        ctx.fillStyle = '#c9d1d9';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s, x, height - padBottom + 18);
    });

    series.forEach(s => {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        sprints.forEach((sp, idx) => {
            const x = getX(idx);
            const y = getY(agg[sp][s.key]);
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        sprints.forEach((sp, idx) => {
            const x = getX(idx);
            const val = agg[sp][s.key];
            const y = getY(val);
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0d1117';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = s.color;
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            if (val > 0) ctx.fillText(Number(val).toLocaleString(), x, y - 9);
        });
    });

    ctx.fillStyle = '#8b949e';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('▲ Total Tokens per Sprint (by Tier)', padLeft, padTop - 12);
    ctx.textAlign = 'right';
    ctx.fillText('Sprint Sequence (Chronological) ►', width - padRight, height - padBottom + 34);
}

function formatTurnDate(ts, timeStr) {
    if (!ts) return timeStr || '';
    const d = new Date(ts > 1e11 ? ts : ts * 1000);
    if (isNaN(d.getTime())) return timeStr || '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function renderBlackboardLedger(data) {
    const container = document.getElementById('blackboard-ledger-container');
    if (!container) return;

    container.innerHTML = '';
    const liveRecords = window.cachedLiveRecords || [];

    // [Item 11] Render latest turn first (reverse chronological)
    const reversedData = Array.isArray(data) ? data.slice().reverse() : [];
    reversedData.forEach((turn, idx) => {
        const checkpoints = turn.checkpoints_elapsed_s || turn.cumulative || {};
        const deltas = turn.deltas_elapsed_s || turn.deltas || {};
        const deltaSummary = `Δt1: ${((deltas.triage || 0) * 1000).toFixed(0)}ms | Δt2: ${((deltas.pinky_stance || 0) * 1000).toFixed(0)}ms | Δt3: ${((deltas.brain_arch || 0) * 1000).toFixed(0)}ms | Δt4: ${((deltas.oracle || 0) * 1000).toFixed(0)}ms | Δt5: ${((deltas.pinky_judgment || 0) * 1000).toFixed(0)}ms`;
        const elapsedSummary = `t1: ${(checkpoints.triage || 0).toFixed(2)}s → t2: ${(checkpoints.pinky_stance || 0).toFixed(2)}s → t3: ${(checkpoints.brain_arch || 0).toFixed(2)}s → t4: ${(checkpoints.oracle || 0).toFixed(2)}s → t5: ${(turn.total_elapsed_s || turn.total_s || 0).toFixed(2)}s`;

        // Find nested subagent dispatches for this turn
        const matchingDispatches = liveRecords.filter(r => r.turn === turn.turn || r.turn_id === turn.turn);
        let subagentTableHtml = '';
        if (matchingDispatches.length > 0) {
            subagentTableHtml = `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #1f242c;">
                    <span class="field-label" style="color:#bc8cff;">Nested Subagent Dispatches (Turn Workload Stream)</span>
                    <table class="live-stream-table" style="margin-top: 6px; font-size: 0.72rem;">
                        <thead>
                            <tr>
                                <th>Role / Agent</th>
                                <th>Seat</th>
                                <th>Model</th>
                                <th style="text-align:right;">Tokens</th>
                                <th style="text-align:right;">Duration</th>
                                <th style="text-align:right;">Tok/s</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matchingDispatches.map(d => `
                                <tr>
                                    <td style="font-weight:600; color:#58a6ff;">${d.agent || d.role || 'subagent'}</td>
                                    <td>${d.seat || 'Kender 4090'}</td>
                                    <td style="color:#d2a8ff;">${d.model || ''}</td>
                                    <td style="text-align:right;">${d.tokens_generated || 0}</td>
                                    <td style="text-align:right;">${d.duration_seconds || 0}s</td>
                                    <td style="text-align:right; font-weight:700; color:#3fb950;">${d.throughput_tok_s || 0} tok/s</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const dateStr = formatTurnDate(turn.timestamp, turn.time_str);
        const durSec = ((turn.total_elapsed_s || turn.total_s || 0)).toFixed(2);
        const promptPreview = turn.user_prompt ? turn.user_prompt.slice(0, 75) + (turn.user_prompt.length > 75 ? '...' : '') : (turn.topic || 'ROUND_TABLE_DELIBERATION');
        const details = createExpandableDrawer({ id: `turn-${turn.turn}`, open: idx === 0, summaryStyle: 'style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;"', summaryHtml: `
                <span style="color:#8b949e; font-family:'JetBrains Mono',monospace; font-size:0.75rem;">${dateStr}</span>
                <span style="color:#58a6ff; font-family:'JetBrains Mono',monospace; font-weight:600; font-size:0.78rem;">TURN ${turn.turn}</span>
                <span style="color:#f0f3f6; font-weight:500; max-width:520px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${(turn.user_prompt || '').replace(/"/g, '&quot;')}">
                    💬 ${promptPreview}
                </span>
                <span style="color:#8b949e; font-size:0.75rem; margin-left:auto; font-family:'JetBrains Mono',monospace;">
                    <strong style="color:#3fb950;">${durSec}s</strong>
                </span>`, contentBorder: 'border-left: 3px solid #3fb950; ', contentHtml: `
                ${turn.user_prompt ? `
                <div style="margin-bottom: 10px; padding: 6px 12px; background: rgba(88, 166, 255, 0.08); border-left: 3px solid #58a6ff; border-radius: 4px;">
                    <span class="field-label" style="color:#58a6ff; font-size:0.68rem; text-transform:uppercase;">User Prompt</span>
                    <div style="color:#e6edf3; font-size:0.85rem; font-family:var(--font-stack); margin-top:2px;">${turn.user_prompt}</div>
                </div>` : ''}
                <div style="margin-bottom: 8px;">
                    <span class="field-label" style="color:#58a6ff;">Distillation Bullets</span>
                    <div class="feature-body">
                        <ul>
                            ${(turn.distillation_bullets || []).map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div style="margin-bottom: 8px;">
                    <span class="field-label" style="color:#3fb950;">1-Line Consensus</span>
                    <div class="feature-body" style="color:#3fb950; font-weight: 500;">
                        <p>${turn.consensus_1liner || 'Consensus nominal.'}</p>
                    </div>
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #1f242c;">
                    <span class="field-label" style="color:#8b949e;">Live Elapsed Checkpoints ($t_1 \\rightarrow t_5$)</span>
                    <div class="feature-body" style="font-size:0.75rem; color:#c9d1d9; font-family:'JetBrains Mono',monospace; margin-bottom: 4px;">
                        ${elapsedSummary}
                    </div>
                    <span class="field-label" style="color:#8b949e; font-size:0.7rem;">Isolated Stage Durations (&Delta;t)</span>
                    <div class="feature-body" style="font-size:0.75rem; color:#8b949e; font-family:'JetBrains Mono',monospace;">
                        ${deltaSummary} &bull; <strong>Total Turn Elapsed: ${((turn.total_elapsed_s || turn.total_s) * 1000).toFixed(0)}ms</strong> <span style="color:#3fb950; margin-left:6px;">(Full 5-Stage Silicon Deliberation)</span>
                    </div>
                </div>
                ${subagentTableHtml}
            `});
        container.appendChild(details);
    });

    // Render [BATCH] Card for non-interactive / background scans
    const batchRecords = liveRecords.filter(r => r.is_batch || (r.source && (r.source.includes('mass_scan') || r.source.includes('refine_gem') || r.source.includes('NIGHTLY_REFINEMENT'))));
    if (batchRecords.length > 0) {
        const batchDetails = createExpandableDrawer({ id: 'batch-scans-ledger', summaryHtml: `
                <span class="badge" style="background:#382714; color:#f78166; border:1px solid #bd561d; margin-right:8px;">[BATCH]</span>
                <span style="color:#f0f3f6; font-weight:600;">NIGHTLY_REFINEMENT & ARCHIVE SCANS</span>
                <span style="color:#8b949e; font-size:0.75rem; margin-left:auto; font-family:'JetBrains Mono',monospace;">
                    ${batchRecords.length} batch job(s)
                </span>`, contentBorder: 'border-left: 3px solid #f78166; ', contentHtml: `
                <table class="live-stream-table" style="margin-top: 6px; font-size: 0.72rem;">
                    <thead>
                        <tr>
                            <th>Job / Source</th>
                            <th>Seat</th>
                            <th>Model</th>
                            <th style="text-align:right;">Tokens</th>
                            <th style="text-align:right;">Duration</th>
                            <th style="text-align:right;">Tok/s</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${batchRecords.map(b => `
                            <tr>
                                <td style="font-weight:600; color:#f78166;">${b.source || b.task_title || 'NIGHTLY_REFINEMENT'}</td>
                                <td>${b.seat || 'Kender 4090'}</td>
                                <td style="color:#d2a8ff;">${b.model || ''}</td>
                                <td style="text-align:right;">${b.tokens_generated || 0}</td>
                                <td style="text-align:right;">${b.duration_seconds || 0}s</td>
                                <td style="text-align:right; font-weight:700; color:#3fb950;">${b.throughput_tok_s || 0} tok/s</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `});
        container.appendChild(batchDetails);
    }
}

async function initDeltaTView() {
    const data = await loadDeltaTData();
    renderDeltaTChart(data);
    renderBlackboardLedger(data);
}

// Attach initial page loader
window.addEventListener('DOMContentLoaded', loadBenchmarks);

// ===================== SWARM DELEGATION & SOVEREIGN GAINS (STORY 101.15) =====================
let delegationRuns = [];
let delegationFilter = 'all';

async function loadDelegationRuns() {
    try {
        const resp = await fetch('data/delegation_runs.json?t=' + Date.now());
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        delegationRuns = data.runs || [];
        window.cachedDelegationRuns = delegationRuns;
        renderDelegationSummary(data.summary || {});
        renderDelegationFilters(delegationRuns);
        renderSwarmTokenChart(delegationRuns);
        renderDelegationRuns(delegationRuns, delegationFilter);
    } catch (e) {
        console.warn('[Benchmarks] Delegation runs unreachable:', e);
        const tbody = document.getElementById('delegation-runs-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#6a737d;">Delegation ledger offline (standby)</td></tr>';
    }
}

function renderDelegationSummary(s) {
    const tokensEl = document.getElementById('delg-tokens-val');
    const savingsEl = document.getElementById('delg-savings-val');
    const offloadEl = document.getElementById('delg-offload-val');
    const wallEl = document.getElementById('delg-walltime-val');
    if (tokensEl) tokensEl.textContent = (s.total_tokens_blended != null) ? Number(s.total_tokens_blended).toLocaleString() : '--';
    if (savingsEl) savingsEl.textContent = (s.net_savings_usd != null) ? '$' + Number(s.net_savings_usd).toFixed(2) : '--';
    if (offloadEl) offloadEl.textContent = (s.local_offload_ratio_pct != null) ? Number(s.local_offload_ratio_pct).toFixed(2) + '%' : '--';
    if (wallEl) wallEl.textContent = (s.total_wall_time_minutes != null) ? Number(s.total_wall_time_minutes).toFixed(0) + ' min' : '--';
}

function renderDelegationFilters(runs) {
    const row = document.getElementById('delegation-sprint-filter');
    if (!row) return;
    const sel = row.querySelector('select#delegation-sprint-select');
    if (!sel) return;
    const counts = {};
    runs.forEach(r => {
        const k = (r.sprint && r.sprint.trim()) ? r.sprint.trim() : '(none)';
        counts[k] = (counts[k] || 0) + 1;
    });
    const sprints = Object.keys(counts).sort((a, b) => b.localeCompare(a));
    let html = '<option value="all">All Sprints (' + runs.length + ')</option>';
    sprints.forEach(s => {
        const label = (s === '(none)') ? 'No Sprint' : ('Sprint ' + s);
        const val = (s === '(none)') ? '(none)' : s;
        html += '<option value="' + val + '">' + label + ' (' + counts[s] + ')</option>';
    });
    sel.innerHTML = html;
}

function filterDelegationRuns(sprint) {
    delegationFilter = (sprint === 'all') ? 'all' : sprint;
    renderDelegationFilters(delegationRuns);
    renderDelegationRuns(delegationRuns, delegationFilter);
}

function classifySwarmStatus(r) {
    const status = r.status || '';
    if (status === 'DISPATCH_FAILED' || status === 'API_ERROR' || status === 'FAILURE') return 'ABORTED';
    if (r.verification_passed === true) return 'CERTIFIED';
    if (status === 'VERIFICATION_FAILED' || status === 'COMPLETED_UNVERIFIED' || status === 'BLOCKER_HALT' || status === 'ESCALATED') return 'ESCALATED';
    return 'ESCALATED';
}
function statusBadge(status, run) {
    const state = classifySwarmStatus(run || { status: status, verification_passed: false });
    const lex = {
        'CERTIFIED': { c: '#3fb950', icon: '\u2714', label: 'CERTIFIED' },
        'ESCALATED': { c: '#58a6ff', icon: '\u2B06', label: 'ESCALATED' },
        'ABORTED':   { c: '#f85149', icon: '\u2718', label: 'ABORTED' }
    };
    const L = lex[state];
    return '<span style="color:' + L.c + '; font-family:\'JetBrains Mono\', monospace; font-size:0.75rem;">' + L.icon + ' ' + L.label + '</span>';
}

function formatTier(r) {
    const t = String(r.tier || r.mode || '—').toUpperCase();
    if (t.includes('LOCAL')) return '<span style="color:#3fb950; font-weight:600;">LOCAL</span>';
    if (t.includes('AGY') || t.includes('PRIMARY')) return '<span style="color:#bc8cff; font-weight:600;">PRIMARY</span>';
    if (t.includes('ORACLE') || t === 'ORACLE') return '<span style="color:#f778ba; font-weight:600;">ORACLE</span>';
    if (t.includes('CLOUD')) return '<span style="color:#58a6ff; font-weight:600;">CLOUD</span>';
    return '<span style="color:#8b949e;">' + (r.tier || r.mode || '—') + '</span>';
}

function renderDelegationRuns(runs, filter) {
    const tbody = document.getElementById('delegation-runs-tbody');
    if (!tbody) return;
    const filtered = (filter === 'all') ? runs : runs.filter(r => ((r.sprint && r.sprint.trim()) || '(none)') === filter);
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#6a737d;">No runs for this filter</td></tr>';
        return;
    }
    let html = '';
    filtered.forEach(r => {
        const idx = r;
        const t = r.tokens || {};
        const totalTok = (t.total != null) ? Number(t.total).toLocaleString() : '--';
        const dur = (r.duration_m != null && r.duration_m > 0) ? Number(r.duration_m).toFixed(1) + 'm' : ((r.duration_s != null) ? Number(r.duration_s).toFixed(0) + 's' : '--');
        const verified = r.verification_passed ? '<span style="color:#3fb950;">✔</span>' : '<span style="color:#f85149;">✘</span>';
        const title = r.title ? r.title : (r.story ? r.story : '—');
        const sprintCell = (r.sprint && r.sprint.trim()) ? r.sprint : '<span style="color:#6a737d;">—</span>';
        html += '<tr class="delegation-row" style="cursor:pointer; border-bottom:1px solid #1f242c;" onclick="toggleDelegationAccordion(this)">'
            + '<td class="col-chevron" style="color:#58a6ff;">▶</td>'
            + '<td class="col-sprint" style="font-family:\'JetBrains Mono\',monospace;">' + sprintCell + '</td>'
            + '<td class="col-title" style="max-width:340px;">' + title + '</td>'
            + '<td class="col-tier" style="font-family:\'JetBrains Mono\',monospace; font-size:0.75rem;">' + formatTier(r) + '</td>'
            + '<td class="col-status">' + statusBadge(r.status, r) + '</td>'
            + '<td class="col-tokens" style="font-family:\'JetBrains Mono\',monospace;">' + totalTok + '</td>'
            + '<td class="col-duration" style="font-family:\'JetBrains Mono\',monospace;">' + dur + '</td>'
            + '<td class="col-verified">' + verified + '</td>'
            + '</tr>';
        // Accordion detail row (hidden by default)
        const reflection = r.reflection ? r.reflection : '<span style="color:#6a737d;">(no reflection recorded)</span>';
        const swarmState = classifySwarmStatus(r);
        const verifMsg = swarmState === 'CERTIFIED'
            ? '<span style="color:#3fb950;">Verification PASSED \u2014 clean</span>'
            : (swarmState === 'ESCALATED'
                ? '<span style="color:#58a6ff;">Discrepancies found \u2014 handed over to L1 for strategic review</span>'
                : '<span style="color:#f85149;">Process or tool abort \u2014 no clean feedback</span>');
        const model = r.model ? r.model : '—';
        const ts = r.timestamp ? r.timestamp : '—';
        html += '<tr class="delegation-detail" style="display:none; background:#0d1117;">'
            + '<td class="col-chevron"></td>'
            + '<td colspan="7">'
            + '<div style="font-family:\'JetBrains Mono\',monospace; font-size:0.78rem; line-height:1.7; padding:8px 12px;">'
            + '<div><strong style="color:#8b949e;">REFLECTION:</strong> ' + reflection + '</div>'
            + '<div><strong style="color:#8b949e;">VERIFICATION:</strong> [' + swarmState + '] ' + verifMsg + '</div>'
            + '<div><strong style="color:#8b949e;">MODEL:</strong> ' + model + ' &nbsp;|&nbsp; <strong style="color:#8b949e;">TS:</strong> ' + ts + '</div>'
            + '<div><strong style="color:#8b949e;">L3 SUB-INFERENCE RECEIPTS:</strong> conductor=' + (t.conductor != null ? Number(t.conductor).toLocaleString() : '0')
            + ' | l3=' + (t.l3 != null ? Number(t.l3).toLocaleString() : '0')
            + ' | cache_read=' + (t.cache_read != null ? Number(t.cache_read).toLocaleString() : '0')
            + ' | total=' + (t.total != null ? Number(t.total).toLocaleString() : '0') + '</div>'
            + '</div></td></tr>';
    });
    tbody.innerHTML = html;
}

function toggleDelegationAccordion(row) {
    const detail = row.nextElementSibling;
    if (detail && detail.classList.contains('delegation-detail')) {
        detail.style.display = (detail.style.display === 'none') ? 'table-row' : 'none';
        row.cells[0].textContent = (detail.style.display === 'none') ? '▶' : '▼';
    }
}