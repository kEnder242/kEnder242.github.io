// [FEAT-223] Global Error Sentry
// ── CONSOLIDATED GLOBAL ERROR TRAP (FEAT-268) ──
(function() {
    function reportError(msg, url, lineNo) {
        const fileName = url ? url.split('/').pop() : 'script';
        const formatted = `[JS ERROR] ${msg} (${fileName}:${lineNo})`;
        
        // 1. Route to sys-console if element exists on page (e.g. status.html)
        const consoleRow = document.getElementById('sys-console');
        if (consoleRow) {
            const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const div = document.createElement('div');
            div.style.color = '#ff3b30';
            div.style.marginBottom = '2px';
            div.innerText = `[${time}] ${formatted}`;
            consoleRow.appendChild(div);
            consoleRow.scrollTop = consoleRow.scrollHeight;
        }

        // 2. Custom page error callback if defined by host page
        if (typeof window.onSystemError === 'function') {
            window.onSystemError(formatted);
        }
    }

    window.onerror = function(msg, url, lineNo, columnNo, error) {
        reportError(msg, url, lineNo);
        return false;
    };

    // [FEAT-417] Consolidated Universal Error Trap & Live System Console Stream (`#sys-console`)
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason ? (event.reason.message || event.reason) : 'Unknown Promise Error';
        reportError(`Unhandled Rejection: ${reason}`, '', 0);
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Search Index
    let searchIndex = {};
    fetch('search_index.json?v=3.0')
        .then(response => response.json())
        .then(data => {
            searchIndex = data;
            console.log("Search Index Loaded:", Object.keys(data).length, "keys");
        })
        .catch(err => console.error('Error loading search index:', err));

    // 2. Quick Filter
    const searchInput = document.getElementById('nav-filter');
    const searchableContainer = document.getElementById('searchable-content');
    
    if (searchInput && searchableContainer) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            
            // Find ID matches from the index AND story bodies
            let matchedIds = new Set();
            
            if (term) {
                // A. Check Search Index
                Object.keys(searchIndex).forEach(key => {
                    if (key.includes(term)) {
                        searchIndex[key].forEach(id => matchedIds.add(id));
                    }
                });

                // B. Check Article Bodies (The "Surgical" Search)
                document.querySelectorAll('article').forEach(art => {
                    if (art.textContent.toLowerCase().includes(term)) {
                        matchedIds.add(art.id);
                    }
                });
            }
            
            // Filter Sidebar Lists
            const sections = searchableContainer.querySelectorAll('ul');
            sections.forEach(list => {
                const items = list.querySelectorAll('li');
                let hasVisibleItems = false;
                
                items.forEach(item => {
                    const link = item.querySelector('a');
                    const text = item.textContent.toLowerCase();
                    const href = link ? link.getAttribute('href') : '';
                    const id = href.startsWith('#') ? href.substring(1) : '';

                    const isVisible = (term === '' || text.includes(term) || (id && matchedIds.has(id)));
                    item.style.display = isVisible ? '' : 'none';
                    if (isVisible) hasVisibleItems = true;
                });

                // Hide the preceding header (H2) if no items match
                const header = list.previousElementSibling;
                if (header && header.tagName === 'H2') {
                    header.style.display = hasVisibleItems ? '' : 'none';
                }
            });

            // Filter Main Body Articles & Section Containers
            const articles = document.querySelectorAll('main article, article');
            articles.forEach(art => {
                const artId = art.id;
                const artText = art.textContent.toLowerCase();
                const isArticleVisible = (term === '' || (artId && matchedIds.has(artId)) || artText.includes(term));
                art.style.display = isArticleVisible ? '' : 'none';
            });

            const mainSections = document.querySelectorAll('main section');
            mainSections.forEach(sec => {
                const secArticles = sec.querySelectorAll('article');
                if (secArticles.length > 0) {
                    const hasVisible = Array.from(secArticles).some(a => a.style.display !== 'none');
                    sec.style.display = hasVisible ? '' : 'none';
                }
            });
        });
    }

        // 3. Permalink Anchors

        const articles = document.querySelectorAll('article');

        articles.forEach(article => {

            const id = article.id;

            const heading = article.querySelector('h3');

            if (id && heading) {

                const anchor = document.createElement('a');

                anchor.href = '#' + id;

                anchor.className = 'permalink';

                anchor.textContent = '#';

                anchor.ariaLabel = 'Permalink to this section';

                heading.appendChild(anchor);

            }

        });

    });

    