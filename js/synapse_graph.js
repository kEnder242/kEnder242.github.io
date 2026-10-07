// =============================================================
// SYNAPSE KNOWLEDGE GRAPH ENGINE [FEAT-596 / FEAT-603]
// Tiered Progressive-Disclosure Dynamic Constellation Canvas
// =============================================================

(function() {
    'use strict';

    var domainColors = {
        'INS': '#a371f7',
        'INSPIRATION': '#a371f7',
        'PHL': '#a371f7',
        'PHILOSOPHY': '#a371f7',
        'BKM': '#3fb950',
        'BEHAVIORAL': '#3fb950',
        'FEAT': '#58a6ff',
        'FEATURE': '#58a6ff',
        'WIS': '#e3b341',
        'WISDOM': '#e3b341',
        'DISC': '#f0883e',
        'DISCOVERY': '#f0883e',
        'RDNA': '#56d364',
        'SPRINT': '#d2a8ff',
        'GEMS': '#ec4899',
        'BONES': '#56d364'
    };

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // -------------------------------------------------------------
    // HTML5 EGO CANVAS VISUALIZER (PURE MINIMAL BREATHING CONSTELLATION)
    // -------------------------------------------------------------
    function initEgoSynapseCanvas() {
        var canvas = document.getElementById('synapseCanvas');
        var wrap = document.getElementById('synapseCanvasWrap');
        var workspace = document.getElementById('synapseWorkspace');
        var tooltip = document.getElementById('synapseTooltip');
        if (!canvas || !wrap) return;

        var ctx = canvas.getContext('2d');
        var width = wrap.clientWidth || 800;
        var height = wrap.clientHeight || 720;
        var dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        var simTime = 0;
        var zoom = 1.0;
        var panX = 0;
        var panY = 0;
        var isPanning = false;
        var startPanX = 0;
        var startPanY = 0;
        var hoveredOrbitNode = null;
        var hopDepth = 2;
        var synapseFilterDomain = 'ALL';

        // Persistent particle memory for smooth organic morphing
        var activeNodeMap = {}; // id -> nodeObject
        var activeLinks = [];   // array of { source, target, weight, isGrandchild }
        var simEnergy = 1.0;    // Simulation energy cooling

        // Canvas-Native Interactive Action Hitboxes [FEAT-612]
        var interactiveButtons = []; // array of { id, action, x, y, w, h, node }

        // [FEAT-613] Compute Dynamic Spatial Real-Estate Pressure
        function getCanvasPressure() {
            var effW = width * zoom;
            var effH = height * zoom;
            if (effW < 750 || effH < 600 || zoom < 0.75) {
                return 'high';   // Constrained real-estate (bump all tiers down)
            } else if (effW < 1100 || effH < 750 || zoom < 0.9) {
                return 'medium'; // Moderate space
            }
            return 'normal';     // Ample 1440p / 4K canvas space
        }

        function getGlobalNodes() {
            var map = {};
            if (window.__SYNAPSE_GRAPH__ && window.__SYNAPSE_GRAPH__.nodes) {
                window.__SYNAPSE_GRAPH__.nodes.forEach(function(n) {
                    map[n.id] = n;
                });
            }
            return map;
        }

        function getCardsMap() {
            var map = {};
            if (window.__DNA_MANIFEST__) {
                Object.keys(window.__DNA_MANIFEST__).forEach(function(k) {
                    var items = window.__DNA_MANIFEST__[k] || [];
                    if (Array.isArray(items)) {
                        items.forEach(function(c) {
                            if (c.id) map[c.id] = c;
                        });
                    }
                });
            }
            return map;
        }

        function getNeighborsFor(cid) {
            var res = [];
            if (!window.__SYNAPSE_GRAPH__ || !window.__SYNAPSE_GRAPH__.links) return res;
            window.__SYNAPSE_GRAPH__.links.forEach(function(l) {
                var sId = typeof l.source === 'object' ? l.source.id : l.source;
                var tId = typeof l.target === 'object' ? l.target.id : l.target;
                if (sId === cid && tId !== cid) res.push({ targetId: tId, weight: l.weight || 1 });
                else if (tId === cid && sId !== cid) res.push({ targetId: sId, weight: l.weight || 1 });
            });
            return res;
        }

        function computeConstellation() {
            var cx = width / 2;
            var cy = height / 2;
            simEnergy = Math.max(simEnergy, 0.65);

            var focalNodeId = window.__focalNodeId || (cardsById['INS-001'] ? 'INS-001' : (cardsById['PHL-001'] ? 'PHL-001' : Object.keys(cardsById)[0] || 'INS-001'));
            var focalBreadcrumbs = window.__focalBreadcrumbs || [focalNodeId];
            var globalNodesMap = getGlobalNodes();
            var cardsById = getCardsMap();

            // 1. Traverse 1-Hop and 2-Hop Ego Network
            var directNeighbors = getNeighborsFor(focalNodeId);
            var directSet = {};
            directNeighbors.forEach(function(n) { directSet[n.targetId] = true; });

            var grandchildSet = {};
            if (hopDepth >= 2) {
                directNeighbors.forEach(function(n) {
                    var gNeigh = getNeighborsFor(n.targetId);
                    gNeigh.forEach(function(gn) {
                        if (gn.targetId !== focalNodeId && !directSet[gn.targetId]) {
                            grandchildSet[gn.targetId] = true;
                        }
                    });
                });
            }

            // 2. Compute Active Cluster
            var clusterIds = [];
            var trail = focalBreadcrumbs.slice(-3);
            var trailSet = {};
            trail.forEach(function(id) { trailSet[id] = true; });

            if (synapseFilterDomain === 'ALL') {
                clusterIds = Object.keys(trailSet)
                    .concat(Object.keys(directSet))
                    .concat(Object.keys(grandchildSet));
            } else if (synapseFilterDomain === 'BONES') {
                var activeBones = window.__activeBones || [];
                clusterIds = activeBones.map(function(b) { return b.id; });
                if (clusterIds.indexOf(focalNodeId) === -1) clusterIds.unshift(focalNodeId);
            } else {
                Object.keys(directSet).forEach(function(cid) {
                    var nData = cardsById[cid] || globalNodesMap[cid];
                    var dName = ((nData && nData.domain) || cid.split('-')[0]).toUpperCase();
                    var matchesDomain = false;
                    if (synapseFilterDomain === 'INS' || synapseFilterDomain === 'PHL' || synapseFilterDomain === 'INSPIRATION' || synapseFilterDomain === 'PHILOSOPHY') {
                        matchesDomain = (dName === 'INS' || dName === 'PHL' || dName === 'INSPIRATION' || dName === 'PHILOSOPHY');
                    } else {
                        matchesDomain = (dName === synapseFilterDomain);
                    }
                    if (!matchesDomain) {
                        delete directSet[cid];
                    }
                });
                clusterIds = Object.keys(trailSet).concat(Object.keys(directSet));
            }

            // Peninsula Escape [FEAT-619]: If cluster is isolated (<= 4 nodes), inject global anchor gateway hubs
            var globalHubs = ['INS-001', 'PHL-001', 'BKM-001', 'FEAT-582', 'WIS-001'];
            if (clusterIds.length <= 4) {
                globalHubs.forEach(function(ghId) {
                    if (clusterIds.indexOf(ghId) === -1 && ghId !== focalNodeId) {
                        grandchildSet[ghId] = true;
                        clusterIds.push(ghId);
                    }
                });
            }

            // 3. Update particle lifecycle (Morphing & Pressure-Based Scaling [FEAT-603 / FEAT-613])
            var targetSet = {};
            var pressure = getCanvasPressure();

            clusterIds.forEach(function(cid, idx) {
                targetSet[cid] = true;
                // Merge card data (with origin & synthesis) over graph stub
                var nData = Object.assign({}, globalNodesMap[cid] || {}, cardsById[cid] || { id: cid, title: cid, domain: cid.split('-')[0] });
                var dName = (nData.domain || cid.split('-')[0]).toUpperCase();
                var isDocked = (window.__activeBones || []).some(function(b) { return b.id === cid; });
                var isFocal = (cid === focalNodeId);
                var isTrail = (!isFocal && trail.indexOf(cid) !== -1);
                var isDirect = (!isFocal && !isTrail && !!directSet[cid]);
                var isGrandchild = (!isFocal && !isTrail && !isDirect && !!grandchildSet[cid]);

                // [FEAT-603] Tiered Progressive-Disclosure Synapse Graph Anatomy
                var origin = (nData.origin && (nData.origin.text || nData.origin.verbatim)) || nData.verbatim || '';
                var narrative = (nData.synthesis && nData.synthesis.narrative_context) || nData.narrative_context || nData.summary || '';
                var anchors = (nData.synthesis && nData.synthesis.lab_anchors) || nData.lab_anchors || [];
                var tags = (nData.metadata && nData.metadata.tags) || (nData.synthesis && nData.synthesis.tags) || nData.tags || [];
                if (typeof tags === 'string') tags = tags.split(',');
                var links = (nData.metadata && nData.metadata.explicit_links) || [];

                var nodeColor = isGrandchild ? '#6e7681' : (domainColors[dName] || '#8b949e');
                
                // Adaptive Tier Dimensions under Spatial Pressure [FEAT-613]
                var cardW = 0;
                var cardH = 0;
                var nodeRadius = 5;
                var isDotNode = false;

                if (isFocal) {
                    if (pressure === 'high') {
                        cardW = 210;
                        cardH = 260;
                    } else if (pressure === 'medium') {
                        cardW = 240;
                        cardH = 310;
                    } else {
                        // Full Vertical Card (taller than wide [FEAT-603])
                        cardW = 260;
                        cardH = 340;
                    }
                    nodeRadius = 20;
                } else if (isTrail) {
                    if (pressure === 'high') {
                        cardW = 160;
                        cardH = 80;
                    } else {
                        cardW = 220;
                        cardH = 110;
                    }
                    nodeRadius = 14;
                } else if (isDirect) {
                    if (pressure === 'high') {
                        isDotNode = true;
                        nodeRadius = 8;
                    } else {
                        cardW = 160;
                        cardH = 64;
                        nodeRadius = 10;
                    }
                } else if (isGrandchild) {
                    isDotNode = true;
                    nodeRadius = (pressure === 'high') ? 4 : 5.5;
                }

                if (!activeNodeMap[cid]) {
                    var spawnAngle = (idx / (clusterIds.length || 1)) * Math.PI * 2;
                    var spawnDist = isGrandchild ? (420 + Math.random() * 80) : (isTrail ? 240 : (320 + Math.random() * 60));
                    activeNodeMap[cid] = {
                        id: cid,
                        title: nData.title || (nData.synthesis && nData.synthesis.title) || cid,
                        origin: origin,
                        narrative: narrative,
                        anchors: anchors,
                        tags: tags,
                        linksCount: links.length,
                        domain: dName,
                        isCenter: isFocal,
                        isTrail: isTrail,
                        isDirect: isDirect,
                        isGrandchild: isGrandchild,
                        isDotNode: isDotNode,
                        isDocked: isDocked,
                        cardWidth: cardW,
                        cardHeight: cardH,
                        x: isFocal ? cx : (cx + Math.cos(spawnAngle) * spawnDist),
                        y: isFocal ? cy : (cy + Math.sin(spawnAngle) * spawnDist),
                        vx: 0,
                        vy: 0,
                        radius: nodeRadius,
                        color: nodeColor,
                        alpha: 0.0,
                        targetAlpha: isGrandchild ? 0.70 : 1.0,
                        noiseSeed: Math.random() * 100
                    };
                } else {
                    var n = activeNodeMap[cid];
                    n.isCenter = isFocal;
                    n.isTrail = isTrail;
                    n.isDirect = isDirect;
                    n.isGrandchild = isGrandchild;
                    n.isDotNode = isDotNode;
                    n.isDocked = isDocked;
                    n.cardWidth = cardW;
                    n.cardHeight = cardH;
                    n.radius = nodeRadius;
                    n.targetAlpha = isGrandchild ? 0.70 : 1.0;
                    n.title = nData.title || (nData.synthesis && nData.synthesis.title) || cid;
                    n.origin = origin;
                    n.narrative = narrative;
                    n.anchors = anchors;
                    n.tags = tags;
                    n.linksCount = links.length;
                    n.color = nodeColor;
                }
            });

            // Fade out departing nodes
            Object.keys(activeNodeMap).forEach(function(cid) {
                if (!targetSet[cid]) {
                    activeNodeMap[cid].targetAlpha = 0.0;
                }
            });

            // 4. Compute Interconnected Synaptic Threads
            activeLinks = [];
            var activeNodesList = Object.values(activeNodeMap);
            for (var i = 0; i < activeNodesList.length; i++) {
                var src = activeNodesList[i];
                if (src.targetAlpha <= 0.0) continue;
                var srcNeigh = getNeighborsFor(src.id);
                for (var j = i + 1; j < activeNodesList.length; j++) {
                    var tgt = activeNodesList[j];
                    if (tgt.targetAlpha <= 0.0) continue;
                    var edge = srcNeigh.find(function(l) { return l.targetId === tgt.id; });
                    if (edge) {
                        activeLinks.push({
                            source: src,
                            target: tgt,
                            isGrandchild: (src.isGrandchild || tgt.isGrandchild),
                            weight: edge.weight || 1
                        });
                    }
                }
            }
        }

        // Global alias for compatibility
        window.computeEgoGraph = computeConstellation;
        window.computeConstellation = computeConstellation;

        function stepPhysics() {
            var cx = width / 2;
            var cy = height / 2;
            simTime += 0.02;

            var nodes = Object.values(activeNodeMap);

            // 1. Alpha dissolve & cleanup
            for (var i = nodes.length - 1; i >= 0; i--) {
                var n = nodes[i];
                n.alpha += (n.targetAlpha - n.alpha) * 0.12;
                if (n.alpha < 0.01 && n.targetAlpha === 0.0) {
                    delete activeNodeMap[n.id];
                }
            }

            // Starscape Cooling: Keep focal node centered
            if (simEnergy < 0.005) {
                nodes.forEach(function(n) {
                    if (n.isCenter) { n.x = cx; n.y = cy; }
                });
                return;
            }
            simEnergy *= 0.95;

            nodes = Object.values(activeNodeMap);

            // Effective card radius
            nodes.forEach(function(n) {
                n.effectiveRadius = (n.cardWidth > 0 && n.cardHeight > 0)
                    ? Math.hypot(n.cardWidth / 2, n.cardHeight / 2)
                    : (n.radius || 8);
            });

            // 2. Center Anchoring for Focal Node & Orbital Target Gravity for Outer Nodes
            nodes.forEach(function(n) {
                if (n.isCenter) {
                    n.x += (cx - n.x) * 0.12;
                    n.y += (cy - n.y) * 0.12;
                    n.vx = 0;
                    n.vy = 0;
                    return;
                }

                var cDx = n.x - cx;
                var cDy = n.y - cy;
                var cDist = Math.sqrt(cDx * cDx + cDy * cDy) || 1;
                var targetOrbit = n.isTrail ? 240 : (n.isDirect ? 350 : 480);
                var orbitDelta = cDist - targetOrbit;
                n.vx -= (cDx / cDist) * orbitDelta * 0.012 * simEnergy;
                n.vy -= (cDy / cDist) * orbitDelta * 0.012 * simEnergy;
            });

            // 3. Multi-body Coulomb Repulsion between orbiting peers
            for (var i = 0; i < nodes.length; i++) {
                var n1 = nodes[i];
                if (n1.isCenter) continue;
                for (var j = i + 1; j < nodes.length; j++) {
                    var n2 = nodes[j];
                    if (n2.isCenter) continue;
                    var dx = n2.x - n1.x;
                    var dy = n2.y - n1.y;
                    var distSq = dx * dx + dy * dy + 300;
                    var dist = Math.sqrt(distSq) || 1;
                    var minSep = (n1.effectiveRadius + n2.effectiveRadius + 24);
                    var repForce = (6000 * simEnergy) / distSq;
                    if (dist < minSep) {
                        repForce += (minSep - dist) * 0.03 * simEnergy;
                    }
                    var fx = (dx / dist) * repForce;
                    var fy = (dy / dist) * repForce;
                    n1.vx -= fx;
                    n1.vy -= fy;
                    n2.vx += fx;
                    n2.vy += fy;
                }
            }

            // 4. Spring Link Tension along Synaptic Threads
            var kSpring = 0.014 * simEnergy;
            activeLinks.forEach(function(l) {
                if (!activeNodeMap[l.source.id] || !activeNodeMap[l.target.id]) return;
                var src = l.source;
                var tgt = l.target;
                var dx = tgt.x - src.x;
                var dy = tgt.y - src.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                var restDist = (src.effectiveRadius + tgt.effectiveRadius + 60);
                if (l.isGrandchild) restDist = Math.min(restDist, 180);

                var force = (dist - restDist) * kSpring;
                var fx = (dx / dist) * force;
                var fy = (dy / dist) * force;
                if (!src.isCenter) { src.vx += fx; src.vy += fy; }
                if (!tgt.isCenter) { tgt.vx -= fx; tgt.vy -= fy; }
            });

            // 5. Critical Damping & Position Integration
            nodes.forEach(function(n) {
                if (n.isCenter) return;
                n.vx *= 0.88;
                n.vy *= 0.88;
                n.x += n.vx;
                n.y += n.vy;

                n.x += Math.sin(simTime + n.noiseSeed) * 0.12;
                n.y += Math.cos(simTime + n.noiseSeed * 1.3) * 0.12;
            });
        }

        // --- [FEAT-609] Longest-Axis Line Approximation & Edge Egress Link Geometry ---
        function getCardAxialSpine(node) {
            if (node.isDotNode || !node.cardWidth || !node.cardHeight) {
                return { p1: { x: node.x, y: node.y }, p2: { x: node.x, y: node.y }, halfW: 0, halfH: 0, isDot: true };
            }
            var halfW = node.cardWidth / 2;
            var halfH = node.cardHeight / 2;
            var isVertical = halfH >= halfW;

            if (isVertical) {
                var spineInsetY = Math.min(halfH * 0.75, halfH - 16);
                return {
                    p1: { x: node.x, y: node.y - spineInsetY },
                    p2: { x: node.x, y: node.y + spineInsetY },
                    halfW: halfW,
                    halfH: halfH,
                    isDot: false
                };
            } else {
                var spineInsetX = Math.min(halfW * 0.75, halfW - 16);
                return {
                    p1: { x: node.x - spineInsetX, y: node.y },
                    p2: { x: node.x + spineInsetX, y: node.y },
                    halfW: halfW,
                    halfH: halfH,
                    isDot: false
                };
            }
        }

        function closestPointOnSegment(p, a, b) {
            var abx = b.x - a.x;
            var aby = b.y - a.y;
            var abLenSq = abx * abx + aby * aby;
            if (abLenSq < 0.0001) return { x: a.x, y: a.y };
            var apx = p.x - a.x;
            var apy = p.y - a.y;
            var t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
            return { x: a.x + t * abx, y: a.y + t * aby };
        }

        function getOptimalConnectionAnchors(srcNode, tgtNode) {
            var sSpine = getCardAxialSpine(srcNode);
            var tSpine = getCardAxialSpine(tgtNode);

            var pSrc = { x: srcNode.x, y: srcNode.y };
            var pTgt = { x: tgtNode.x, y: tgtNode.y };

            if (!sSpine.isDot && !tSpine.isDot) {
                var midTgt = { x: (tSpine.p1.x + tSpine.p2.x) / 2, y: (tSpine.p1.y + tSpine.p2.y) / 2 };
                pSrc = closestPointOnSegment(midTgt, sSpine.p1, sSpine.p2);
                pTgt = closestPointOnSegment(pSrc, tSpine.p1, tSpine.p2);
                pSrc = closestPointOnSegment(pTgt, sSpine.p1, sSpine.p2);
            } else if (!sSpine.isDot && tSpine.isDot) {
                pSrc = closestPointOnSegment(pTgt, sSpine.p1, sSpine.p2);
            } else if (sSpine.isDot && !tSpine.isDot) {
                pTgt = closestPointOnSegment(pSrc, tSpine.p1, tSpine.p2);
            }

            function projectToPerimeter(node, spine, anchor, targetPt) {
                if (spine.isDot) return { x: node.x, y: node.y };
                var dx = targetPt.x - anchor.x;
                var dy = targetPt.y - anchor.y;
                if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return anchor;

                var left = node.x - spine.halfW;
                var right = node.x + spine.halfW;
                var top = node.y - spine.halfH;
                var bottom = node.y + spine.halfH;

                var tx = Infinity;
                var ty = Infinity;

                if (dx > 0) {
                    tx = (right - anchor.x) / dx;
                } else if (dx < 0) {
                    tx = (left - anchor.x) / dx;
                }

                if (dy > 0) {
                    ty = (bottom - anchor.y) / dy;
                } else if (dy < 0) {
                    ty = (top - anchor.y) / dy;
                }

                var t = Math.min(tx, ty);
                if (!isFinite(t) || t <= 0) return anchor;
                return {
                    x: anchor.x + dx * t,
                    y: anchor.y + dy * t
                };
            }

            return {
                srcAnchor: projectToPerimeter(srcNode, sSpine, pSrc, pTgt),
                tgtAnchor: projectToPerimeter(tgtNode, tSpine, pTgt, pSrc)
            };
        }

        function drawRoundedRect(c, x, y, w, h, r) {
            c.beginPath();
            c.moveTo(x + r, y);
            c.lineTo(x + w - r, y);
            c.arcTo(x + w, y, x + w, y + r, r);
            c.lineTo(x + w, y + h - r);
            c.arcTo(x + w, y + h, x + w - r, y + h, r);
            c.lineTo(x + r, y + h);
            c.arcTo(x, y + h, x, y + h - r, r);
            c.lineTo(x, y + r);
            c.arcTo(x, y, x + r, y, r);
            c.closePath();
        }

        function drawWrappedText(c, text, x, y, maxWidth, lineHeight, maxLines, color, font) {
            if (!text) return 0;
            c.save();
            c.fillStyle = color;
            c.font = font;
            c.textAlign = 'left';
            c.textBaseline = 'top';
            var words = text.split(/\s+/);
            var line = '';
            var lineCount = 0;
            var curY = y;
            for (var i = 0; i < words.length; i++) {
                var testLine = line + (line ? ' ' : '') + words[i];
                var metrics = c.measureText(testLine);
                if (metrics.width > maxWidth && line) {
                    lineCount++;
                    if (lineCount >= maxLines) {
                        var truncated = line;
                        while (truncated && c.measureText(truncated + '…').width > maxWidth) {
                            truncated = truncated.slice(0, -1);
                        }
                        c.fillText(truncated + '…', x, curY);
                        c.restore();
                        return lineCount;
                    }
                    c.fillText(line, x, curY);
                    line = words[i];
                    curY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (line && lineCount < maxLines) {
                c.fillText(line, x, curY);
                lineCount++;
            }
            c.restore();
            return lineCount;
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            ctx.save();
            ctx.translate(panX, panY);
            ctx.scale(zoom, zoom);

            var focalBreadcrumbs = window.__focalBreadcrumbs || [window.__focalNodeId || 'PHL-001'];
            var trailNodes = focalBreadcrumbs.slice(-3)
                .map(function(id) { return activeNodeMap[id]; })
                .filter(Boolean);

            if (trailNodes.length >= 2) {
                ctx.beginPath();
                var anchors0 = getOptimalConnectionAnchors(trailNodes[0], trailNodes[1]);
                ctx.moveTo(anchors0.srcAnchor.x, anchors0.srcAnchor.y);
                for (var tIdx = 1; tIdx < trailNodes.length; tIdx++) {
                    var anchorsT = getOptimalConnectionAnchors(trailNodes[tIdx - 1], trailNodes[tIdx]);
                    ctx.lineTo(anchorsT.tgtAnchor.x, anchorsT.tgtAnchor.y);
                }
                ctx.strokeStyle = 'rgba(163, 113, 247, 0.55)';
                ctx.lineWidth = 3.2;
                ctx.shadowColor = '#a371f7';
                ctx.shadowBlur = 12;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // --- Render Perimeter-Connected Synaptic Threads ---
            activeLinks.forEach(function(l) {
                if (l.source.alpha < 0.02 || l.target.alpha < 0.02) return;
                var isHovered = (hoveredOrbitNode && (l.source === hoveredOrbitNode || l.target === hoveredOrbitNode));
                var baseAlpha = l.isGrandchild ? 0.25 : 0.45;
                var linkAlpha = baseAlpha * Math.min(l.source.alpha, l.target.alpha);

                var anchors = getOptimalConnectionAnchors(l.source, l.target);

                ctx.beginPath();
                ctx.moveTo(anchors.srcAnchor.x, anchors.srcAnchor.y);
                ctx.lineTo(anchors.tgtAnchor.x, anchors.tgtAnchor.y);

                if (isHovered) {
                    ctx.strokeStyle = 'rgba(88, 166, 255, 0.95)';
                    ctx.lineWidth = 2.4;
                    ctx.shadowColor = '#58a6ff';
                    ctx.shadowBlur = 8;
                } else if (l.isGrandchild) {
                    ctx.strokeStyle = 'rgba(110, 118, 129, ' + linkAlpha.toFixed(3) + ')';
                    ctx.lineWidth = 1.0;
                    ctx.shadowBlur = 0;
                } else {
                    ctx.strokeStyle = 'rgba(88, 166, 255, ' + linkAlpha.toFixed(3) + ')';
                    ctx.lineWidth = 1.5;
                    ctx.shadowBlur = 0;
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            });

            // --- Tiered Canvas Card Anatomy & Rendering (Layer Sorted) ---
            var nodes = Object.values(activeNodeMap);
            nodes.sort(function(a, b) {
                function getLayer(n) {
                    if (n.isCenter) return 100; // Center card ALWAYS on top
                    if (hoveredOrbitNode === n) return 90; // Hovered card elevated
                    if (n.isTrail) return 50;
                    if (n.isDirect && !n.isDirectDot) return 30;
                    if (n.isDirectDot) return 20;
                    return 10; // Grandchildren in background
                }
                return getLayer(a) - getLayer(b);
            });

            nodes.forEach(function(n) {
                if (n.alpha < 0.01) return;
                var isHovered = (hoveredOrbitNode === n);
                ctx.globalAlpha = n.alpha;

                if (n.isGrandchild || n.isDirectDot) {
                    // Tier 3 or Mobile 1-Hop: Glowing dots
                    var dotColor = n.isGrandchild ? (isHovered ? '#ffffff' : '#6e7681') : (n.color || '#58a6ff');
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, isHovered ? (n.radius + 2) : n.radius, 0, Math.PI * 2);
                    ctx.fillStyle = dotColor;
                    if (isHovered) {
                        ctx.shadowColor = n.color || '#58a6ff';
                        ctx.shadowBlur = 12;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    if (isHovered) {
                        ctx.fillStyle = '#f0f6fc';
                        ctx.font = 'bold 10px "JetBrains Mono", monospace';
                        ctx.textAlign = 'left';
                        ctx.fillText(n.id, n.x + 12, n.y + 3);
                    }

                } else if (n.cardWidth > 0 && n.cardHeight > 0) {
                    var cardX = n.x - n.cardWidth / 2;
                    var cardY = n.y - n.cardHeight / 2;
                    var radius = n.isCenter ? 10 : (n.isTrail ? 8 : 7);

                    // 1. Background Fill
                    drawRoundedRect(ctx, cardX, cardY, n.cardWidth, n.cardHeight, radius);
                    ctx.fillStyle = n.isCenter ? 'rgba(9, 13, 22, 0.98)' : 'rgba(13, 17, 23, 0.96)';
                    if (n.isCenter) {
                        ctx.shadowColor = '#58a6ff';
                        ctx.shadowBlur = isHovered ? 28 : 18;
                    } else if (isHovered) {
                        ctx.shadowColor = n.color;
                        ctx.shadowBlur = 16;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                    ctx.fill();

                    // 2. Card Border
                    ctx.lineWidth = n.isCenter ? 2.5 : (isHovered ? 2.0 : 1.4);
                    ctx.strokeStyle = n.isCenter ? '#ffffff' : (isHovered ? '#ffffff' : n.color);
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // 3. Top Header Bar
                    var pillW = n.isCenter ? 50 : (n.isTrail ? 42 : 36);
                    var pillH = n.isCenter ? 20 : (n.isTrail ? 18 : 16);
                    var pillX = cardX + 12;
                    var pillY = cardY + 12;
                    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 4);
                    ctx.fillStyle = n.color;
                    ctx.globalAlpha = n.alpha * 0.25;
                    ctx.fill();
                    ctx.globalAlpha = n.alpha;
                    ctx.fillStyle = n.color;
                    ctx.font = 'bold ' + (n.isCenter ? '11px' : '9.5px') + ' "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(n.domain, pillX + pillW / 2, pillY + pillH - 4);

                    // Card ID
                    ctx.fillStyle = n.isCenter ? '#ffffff' : '#f0f6fc';
                    ctx.font = 'bold ' + (n.isCenter ? '13px' : '11.5px') + ' "JetBrains Mono", monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(n.id, pillX + pillW + 8, pillY + pillH - 4);

                    // Links Count Badge
                    if (n.linksCount > 0) {
                        ctx.fillStyle = '#8b949e';
                        ctx.font = '10px "JetBrains Mono", monospace';
                        ctx.textAlign = 'right';
                        ctx.fillText('🔗 ' + n.linksCount, cardX + n.cardWidth - 12, pillY + pillH - 4);
                    }

                    // 4. Title Rendering (High-Contrast Bold)
                    var titleY = pillY + pillH + (n.isCenter ? 18 : 14);
                    var maxTitleLines = n.isCenter ? (n.cardHeight < 300 ? 2 : 3) : (n.isTrail ? 2 : 1);
                    var titleFont = 'bold ' + (n.isCenter ? '13px' : (n.isTrail ? '11.5px' : '11px')) + ' -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    var titleLinesDrawn = drawWrappedText(ctx, n.title || n.id, cardX + 12, titleY, n.cardWidth - 24, (n.isCenter ? 16 : 14), maxTitleLines, '#ffffff', titleFont);

                    // 5. Tier-Specific Body Content
                    if (n.isCenter) {
                        var curBlockY = titleY + (titleLinesDrawn * 16) + 6;

                        if (n.origin) {
                            var origSnippet = '❝ ' + n.origin.slice(0, 140) + (n.origin.length > 140 ? '...' : '') + ' ❞';
                            var maxOrigLines = (n.cardHeight < 300 ? 2 : 3);
                            var originLines = drawWrappedText(ctx, origSnippet, cardX + 12, curBlockY, n.cardWidth - 24, 13, maxOrigLines, '#c9d1d9', 'italic 10px sans-serif');
                            curBlockY += (originLines * 13) + 6;
                        }

                        if (n.narrative) {
                            var maxNarrLines = (n.cardHeight < 300 ? 2 : 4);
                            drawWrappedText(ctx, n.narrative, cardX + 12, curBlockY, n.cardWidth - 24, 13, maxNarrLines, '#8b949e', '10.5px sans-serif');
                        }

                        // Bottom Tags Row (Dedicated Row 1)
                        var tagsRowY = cardY + n.cardHeight - 52;
                        var tagsText = (n.tags || []).slice(0, 3).map(function(t) { return '#' + t; }).join(' ');
                        if (tagsText) {
                            ctx.fillStyle = '#58a6ff';
                            ctx.font = '9px "JetBrains Mono", monospace';
                            ctx.textAlign = 'left';
                            ctx.fillText(tagsText, cardX + 12, tagsRowY);
                        }

                        // Bottom Anchors Row (Dedicated Row 2 - NEVER overlapping Tags!)
                        var anchorsRowY = cardY + n.cardHeight - 38;
                        if (n.anchors && n.anchors.length > 0) {
                            ctx.fillStyle = '#3fb950';
                            ctx.font = '9px "JetBrains Mono", monospace';
                            ctx.textAlign = 'left';
                            var anchorsText = '⚓ ' + n.anchors.slice(0, 2).map(function(a) { return '[' + a + ']'; }).join(' ');
                            ctx.fillText(anchorsText, cardX + 12, anchorsRowY);
                        }

                        // [FEAT-612] Canvas-Native Interactive Action Buttons Row
                        var btnRowY = cardY + n.cardHeight - 26;
                        var btnW = (n.cardWidth - 32) / 3;
                        var btnH = 20;

                        // Button 1: [📇 Locate in Review]
                        var b1X = cardX + 12;
                        drawRoundedRect(ctx, b1X, btnRowY, btnW, btnH, 4);
                        ctx.fillStyle = 'rgba(56, 139, 253, 0.2)';
                        ctx.fill();
                        ctx.strokeStyle = '#58a6ff';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#58a6ff';
                        ctx.font = 'bold 9px "JetBrains Mono", monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText('📇 CARDS', b1X + btnW / 2, btnRowY + 13);
                        interactiveButtons.push({ id: n.id, action: 'locate_grid', x: b1X, y: btnRowY, w: btnW, h: btnH, node: n });

                        // Button 2: [🦴 +Rack]
                        var b2X = b1X + btnW + 4;
                        drawRoundedRect(ctx, b2X, btnRowY, btnW, btnH, 4);
                        ctx.fillStyle = n.isDocked ? 'rgba(86, 211, 100, 0.3)' : 'rgba(86, 211, 100, 0.15)';
                        ctx.fill();
                        ctx.strokeStyle = '#56d364';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#56d364';
                        ctx.font = 'bold 9px "JetBrains Mono", monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(n.isDocked ? '🦴 DOCKED' : '+ RACK', b2X + btnW / 2, btnRowY + 13);
                        interactiveButtons.push({ id: n.id, action: 'toggle_rack', x: b2X, y: btnRowY, w: btnW, h: btnH, node: n });

                        // Button 3: [📝 Edit/Draft]
                        var b3X = b2X + btnW + 4;
                        drawRoundedRect(ctx, b3X, btnRowY, btnW, btnH, 4);
                        ctx.fillStyle = 'rgba(163, 113, 247, 0.2)';
                        ctx.fill();
                        ctx.strokeStyle = '#a371f7';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#a371f7';
                        ctx.font = 'bold 9px "JetBrains Mono", monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText('📝 DRAFT', b3X + btnW / 2, btnRowY + 13);
                        interactiveButtons.push({ id: n.id, action: 'open_draft', x: b3X, y: btnRowY, w: btnW, h: btnH, node: n });

                    } else if (n.isTrail) {
                        // Tier 1: Trail Node
                        var narrY = titleY + (titleLinesDrawn * 14) + 4;
                        var maxNarrLines = (n.cardHeight < 200 ? 2 : 3);
                        drawWrappedText(ctx, n.narrative || '', cardX + 12, narrY, n.cardWidth - 24, 12, maxNarrLines, '#8b949e', '9.5px sans-serif');

                        var metaY = cardY + n.cardHeight - 8;
                        if (n.anchors && n.anchors.length > 0) {
                            ctx.fillStyle = '#58a6ff';
                            ctx.font = '8.5px "JetBrains Mono", monospace';
                            ctx.textAlign = 'left';
                            ctx.fillText('⚓ ' + n.anchors.slice(0, 2).join(', '), cardX + 12, metaY);
                        }

                    } else if (n.isDirect) {
                        // Tier 2: Children Node
                        var narrY = titleY + (titleLinesDrawn * 14) + 4;
                        drawWrappedText(ctx, n.narrative || '', cardX + 10, narrY, n.cardWidth - 20, 12, 2, '#8b949e', '9px sans-serif');
                    }
                }
                ctx.globalAlpha = 1.0;
            });

            ctx.restore();
        }

        function loop() {
            stepPhysics();
            draw();
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        window.__triggerSynapseRedraw = function() { computeConstellation(); };
        computeConstellation();

        function screenToWorld(sx, sy) {
            var rect = canvas.getBoundingClientRect();
            var x = (sx - rect.left - panX) / zoom;
            var y = (sy - rect.top - panY) / zoom;
            return { x: x, y: y };
        }

        function findNodeAt(sx, sy) {
            var pt = screenToWorld(sx, sy);
            var nodes = Object.values(activeNodeMap);
            for (var i = nodes.length - 1; i >= 0; i--) {
                var n = nodes[i];
                if (n.alpha < 0.15) continue;
                if (n.cardWidth > 0 && n.cardHeight > 0) {
                    var halfW = n.cardWidth / 2 + 6;
                    var halfH = n.cardHeight / 2 + 6;
                    if (pt.x >= n.x - halfW && pt.x <= n.x + halfW &&
                        pt.y >= n.y - halfH && pt.y <= n.y + halfH) {
                        return n;
                    }
                } else {
                    var dx = pt.x - n.x;
                    var dy = pt.y - n.y;
                    if (dx * dx + dy * dy <= (n.radius + 10) * (n.radius + 10)) return n;
                }
            }
            return null;
        }

        function findInteractiveButtonAt(worldPt) {
            for (var i = interactiveButtons.length - 1; i >= 0; i--) {
                var btn = interactiveButtons[i];
                if (worldPt.x >= btn.x && worldPt.x <= btn.x + btn.w &&
                    worldPt.y >= btn.y && worldPt.y <= btn.y + btn.h) {
                    return btn;
                }
            }
            return null;
        }

        wrap.addEventListener('mousedown', function(e) {
            if (e.target !== canvas) return;
            var worldPt = screenToWorld(e.clientX, e.clientY);
            var clickedBtn = findInteractiveButtonAt(worldPt);

            if (clickedBtn) {
                // [FEAT-612] Direct On-Canvas Interactive Actions
                if (clickedBtn.action === 'locate_grid') {
                    if (window.locateCardInGrid) window.locateCardInGrid(clickedBtn.id);
                } else if (clickedBtn.action === 'toggle_rack') {
                    if (window.toggleBoneInRack) window.toggleBoneInRack(clickedBtn.id);
                    computeConstellation();
                } else if (clickedBtn.action === 'open_draft') {
                    if (window.loadCardIntoDraft) window.loadCardIntoDraft(clickedBtn.id);
                }
                return;
            }

            var hit = findNodeAt(e.clientX, e.clientY);
            if (hit) {
                if (hit.id !== window.__focalNodeId) {
                    if (window.focusCardInSynapse) window.focusCardInSynapse(hit.id);
                }
            } else {
                isPanning = true;
                startPanX = e.clientX - panX;
                startPanY = e.clientY - panY;
            }
        });

        window.addEventListener('mousemove', function(e) {
            if (isPanning) {
                panX = e.clientX - startPanX;
                panY = e.clientY - startPanY;
                simEnergy = Math.max(simEnergy, 0.1);
            } else {
                var worldPt = screenToWorld(e.clientX, e.clientY);
                var btnHit = findInteractiveButtonAt(worldPt);
                if (btnHit) {
                    canvas.style.cursor = 'pointer';
                    tooltip.style.display = 'none';
                    return;
                } else {
                    canvas.style.cursor = 'default';
                }

                var hit = findNodeAt(e.clientX, e.clientY);
                hoveredOrbitNode = hit;

                if (hit && !hit.isCenter) {
                    var rect = wrap.getBoundingClientRect();
                    tooltip.style.display = 'block';
                    tooltip.style.left = Math.min(rect.width - 400, Math.max(10, e.clientX - rect.left + 15)) + 'px';
                    tooltip.style.top = (e.clientY - rect.top + 10) + 'px';
                    tooltip.style.maxWidth = hit.isTrail ? '390px' : (hit.isDirect ? '340px' : '280px');
                    
                    var tagsList = (hit.tags || []).slice(0, 5).map(function(t) { return '#' + t; }).join(' ');
                    var anchorsList = (hit.anchors || []).map(function(a) { return '<code>' + escapeHtml(a) + '</code>'; }).join(' ');
                    var origBlock = hit.origin ? '<div style="color:#c9d1d9; font-style:italic; font-size:0.75rem; margin-bottom:6px; background:rgba(0,0,0,0.3); border-left:2px solid ' + hit.color + '; padding:4px 8px; border-radius:0 3px 3px 0;">❝ ' + escapeHtml(hit.origin) + ' ❞</div>' : '';
                    var narrBlock = hit.narrative ? '<div style="color:#c9d1d9; font-size:0.76rem; line-height:1.4; margin-bottom:6px; background:rgba(0,0,0,0.4); border:1px solid #21262d; padding:6px 8px; border-radius:4px;">' + escapeHtml(hit.narrative) + '</div>' : '';

                    if (hit.isTrail) {
                        tooltip.innerHTML = 
                            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                                '<span style="font-weight:700; font-size:0.92rem; color:' + hit.color + ';">[' + escapeHtml(hit.id) + '] ' + escapeHtml(hit.domain) + '</span>' +
                                '<span style="font-size:0.68rem; background:rgba(255,255,255,0.1); padding:1px 6px; border-radius:3px; color:#8b949e;">' + (hit.linksCount || 0) + ' links</span>' +
                            '</div>' +
                            '<div style="font-weight:700; font-size:0.88rem; color:#f0f6fc; margin-bottom:4px;">' + escapeHtml(hit.title) + '</div>' +
                            '<div style="color:#8b949e; font-size:0.7rem; margin-bottom:6px;">🌟 Promoted View: Trail History Node' + (hit.isDocked ? ' • 🦴 Docked' : '') + '</div>' +
                            origBlock +
                            narrBlock +
                            (anchorsList ? '<div style="margin-bottom:6px; font-size:0.72rem;">Anchors: ' + anchorsList + '</div>' : '') +
                            '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#8b949e; border-top:1px solid #21262d; padding-top:4px;">' +
                                '<span style="color:#58a6ff;">' + (tagsList ? escapeHtml(tagsList) : '') + '</span>' +
                                '<span style="color:#3fb950; font-weight:bold;">👉 Click to focus</span>' +
                            '</div>';

                    } else if (hit.isDirect) {
                        tooltip.innerHTML = 
                            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                                '<span style="font-weight:700; font-size:0.9rem; color:' + hit.color + ';">[' + escapeHtml(hit.id) + '] ' + escapeHtml(hit.domain) + '</span>' +
                                '<span style="font-size:0.68rem; background:rgba(255,255,255,0.1); padding:1px 6px; border-radius:3px; color:#8b949e;">' + (hit.linksCount || 0) + ' links</span>' +
                            '</div>' +
                            '<div style="font-weight:600; font-size:0.84rem; color:#f0f6fc; margin-bottom:4px;">' + escapeHtml(hit.title) + '</div>' +
                            '<div style="color:#8b949e; font-size:0.7rem; margin-bottom:6px;">🔗 1-Hop Neighbor (Promoted Description &amp; Context)</div>' +
                            origBlock +
                            narrBlock +
                            (anchorsList ? '<div style="margin-bottom:6px; font-size:0.72rem;">Anchors: ' + anchorsList + '</div>' : '') +
                            '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#8b949e; border-top:1px solid #21262d; padding-top:4px;">' +
                                '<span style="color:#58a6ff;">' + (tagsList ? escapeHtml(tagsList) : '') + '</span>' +
                                '<span style="color:#3fb950; font-weight:bold;">👉 Click to focus</span>' +
                            '</div>';

                    } else if (hit.isGrandchild) {
                        var narrSnippet = (hit.narrative || '').slice(0, 160);
                        if (narrSnippet.length >= 160) narrSnippet += '...';
                        
                        tooltip.innerHTML = 
                            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                                '<span style="font-weight:700; font-size:0.86rem; color:' + hit.color + ';">[' + escapeHtml(hit.id) + '] ' + escapeHtml(hit.domain) + '</span>' +
                                '<span style="font-size:0.68rem; color:#8b949e;">Grandchild Dot</span>' +
                            '</div>' +
                            '<div style="font-weight:600; font-size:0.82rem; color:#f0f6fc; margin-bottom:4px;">' + escapeHtml(hit.title) + '</div>' +
                            (narrSnippet ? '<div style="color:#c9d1d9; font-size:0.74rem; line-height:1.35; margin-bottom:4px; background:rgba(0,0,0,0.3); padding:4px 6px; border-radius:3px;">' + escapeHtml(narrSnippet) + '</div>' : '') +
                            '<div style="text-align:right; font-size:0.68rem; color:#3fb950; font-weight:bold; border-top:1px solid #21262d; padding-top:3px;">👉 Click to focus</div>';
                    }

                } else {
                    tooltip.style.display = 'none';
                }
            }
        });

        window.addEventListener('mouseup', function() { isPanning = false; });

        wrap.addEventListener('wheel', function(e) {
            e.preventDefault();
            var delta = e.deltaY < 0 ? 1.15 : 0.88;
            var newZoom = Math.min(3.0, Math.max(0.5, zoom * delta));
            var rect = wrap.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            panX = mx - (mx - panX) * (newZoom / zoom);
            panY = my - (my - panY) * (newZoom / zoom);
            zoom = newZoom;
            simEnergy = Math.max(simEnergy, 0.15);
        });

        function resizeCanvas() {
            width = wrap.clientWidth || 800;
            height = wrap.clientHeight || 720;
            dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            simEnergy = Math.max(simEnergy, 0.4);
            computeConstellation();
        }
        window.addEventListener('resize', resizeCanvas);

        window.__resetSynapseView = function() {
            zoom = 1.0;
            panX = 0;
            panY = 0;
            simEnergy = Math.max(simEnergy, 0.5);
            computeConstellation();
        };

        var btnReset = document.getElementById('btnSynapseReset');
        if (btnReset) btnReset.onclick = function() {
            window.__resetSynapseView();
        };

        var btnDepth = document.getElementById('btnSynapseDepth');
        if (btnDepth) btnDepth.onclick = function() {
            hopDepth = (hopDepth === 1) ? 2 : 1;
            this.textContent = 'Hop Depth: ' + hopDepth + '-Hop';
            computeConstellation();
        };

        var sSearch = document.getElementById('synapseSearchInput');
        if (sSearch) {
            sSearch.oninput = function() {
                var q = this.value.toLowerCase().trim();
                if (!q) {
                    synapseFilterDomain = 'ALL';
                    document.querySelectorAll('.synapse-domain-chip').forEach(function(c) {
                        if (c.dataset.domain === 'ALL') c.classList.add('active');
                        else c.classList.remove('active');
                    });
                    computeConstellation();
                    return;
                }
                var cardsMap = getCardsMap();
                var allCards = Object.values(cardsMap);
                var match = allCards.find(function(c) {
                    return (c.id && c.id.toLowerCase().indexOf(q) !== -1) || ((c.title || (c.synthesis && c.synthesis.title) || '').toLowerCase().indexOf(q) !== -1);
                });
                if (match && window.focusCardInSynapse) window.focusCardInSynapse(match.id);
            };
            sSearch.onkeydown = function(e) {
                if (e.key === 'Escape') {
                    this.value = '';
                    synapseFilterDomain = 'ALL';
                    document.querySelectorAll('.synapse-domain-chip').forEach(function(c) {
                        if (c.dataset.domain === 'ALL') c.classList.add('active');
                        else c.classList.remove('active');
                    });
                    computeConstellation();
                }
            };
        }

        var DOMAIN_ROOTS = {
            'PHL': 'PHL-001',
            'BKM': 'BKM-001',
            'FEAT': 'FEAT-582',
            'WIS': 'WIS-001',
            'DISC': 'DISC-001',
            'RDNA': 'RDNA-001',
            'SPRINT': 'SPRINT_LOG_SPR_88',
            'GEMS': 'PHL-007'
        };

        document.querySelectorAll('.synapse-domain-chip').forEach(function(chip) {
            chip.addEventListener('click', function() {
                document.querySelectorAll('.synapse-domain-chip').forEach(function(c) { c.classList.remove('active'); });
                chip.classList.add('active');
                synapseFilterDomain = chip.dataset.domain;
                if (synapseFilterDomain !== 'ALL' && synapseFilterDomain !== 'BONES') {
                    var dRoot = DOMAIN_ROOTS[synapseFilterDomain];
                    var direct = getNeighborsFor(window.__focalNodeId || 'PHL-001');
                    var cardsMap = getCardsMap();
                    var hasNeighborInDomain = direct.some(function(n) {
                        var card = cardsMap[n.targetId];
                        var d = (card && card.domain) || n.targetId.split('-')[0];
                        return d.toUpperCase() === synapseFilterDomain;
                    });
                    if (!hasNeighborInDomain && dRoot && window.focusCardInSynapse) {
                        window.focusCardInSynapse(dRoot);
                        return;
                    }
                }
                computeConstellation();
            });
        });

        var btnHome = document.getElementById('btnSynapseHome');
        if (btnHome) {
            btnHome.onclick = function() {
                if (window.focusCardInSynapse) window.focusCardInSynapse('PHL-001');
            };
        }

        var btnLocateTop = document.getElementById('btnSynapseLocateTop');
        if (btnLocateTop) btnLocateTop.onclick = function() {
            if (window.locateCardInGrid) window.locateCardInGrid(window.__focalNodeId || 'PHL-001');
        };
    }

    window.initEgoSynapseCanvas = initEgoSynapseCanvas;
})();
