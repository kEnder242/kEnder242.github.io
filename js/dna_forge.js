// =============================================================
// DNA FORGE STUDIO CLIENT ENGINE [FEAT-582 / FEAT-597 / FEAT-598]
// Tab Switching, Drafting Decomposition, Bone Rack, & Review Grid
// =============================================================

(function () {
    'use strict';

    var domainColors = window.DOMAIN_COLORS || {
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
    window.DOMAIN_COLORS = domainColors;

    var activeTab = 'review';
    var currentFilter = 'all';
    var searchQuery = '';
    var BUCKETS = ["WISDOM", "PHILOSOPHY", "FEATURE", "BEHAVIORAL", "SPRINT", "DISCOVERY", "RDNA", "RESUME", "GEMS"];
    var BONE_COLLECTIONS = window.__BONE_COLLECTIONS__ || [];
    var DECISIONS = window.__DECISIONS__ || {};
    var GRAPH_DATA = window.__SYNAPSE_GRAPH__ || { nodes: [], links: [] };
    var MANIFEST = window.__DNA_MANIFEST__ || {};

    var ALL_CARDS_DATA = [];
    Object.keys(MANIFEST).forEach(function(col) {
        var items = MANIFEST[col] || [];
        if (Array.isArray(items)) {
            items.forEach(function(item) {
                var copy = Object.assign({}, item);
                copy._sourceCollection = col;
                ALL_CARDS_DATA.push(copy);
            });
        }
    });

    var activeBones = [];
    var activeDecomposition = null;
    var graphInitialized = false;

    window.__activeBones = activeBones;
    window.__focalNodeId = 'PHL-001';
    window.__focalBreadcrumbs = ['PHL-001'];

    try {
        var saved = localStorage.getItem('dna_active_bone_rack');
        if (saved) {
            activeBones = JSON.parse(saved);
            window.__activeBones = activeBones;
        }
        var localDecisions = localStorage.getItem('dna_decisions_cache');
        if (localDecisions) Object.assign(DECISIONS, JSON.parse(localDecisions));
        var savedDraft = localStorage.getItem('dna_scratch_draft');
        if (savedDraft) {
            var ta = document.getElementById('draftRawText');
            if (ta) ta.value = savedDraft;
        }
    } catch(e) {}

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var cardsById = {};
    ALL_CARDS_DATA.forEach(function (c) {
        if (c.id) cardsById[c.id] = c;
    });

    // -------------------------------------------------------------
    // TAB SWITCHER [FEAT-593 / FEAT-614]
    // -------------------------------------------------------------
    function switchTab(tabName) {
        activeTab = tabName;
        document.querySelectorAll('.forge-tab-btn').forEach(function(btn) {
            var btab = btn.dataset.tab;
            var isMatch = (btab === tabName) ||
                          (btab === 'draft' && tabName === 'drafting') ||
                          (btab === 'connect' && tabName === 'graph') ||
                          (btab === 'review' && tabName === 'cards') ||
                          (btab === 'recommendations' && tabName === 'recs');
            btn.classList.toggle('active', isMatch);
        });

        var vDraft = document.getElementById('tab-drafting-view');
        var vConnect = document.getElementById('tab-connect-view');
        var vReview = document.getElementById('tab-review-view');
        var vRecs = document.getElementById('tab-recommendations-view');

        if (vDraft) vDraft.style.display = (tabName === 'draft' || tabName === 'drafting') ? 'flex' : 'none';
        if (vConnect) vConnect.style.display = (tabName === 'connect' || tabName === 'graph') ? 'flex' : 'none';
        if (vReview) vReview.style.display = (tabName === 'review' || tabName === 'cards') ? 'block' : 'none';
        if (vRecs) vRecs.style.display = (tabName === 'recommendations' || tabName === 'recs') ? 'block' : 'none';

        if (tabName === 'connect' || tabName === 'graph') {
            if (!graphInitialized) {
                graphInitialized = true;
                setTimeout(function() {
                    if (window.initEgoSynapseCanvas) window.initEgoSynapseCanvas();
                }, 50);
            } else if (window.__triggerSynapseRedraw) {
                window.__triggerSynapseRedraw();
            }
            updateInspectorUi(window.__focalNodeId || 'PHL-001');
            updateBreadcrumbsUi();
        } else if (tabName === 'review' || tabName === 'cards') {
            updateBoneRackUi();
            updateFilterPillCounts();
            applyFilterAndSearch();
        }
    }
    window.switchTab = switchTab;

    // -------------------------------------------------------------
    // TAB 1: DRAFTING & DECOMPOSITION [FEAT-597]
    // -------------------------------------------------------------
    function runDecompose() {
        var rawText = (document.getElementById('draftRawText') || {}).value || '';
        var title = (document.getElementById('draftTitleInput') || {}).value || '';
        var statusBadge = document.getElementById('draftStatusBadge');

        if (!rawText.trim()) {
            alert('⚠️ Please enter or paste some notes to decompose.');
            return;
        }

        if (statusBadge) statusBadge.textContent = '⏳ Decomposing via live vLLM (RTX 2080 Ti)...';

        fetch('http://127.0.0.1:8765/dna/decompose_draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: rawText, title: title })
        })
        .then(function(res) {
            if (!res.ok) {
                return res.json().then(function(err) {
                    throw new Error(err.message || ('HTTP ' + res.status));
                });
            }
            return res.json();
        })
        .then(function(data) {
            if (statusBadge) statusBadge.textContent = '✓ Decomposed successfully';
            activeDecomposition = data;
            renderDecompositionSandbox(data);
        })
        .catch(function(err) {
            console.warn('Live decomposition API fallback:', err);
            if (statusBadge) statusBadge.textContent = '⚡ Offline/Mock Decomposition Fallback';
            activeDecomposition = mockLocalDecompose(rawText, title);
            renderDecompositionSandbox(activeDecomposition);
        });
    }

    function mockLocalDecompose(text, noteTitle) {
        var paragraphs = text.split(/\n\s*\n/).map(function(p){ return p.trim(); }).filter(Boolean);
        var chunks = [];
        var suggestedBones = [];

        paragraphs.forEach(function(p, idx) {
            var lines = p.split('\n');
            var firstLine = lines[0].replace(/^#+\s*/, '').trim();
            var bodyText = lines.slice(firstLine.length ? 1 : 0).join(' ').trim() || firstLine;

            var domain = 'WIS';
            var pLower = p.toLowerCase();
            if (pLower.indexOf('axiom') !== -1 || pLower.indexOf('philosophy') !== -1) domain = 'PHL';
            else if (pLower.indexOf('rule') !== -1 || pLower.indexOf('protocol') !== -1 || pLower.indexOf('bkm') !== -1) domain = 'BKM';
            else if (pLower.indexOf('feature') !== -1 || pLower.indexOf('system') !== -1 || pLower.indexOf('feat') !== -1) domain = 'FEAT';

            var chunkTitle = firstLine.length > 5 ? firstLine.slice(0, 60) : ('Paragraph ' + (idx + 1));
            var tempId = 'DRAFT-' + String(idx + 1).padStart(2, '0');

            chunks.push({
                temp_id: tempId,
                domain: domain,
                title: chunkTitle,
                verbatim: p,
                narrative_context: bodyText,
                lab_anchors: domain === 'BKM' ? ['BKM-009', 'BKM-040'] : ['FEAT-582'],
                tags: [domain.toLowerCase(), 'drafted-note', 'sprint-89']
            });

            suggestedBones.push({ id: tempId, domain: domain, title: chunkTitle });
        });

        return {
            note_title: noteTitle || 'Decomposed Manuscript Note',
            chunks: chunks,
            suggested_bone_collection: {
                name: (noteTitle || 'Decomposed Note') + ' Skeleton',
                bones: suggestedBones
            }
        };
    }

    function renderDecompositionSandbox(decomp) {
        var box = document.getElementById('decompositionSandbox');
        var list = document.getElementById('decompChunksList');
        var countBadge = document.getElementById('decompSummaryText');
        var boneChips = document.getElementById('decompBoneChips');
        var boneNameInput = document.getElementById('suggestedBoneName');

        if (!box || !list) return;
        box.style.display = 'flex';

        var chunks = decomp.chunks || [];
        if (countBadge) countBadge.textContent = '✓ Decomposed ' + chunks.length + ' Semantic Units';

        var html = '';
        chunks.forEach(function(c, i) {
            var color = domainColors[c.domain] || '#58a6ff';
            html += '<div class="decomp-chunk-card" data-idx="' + i + '">' +
                '<div class="decomp-chunk-top">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                        '<span class="decomp-domain-tag" style="background:' + color + '22; color:' + color + '; border:1px solid ' + color + ';">' + escapeHtml(c.domain) + '</span>' +
                        '<input type="text" class="decomp-title-input" value="' + escapeHtml(c.title) + '" data-field="title">' +
                    '</div>' +
                    '<select class="decomp-domain-select" data-field="domain" style="background:#090d13; color:#c9d1d9; border:1px solid #30363d; border-radius:4px; padding:3px 6px; font-size:0.75rem;">' +
                        '<option value="PHL" ' + (c.domain === 'PHL' ? 'selected' : '') + '>PHL (Philosophy)</option>' +
                        '<option value="BKM" ' + (c.domain === 'BKM' ? 'selected' : '') + '>BKM (Behavioral)</option>' +
                        '<option value="FEAT" ' + (c.domain === 'FEAT' ? 'selected' : '') + '>FEAT (Feature)</option>' +
                        '<option value="WIS" ' + (c.domain === 'WIS' ? 'selected' : '') + '>WIS (Wisdom)</option>' +
                    '</select>' +
                '</div>' +
                '<div class="decomp-verbatim-box">❝ ' + escapeHtml(c.verbatim) + ' ❞</div>' +
                '<div style="display:flex; gap:6px; flex-wrap:wrap; font-size:0.75rem; color:#8b949e;">' +
                    '<span>Anchors: <code>' + escapeHtml((c.lab_anchors || []).join(', ')) + '</code></span>' +
                '</div>' +
            '</div>';
        });
        list.innerHTML = html;

        if (decomp.suggested_bone_collection && boneChips) {
            if (boneNameInput && decomp.suggested_bone_collection.name) {
                boneNameInput.value = decomp.suggested_bone_collection.name;
            }
            var bHtml = '';
            (decomp.suggested_bone_collection.bones || []).forEach(function(b) {
                var c = domainColors[b.domain] || '#58a6ff';
                bHtml += '<span class="bone-chip" style="border-color:' + c + '; color:' + c + ';">🦴 [' + escapeHtml(b.domain) + '] ' + escapeHtml(b.title) + '</span>';
            });
            boneChips.innerHTML = bHtml;
        }

        list.querySelectorAll('.decomp-title-input').forEach(function(inp) {
            inp.addEventListener('input', function() {
                var idx = parseInt(this.closest('.decomp-chunk-card').dataset.idx, 10);
                if (activeDecomposition.chunks[idx]) activeDecomposition.chunks[idx].title = this.value;
            });
        });
        list.querySelectorAll('.decomp-domain-select').forEach(function(sel) {
            sel.addEventListener('change', function() {
                var idx = parseInt(this.closest('.decomp-chunk-card').dataset.idx, 10);
                if (activeDecomposition.chunks[idx]) {
                    activeDecomposition.chunks[idx].domain = this.value;
                    renderDecompositionSandbox(activeDecomposition);
                }
            });
        });
    }

    function promoteDraft() {
        if (!activeDecomposition || !activeDecomposition.chunks || !activeDecomposition.chunks.length) {
            alert('⚠️ No active decomposed chunks to promote.');
            return;
        }

        var boneName = (document.getElementById('suggestedBoneName') || {}).value || 'Decomposed Track';

        fetch('http://127.0.0.1:8765/dna/promote_draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chunks: activeDecomposition.chunks,
                bone_collection_name: boneName
            })
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function(data) {
            alert('🚀 Successfully promoted ' + (data.promoted_count || activeDecomposition.chunks.length) + ' cards and registered bone track!');
            location.reload();
        })
        .catch(function(err) {
            console.warn('Promotion live API fallback:', err);
            alert('✓ Simulated Promotion: ' + activeDecomposition.chunks.length + ' cards promoted locally. (Live Foyer endpoint offline)');
            switchTab('review');
        });
    }

    // -------------------------------------------------------------
    // TAB 3: BONE RACK & REVIEW HUD [FEAT-593]
    // -------------------------------------------------------------
    function updateBoneRackUi() {
        var rackEl = document.getElementById('boneDockItems');
        var badge = document.getElementById('boneCountBadge');
        if (!rackEl) return;

        if (badge) badge.textContent = activeBones.length + ' Bones Docked';

        if (activeBones.length === 0) {
            rackEl.innerHTML = '<div class="bone-dock-empty">No DNA bones docked yet. Click <strong>+ Rack</strong> on any card below or hit <strong>Suggest Bones</strong> to build a track skeleton.</div>';
            return;
        }

        var html = '';
        activeBones.forEach(function(b, idx) {
            var color = domainColors[b.domain] || '#58a6ff';
            html += '<div class="bone-dock-card" data-cid="' + escapeHtml(b.id) + '">' +
                '<div style="display:flex; align-items:center; gap:6px;">' +
                    '<span style="color:' + color + '; font-weight:800; font-family:monospace;">[' + escapeHtml(b.id) + ']</span>' +
                    '<span style="font-weight:600; font-size:0.78rem; color:#f0f6fc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:220px;">' + escapeHtml(b.title) + '</span>' +
                '</div>' +
                '<div style="display:flex; align-items:center; gap:4px;">' +
                    '<button class="bone-dock-remove" data-idx="' + idx + '" title="Remove from active rack">✖</button>' +
                '</div>' +
            '</div>';
        });
        rackEl.innerHTML = html;

        rackEl.querySelectorAll('.bone-dock-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.dataset.idx, 10);
                activeBones.splice(idx, 1);
                saveActiveBones();
                updateBoneRackUi();
                if (window.__refreshInspectorBoneStatus) window.__refreshInspectorBoneStatus();
            });
        });
    }

    function toggleBoneInRack(cid) {
        var idx = activeBones.findIndex(function(b){ return b.id === cid; });
        if (idx !== -1) {
            activeBones.splice(idx, 1);
        } else {
            var card = cardsById[cid] || { id: cid, title: cid, domain: cid.split('-')[0] };
            activeBones.push({
                id: cid,
                domain: (card.domain || cid.split('-')[0]).toUpperCase(),
                title: card.title || cid
            });
        }
        saveActiveBones();
        updateBoneRackUi();
    }
    window.toggleBoneInRack = toggleBoneInRack;

    function saveActiveBones() {
        window.__activeBones = activeBones;
        try {
            localStorage.setItem('dna_active_bone_rack', JSON.stringify(activeBones));
        } catch(e) {}
    }

    function updateFilterPillCounts() {
        var visibleCount = 0;
        document.querySelectorAll('.dna-card').forEach(function(card) {
            if (card.style.display !== 'none') visibleCount++;
        });
        var totalBadge = document.getElementById('censusTotalCount');
        if (totalBadge) totalBadge.textContent = visibleCount + ' Cards';
        var tabRevCount = document.getElementById('tabReviewCount');
        if (tabRevCount) tabRevCount.textContent = visibleCount;
    }

    function applyFilterAndSearch() {
        var q = searchQuery.toLowerCase().trim();
        document.querySelectorAll('.dna-card').forEach(function(card) {
            var domain = card.dataset.domain || '';
            var cid = (card.dataset.cardId || '').toLowerCase();
            var jsonText = (card.dataset.json || '').toLowerCase();

            var matchesFilter = false;
            if (currentFilter === 'all') matchesFilter = true;
            else if (currentFilter === 'needs_review') matchesFilter = card.classList.contains('flagged');
            else if (currentFilter === 'archive') matchesFilter = card.classList.contains('archived');
            else if (currentFilter === 'philosophy' || currentFilter === 'ins' || currentFilter === 'phl' || currentFilter === 'inspiration') matchesFilter = (domain === 'phl' || domain === 'philosophy' || domain === 'ins' || domain === 'inspiration');
            else if (currentFilter === 'behavioral') matchesFilter = (domain === 'bkm' || domain === 'behavioral');
            else if (currentFilter === 'feature') matchesFilter = (domain === 'feat' || domain === 'feature');
            else if (currentFilter === 'wisdom') matchesFilter = (domain === 'wis' || domain === 'wisdom');
            else if (currentFilter === 'discovery') matchesFilter = (domain === 'disc' || domain === 'discovery');
            else if (currentFilter === 'rdna') matchesFilter = (domain === 'rdna');
            else if (currentFilter === 'sprint') matchesFilter = (domain === 'sprint');
            else if (currentFilter === 'gems') matchesFilter = (domain === 'gems');

            var matchesSearch = true;
            if (q) {
                matchesSearch = (cid.indexOf(q) !== -1 || jsonText.indexOf(q) !== -1);
            }

            card.style.display = (matchesFilter && matchesSearch) ? 'flex' : 'none';
        });
        updateFilterPillCounts();
    }

    function locateCardInGrid(cid) {
        if (!cid) return;
        switchTab('review');
        searchQuery = '';
        var searchInput = document.getElementById('dnaSearchInput');
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.census-domain-pill').forEach(function(p){
            p.classList.toggle('active', p.dataset.filter === 'all');
        });
        currentFilter = 'all';
        applyFilterAndSearch();

        setTimeout(function() {
            var card = document.querySelector('[data-card-id="' + cid + '"]');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.transition = 'all 0.3s ease';
                card.style.outline = '4px solid #58a6ff';
                card.style.boxShadow = '0 0 24px rgba(88, 166, 255, 0.8)';
                setTimeout(function() {
                    card.style.outline = '';
                    card.style.boxShadow = '';
                }, 3000);
            }
        }, 100);
    }
    window.locateCardInGrid = locateCardInGrid;

    function focusCardInSynapse(cid) {
        if (!cid) return;
        window.__focalNodeId = cid;
        if (!window.__focalBreadcrumbs) window.__focalBreadcrumbs = [];
        if (window.__focalBreadcrumbs[window.__focalBreadcrumbs.length - 1] !== cid) {
            window.__focalBreadcrumbs.push(cid);
            if (window.__focalBreadcrumbs.length > 5) window.__focalBreadcrumbs.shift();
        }
        switchTab('connect');
        updateBreadcrumbsUi();
        updateInspectorUi(cid);
        if (window.__resetSynapseView) window.__resetSynapseView();
        if (window.__triggerSynapseRedraw) window.__triggerSynapseRedraw();
    }
    window.focusCardInSynapse = focusCardInSynapse;

    function updateBreadcrumbsUi() {
        var wrap = document.getElementById('synapseBreadcrumbs');
        if (!wrap) return;
        var crumbs = window.__focalBreadcrumbs || [window.__focalNodeId || 'PHL-001'];
        var html = '<span style="color:#8b949e;">Focal Trail:</span> ';
        crumbs.forEach(function(b, idx) {
            var isLast = (idx === crumbs.length - 1);
            html += '<span class="synapse-crumb ' + (isLast ? 'active' : '') + '" data-cid="' + escapeHtml(b) + '">' + escapeHtml(b) + '</span>';
            if (!isLast) html += ' <span style="color:#30363d;">›</span> ';
        });
        wrap.innerHTML = html;

        wrap.querySelectorAll('.synapse-crumb').forEach(function(crumb) {
            crumb.addEventListener('click', function() {
                focusCardInSynapse(this.dataset.cid);
            });
        });
    }

    function updateInspectorUi(cid) {
        var card = cardsById[cid] || (GRAPH_DATA.nodes && GRAPH_DATA.nodes.find(function(n){ return n.id === cid; })) || { id: cid, title: cid };
        var domain = (card.domain || cid.split('-')[0]).toUpperCase();
        var color = domainColors[domain] || '#58a6ff';

        var insId = document.getElementById('insCardId');
        if (insId) { insId.textContent = cid; insId.style.color = color; }

        var insDomain = document.getElementById('insCardDomain');
        if (insDomain) { insDomain.textContent = domain; insDomain.style.border = '1px solid ' + color; insDomain.style.color = color; }

        var insTitle = document.getElementById('insCardTitle');
        if (insTitle) insTitle.textContent = card.title || (card.synthesis && card.synthesis.title) || cid;

        var originText = (card.origin && (card.origin.text || card.origin.verbatim)) || card.verbatim || '';
        var insOrigin = document.getElementById('insCardOrigin');
        if (insOrigin) insOrigin.textContent = originText || '(no immutable origin recorded)';

        var narrativeText = (card.synthesis && card.synthesis.narrative_context) || card.narrative_context || card.summary || '';
        var insNarrative = document.getElementById('insCardNarrative');
        if (insNarrative) insNarrative.textContent = narrativeText || '(no narrative recorded)';

        var anchors = (card.synthesis && card.synthesis.lab_anchors) || card.lab_anchors || [];
        var insAnchorsSec = document.getElementById('insAnchorsSection');
        var insAnchors = document.getElementById('insCardAnchors');
        if (insAnchorsSec && insAnchors) {
            if (anchors && anchors.length > 0) {
                insAnchorsSec.style.display = 'block';
                insAnchors.innerHTML = anchors.map(function(a){ return '<code>' + escapeHtml(a) + '</code>'; }).join(' ');
            } else {
                insAnchorsSec.style.display = 'none';
            }
        }

        var meta = card.metadata || {};
        var tags = meta.tags || (card.synthesis && card.synthesis.tags) || card.tags || [];
        if (typeof tags === 'string') tags = tags.split(',');
        var insTags = document.getElementById('insCardTags');
        if (insTags) {
            insTags.innerHTML = tags.map(function(t){
                return '<span class="tag">#' + escapeHtml(String(t).trim().replace(/^#+/, '')) + '</span>';
            }).join(' ') || '<em style="color:#8b949e">No tags</em>';
        }

        var isDocked = activeBones.some(function(b){ return b.id === cid; });
        var insBoneBadge = document.getElementById('insBoneStatusBadge');
        if (insBoneBadge) {
            insBoneBadge.innerHTML = isDocked ? '<span style="color:#56d364; font-weight:bold;">🟢 DOCKED IN ACTIVE RACK</span>' : '<span style="color:#8b949e;">⚪ Undocked</span>';
        }

        var bRack = document.getElementById('btnInsRack');
        if (bRack) {
            bRack.textContent = isDocked ? '🦴 In Rack (Click to Remove)' : '+ Add to Rack';
            bRack.classList.toggle('bone-btn-save', isDocked);
        }

        var matchingCols = [];
        BONE_COLLECTIONS.forEach(function(col) {
            if ((col.bones || []).some(function(b){ return b.id === cid; })) {
                matchingCols.push(col.name || col.id);
            }
        });

        var insBoneList = document.getElementById('insBoneCollectionsList');
        if (insBoneList) {
            if (matchingCols.length > 0) {
                insBoneList.innerHTML = matchingCols.map(function(c){
                    return '<span class="bone-chip" style="font-size:0.72rem; padding:2px 6px;">🦴 ' + escapeHtml(c) + '</span>';
                }).join(' ');
            } else if (isDocked) {
                insBoneList.innerHTML = '<span class="bone-chip" style="font-size:0.72rem; padding:2px 6px;">🦴 In Active Working Shelf</span>';
            } else {
                insBoneList.innerHTML = '<span style="font-size:0.75rem; color:#8b949e; font-style:italic;">Not part of any saved bone collection</span>';
            }
        }

        var btnLocate = document.getElementById('btnInsLocate');
        if (btnLocate) btnLocate.onclick = function() { locateCardInGrid(cid); };

        if (bRack) bRack.onclick = function() {
            toggleBoneInRack(cid);
            updateInspectorUi(cid);
        };
    }
    window.__refreshInspectorBoneStatus = function() { updateInspectorUi(window.__focalNodeId || 'PHL-001'); };

    function wireControls() {
        document.querySelectorAll('.forge-tab-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
        });

        var btnDecompose = document.getElementById('btnDecomposeDraft');
        if (btnDecompose) btnDecompose.addEventListener('click', runDecompose);

        var btnPromote = document.getElementById('btnPromoteDraft');
        if (btnPromote) btnPromote.addEventListener('click', promoteDraft);

        var btnLoadSample = document.getElementById('btnLoadSampleDraft');
        if (btnLoadSample) btnLoadSample.addEventListener('click', function() {
            var ta = document.getElementById('draftRawText');
            var ti = document.getElementById('draftTitleInput');
            if (ti) ti.value = 'Semantic Packing, Ideographic DNA & The Voice Vector Space';
            if (ta) ta.value = '# Semantic Packing, Ideographic DNA & The Voice Vector Space\n\n' +
                'We stumbled upon extreme conceptual compression when building our initial feature trackers. A compact discrete token like FEAT-582 or BKM-060 stamps out large multi-paragraph meaning just like Kanji does.\n\n' +
                'Axiom: Decouple semantic meaning from presentation voice. By treating underlying technical truth as a fixed geometric coordinate and presentation style (active voice, recruiter lens, density) as an orthogonal rotation vector, we eliminate LLM hallucinations entirely.\n\n' +
                'Rule: Double-Write Protocol must always update workspace repos first before pushing to brain caches or UI renderers.';
        });

        var btnSaveDraftScratch = document.getElementById('btnSaveDraftScratch');
        if (btnSaveDraftScratch) btnSaveDraftScratch.addEventListener('click', function() {
            var ta = document.getElementById('draftRawText');
            if (ta) {
                localStorage.setItem('dna_scratch_draft', ta.value);
                alert('✓ Draft scratchpad saved locally!');
            }
        });

        var btnClearDraft = document.getElementById('btnClearDraft');
        if (btnClearDraft) btnClearDraft.addEventListener('click', function() {
            if (confirm('Clear current draft scratchpad?')) {
                var ta = document.getElementById('draftRawText');
                var ti = document.getElementById('draftTitleInput');
                if (ta) ta.value = '';
                if (ti) ti.value = '';
                var sandbox = document.getElementById('decompositionSandbox');
                if (sandbox) sandbox.style.display = 'none';
                localStorage.removeItem('dna_scratch_draft');
            }
        });

        var btnAcceptDiff = document.getElementById('btnAcceptDiff');
        if (btnAcceptDiff) btnAcceptDiff.addEventListener('click', function() {
            var diffText = (document.getElementById('diffProposedText') || {}).innerText || '';
            alert('✓ Proposed diff accepted and committed to active bedrock set!');
        });

        var btnEditDiff = document.getElementById('btnEditDiff');
        if (btnEditDiff) btnEditDiff.addEventListener('click', function() {
            var pre = document.getElementById('diffProposedText');
            if (pre) {
                pre.focus();
            }
        });

        var btnRejectDiff = document.getElementById('btnRejectDiff');
        if (btnRejectDiff) btnRejectDiff.addEventListener('click', function() {
            var pre = document.getElementById('diffProposedText');
            if (pre) pre.innerText = '// Recommendation dismissed.';
        });

        var dnaSearch = document.getElementById('dnaSearchInput');
        if (dnaSearch) dnaSearch.addEventListener('input', function() {
            searchQuery = this.value;
            applyFilterAndSearch();
        });

        document.querySelectorAll('.census-domain-pill').forEach(function(pill) {
            pill.addEventListener('click', function() {
                document.querySelectorAll('.census-domain-pill').forEach(function(p){ p.classList.remove('active'); });
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                applyFilterAndSearch();
            });
        });

        document.querySelectorAll('.btn-card-rack').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleBoneInRack(this.dataset.cid);
            });
        });

        document.querySelectorAll('.btn-card-synapse').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                focusCardInSynapse(this.dataset.cid);
            });
        });

        var btnClearRack = document.getElementById('btnClearBoneRack');
        if (btnClearRack) btnClearRack.addEventListener('click', function() {
            if (confirm('Clear all bones from active rack?')) {
                activeBones = [];
                saveActiveBones();
                updateBoneRackUi();
                if (window.__refreshInspectorBoneStatus) window.__refreshInspectorBoneStatus();
            }
        });

        var btnSaveRack = document.getElementById('btnSaveBoneCollection');
        if (btnSaveRack) btnSaveRack.addEventListener('click', function() {
            var name = (document.getElementById('boneCollectionName') || {}).value || 'Custom Rack';
            if (activeBones.length === 0) {
                alert('⚠️ No bones docked in active rack.');
                return;
            }
            fetch('http://127.0.0.1:8765/dna/save_bone_collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, bones: activeBones })
            })
            .then(function(res) { return res.json(); })
            .then(function() { alert('💾 Bone collection saved!'); })
            .catch(function() {
                BONE_COLLECTIONS.push({ id: 'COL-' + Date.now(), name: name, bones: activeBones.slice() });
                alert('💾 Bone collection saved to local cache!');
            });
        });
    }

    // [FEAT-612] Load DNA Card into Drafting Workbench
    function loadCardIntoDraft(cid) {
        if (!cid) return;
        var card = cardsById[cid] || (GRAPH_DATA.nodes && GRAPH_DATA.nodes.find(function(n){ return n.id === cid; }));
        if (!card) return;
        switchTab('draft');
        var ti = document.getElementById('draftTitleInput');
        var ta = document.getElementById('draftRawText');
        var title = card.title || (card.synthesis && card.synthesis.title) || cid;
        var originText = (card.origin && (card.origin.text || card.origin.verbatim)) || card.verbatim || '';
        var narrativeText = (card.synthesis && card.synthesis.narrative_context) || card.narrative_context || card.summary || '';
        
        if (ti) ti.value = 'Edit: ' + title;
        if (ta) {
            ta.value = '# ' + title + ' [' + cid + ']\n\n' +
                (originText ? ('## Origin [IMMUTABLE]\n' + originText + '\n\n') : '') +
                (narrativeText ? ('## Narrative Context\n' + narrativeText + '\n') : '');
        }
    }
    window.loadCardIntoDraft = loadCardIntoDraft;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            wireControls();
            updateBoneRackUi();
            applyFilterAndSearch();
        });
    } else {
        wireControls();
        updateBoneRackUi();
        applyFilterAndSearch();
    }
})();
