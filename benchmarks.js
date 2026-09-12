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
    const timestampEl = document.getElementById('telemetry-timestamp');
    try {
        const resp = await fetch('benchmarks_cache.json?t=' + Date.now());
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        cachedData = await resp.json();
        
        if (timestampEl) timestampEl.textContent = cachedData.date_str || new Date().toLocaleString();
        renderAll(cachedData.results || []);
        await loadLiveUsageStream();
        await loadCumulativeTelemetry();
    } catch (e) {
        console.warn("[Benchmarks] Telemetry cache unreachable:", e);
        if (timestampEl) timestampEl.textContent = 'Telemetry Offline (Standby)';
        renderAll([]);
        await loadLiveUsageStream();
        await loadCumulativeTelemetry();
    }
    await initDeltaTView();
}

function renderAll(results) {
    renderSeatCards(results);
    renderBars(results);
    updateRoiCalc(25);
}

function renderSeatCards(results) {
    const container = document.getElementById('seat-cards-container');
    if (!container) return;
    
    let html = '';
    results.forEach(r => {
        const statusClass = r.status === 'online' ? 'status-online' : 'status-offline';
        const statusText = r.status === 'online' ? 'ONLINE' : 'OFFLINE / SLEEP';
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
                    <span class="stat-value" style="color:#58a6ff;">${r.model}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Context Window:</span>
                    <span class="stat-value" style="color:#d2a8ff;">${r.context_window || '32k'}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Target Role:</span>
                    <span class="stat-value">${r.role}</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Throughput:</span>
                    <span class="stat-value" style="color:#3fb950;">${r.throughput.toFixed(1)} tok/s</span>
                </div>
                <div class="seat-stat">
                    <span class="stat-label">Warm TTFT:</span>
                    <span class="stat-value">${r.warm_ttft_ms.toFixed(0)} ms</span>
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

function updateRoiCalc(mtok) {
    const label = document.getElementById('tokenVolumeLabel');
    if (label) label.textContent = mtok + ' MTok';
    const apiCost = mtok * 3.00;
    const localPowerKwh = mtok * 0.22;
    const electricityCost = localPowerKwh * 0.15;
    const savings = apiCost - electricityCost;
    const savingsPct = ((savings / apiCost) * 100).toFixed(1);

    const apiEl = document.getElementById('apiCostVal');
    const localEl = document.getElementById('localCostVal');
    const savEl = document.getElementById('savingsVal');
    if (apiEl) apiEl.textContent = '$' + apiCost.toFixed(2);
    if (localEl) localEl.textContent = '$' + electricityCost.toFixed(2);
    if (savEl) savEl.textContent = '$' + savings.toFixed(2) + ' (' + savingsPct + '%)';
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
        }).filter(r => r !== null);
        window.cachedLiveRecords = allRecords;

        const records = allRecords.slice(-10).reverse();
        let tableHtml = '<table class="live-stream-table"><thead><tr><th>Timestamp</th><th>Tier</th><th>Seat</th><th>Task / Story</th><th>Model</th><th>Output Tokens</th><th>Duration</th><th>Throughput</th></tr></thead><tbody>';
        records.forEach(r => {
            const timeStr = r.date_str ? r.date_str : (r.timestamp ? new Date(r.timestamp * 1000).toLocaleString() : 'N/A');
            const isLocal = (r.tier === 'sovereign_local') || (r.seat && !r.seat.includes('Cloud') && r.provider !== 'openrouter');
            const tierBadge = isLocal 
                ? '<span style="display:inline-block; padding:2px 6px; font-size:0.68rem; font-weight:700; border-radius:4px; background:#1b4728; color:#3fb950; border:1px solid #238636;">LOCAL</span>'
                : '<span style="display:inline-block; padding:2px 6px; font-size:0.68rem; font-weight:700; border-radius:4px; background:#382714; color:#f78166; border:1px solid #bd561d;">CLOUD</span>';
            const seatBadge = r.seat || (r.provider === 'openrouter' ? 'Cloud Swarm' : (r.provider.includes('m5') ? 'Apple M5 Air' : 'Windows 4090RTX'));
            tableHtml += '<tr>' +
                '<td style="color:#8b949e;">' + timeStr + '</td>' +
                '<td>' + tierBadge + '</td>' +
                '<td style="font-weight:700; color:#58a6ff;">' + seatBadge + '</td>' +
                '<td style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (r.task_title || r.source) + '</td>' +
                '<td style="color:#d2a8ff;">' + r.model + '</td>' +
                '<td style="text-align:right;">' + r.tokens_generated + '</td>' +
                '<td style="text-align:right;">' + r.duration_seconds + 's</td>' +
                '<td style="text-align:right; font-weight:700; color:#3fb950;">' + r.throughput_tok_s + ' tok/s</td>' +
            '</tr>';
        });
        tableHtml += '</tbody></table>';
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

        // X-axis label (Turn)
        ctx.fillStyle = '#c9d1d9';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Turn ${turnData.turn}`, x, height - padBottom + 18);

        // Topic sub-label
        ctx.fillStyle = '#8b949e';
        ctx.font = '9px "JetBrains Mono", monospace';
        const topicPreview = (turnData.topic || '').slice(0, 15);
        ctx.fillText(topicPreview, x, height - padBottom + 32);
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

function renderBlackboardLedger(data) {
    const container = document.getElementById('blackboard-ledger-container');
    if (!container) return;

    container.innerHTML = '';
    const liveRecords = window.cachedLiveRecords || [];

    data.forEach((turn, idx) => {
        const details = document.createElement('details');
        details.className = 'feature-details';
        details.id = `turn-${turn.turn}`;
        if (idx === 0) details.setAttribute('open', ''); // open latest by default

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

        details.innerHTML = `
            <summary>
                <span class="badge" style="background:#14291e; color:#3fb950; border:1px solid #238636; margin-right:8px; font-size:0.68rem; padding:1px 6px;">[FULL ROUND TABLE]</span>
                <span style="color:#58a6ff; font-family:'JetBrains Mono',monospace;">TURN ${turn.turn}</span>
                <span style="color:#f0f3f6; margin-left:10px;">${turn.topic || 'ROUND_TABLE_DELIBERATION'}</span>
                <span style="color:#8b949e; font-size:0.75rem; margin-left:auto; font-family:'JetBrains Mono',monospace;">
                    [${turn.scope || 'CONTEXT_SCOPE_LONG'}] &bull; ${turn.time_str || ''} &bull; <strong style="color:#3fb950;">${(turn.total_elapsed_s || turn.total_s).toFixed(3)}s</strong>
                </span>
            </summary>
            <div class="details-content" style="border-left: 3px solid #3fb950;">
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
            </div>
        `;
        container.appendChild(details);
    });

    // Render [BATCH] Card for non-interactive / background scans
    const batchRecords = liveRecords.filter(r => r.is_batch || (r.source && (r.source.includes('mass_scan') || r.source.includes('refine_gem') || r.source.includes('NIGHTLY_REFINEMENT'))));
    if (batchRecords.length > 0) {
        const batchDetails = document.createElement('details');
        batchDetails.className = 'feature-details';
        batchDetails.id = 'batch-scans-ledger';
        batchDetails.innerHTML = `
            <summary>
                <span class="badge" style="background:#382714; color:#f78166; border:1px solid #bd561d; margin-right:8px;">[BATCH]</span>
                <span style="color:#f0f3f6; font-weight:600;">NIGHTLY_REFINEMENT & ARCHIVE SCANS</span>
                <span style="color:#8b949e; font-size:0.75rem; margin-left:auto; font-family:'JetBrains Mono',monospace;">
                    ${batchRecords.length} batch job(s)
                </span>
            </summary>
            <div class="details-content" style="border-left: 3px solid #f78166;">
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
            </div>
        `;
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
