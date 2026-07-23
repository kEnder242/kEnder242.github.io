class MissionControl extends HTMLElement {
    connectedCallback() {
        const currentPath = window.location.pathname;
        const activePage = currentPath.split('/').pop() || 'stories.html';

        console.log(`[MISSION CONTROL] Component connected (v2.0). Active page: ${activePage}`);

        this.innerHTML = `
            <div class="nav-home" style="margin-bottom: 20px; font-family: var(--mono-stack, monospace); font-size: 0.85rem;">
                <a href="https://www.jason-lab.dev/index.html" style="color: var(--accent-color, #4daafc); text-decoration: none;">← Front Page</a>
            </div>

            <section id="public-airlock" style="margin-bottom: 20px;">
                <h2 style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-color, #4daafc); margin-top: 15px; letter-spacing: 1px; font-weight: bold;">Public Airlock</h2>
                <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">
                    <li style="margin-bottom: 8px;"><a href="https://www.jason-lab.dev/stories.html" class="mission-link ${activePage === 'stories.html' ? 'active' : ''}">Work Stories</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://www.jason-lab.dev/protocols.html" class="mission-link ${activePage === 'protocols.html' ? 'active' : ''}">Lab Protocols</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://www.jason-lab.dev/research.html" class="mission-link ${activePage === 'research.html' ? 'active' : ''}">Research Pipeline</a></li>
                </ul>
            </section>

            <section id="mission-control">
                <h2 style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-color, #4daafc); margin-top: 25px; letter-spacing: 1px; font-weight: bold; border-top: 1px solid var(--border-color, #30363d); padding-top: 15px;">🔒 Mission Control</h2>
                <ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">
                    <li style="margin-bottom: 8px;"><a href="https://notes.jason-lab.dev/timeline.html" class="mission-link ${activePage === 'timeline.html' ? 'active' : ''}">Work Notes</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://notes.jason-lab.dev/files.html" class="mission-link ${activePage === 'files.html' ? 'active' : ''}">Artifact Files</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://notes.jason-lab.dev/status.html" class="mission-link ${activePage === 'status.html' ? 'active' : ''}">Lab Status</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://notes.jason-lab.dev/intercom.html" class="mission-link ${(activePage === 'intercom.html' || activePage === 'lab.html') ? 'active' : ''}">AI Intercom</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://notes.jason-lab.dev/features.html" class="mission-link ${activePage === 'features.html' ? 'active' : ''}">Feature Tracker</a></li>
                    <li style="margin-bottom: 8px;"><a href="https://notes.jason-lab.dev/benchmarks.html" class="mission-link ${activePage === 'benchmarks.html' ? 'active' : ''}">Silicon Benchmarks</a></li>
                </ul>
                <div style="font-size: 0.6rem; color: #444; margin-top: 20px; border-top: 1px solid #222; padding-top: 5px;">
                    DEPLOYMENT: [FEDERATED_V2.0]
                </div>
            </section>
        `;

        setTimeout(() => this.initToggle(), 50);
    }

    initToggle() {
        const menuToggle = document.getElementById('menu-toggle');
        const parentNav = document.getElementById('sidebar') || this.closest('nav');
        
        if (menuToggle && parentNav) {
            const newToggle = menuToggle.cloneNode(true);
            menuToggle.parentNode.replaceChild(newToggle, menuToggle);

            newToggle.addEventListener('click', (e) => {
                parentNav.classList.toggle('active');
                e.stopPropagation();
            });

            document.addEventListener('click', (e) => {
                if (parentNav.classList.contains('active') && !parentNav.contains(e.target) && e.target !== newToggle) {
                    parentNav.classList.remove('active');
                }
            });
        } else {
            if (!this._retried) {
                this._retried = true;
                setTimeout(() => this.initToggle(), 500);
            }
        }
    }
}

customElements.define('mission-control', MissionControl);
