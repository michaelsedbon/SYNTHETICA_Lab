/**
 * Skill Manager — Client-side logic
 * Workspaces, skill cards, subcategory grouping, SKILL.md preview, install/uninstall.
 */

const API = '';

// ─── State ───
let workspaces = [];
let allSkills = {};
let installedSkills = [];
let selectedWorkspace = null;
let currentFilter = 'all';
let searchQuery = '';
let selectedSkillPath = null;  // path of skill showing in preview

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadWorkspaces();
    await loadAllSkills();
    lucide.createIcons();
});

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderSkillsView();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderSkillsView();
        });
    });

    document.getElementById('btnClosePreview').addEventListener('click', closePreview);
    document.getElementById('btnCopyContent').addEventListener('click', copyPreviewContent);
    document.getElementById('btnOpenFinder').addEventListener('click', openInFinder);
}

// ─── API Calls ───
async function loadWorkspaces() {
    try {
        const res = await fetch(`${API}/api/workspaces`);
        workspaces = await res.json();
        renderWorkspaces();
        document.getElementById('statWorkspaces').textContent = workspaces.length;
        document.getElementById('statsBar').style.display = 'flex';
    } catch (err) {
        console.error('Failed to load workspaces:', err);
        document.getElementById('workspaceList').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-triangle" class="empty-icon"></i>
                <div class="title">Failed to load workspaces</div>
            </div>`;
        lucide.createIcons();
    }
}

async function loadAllSkills() {
    try {
        const res = await fetch(`${API}/api/skills`);
        allSkills = await res.json();
        let total = 0;
        for (const section of Object.values(allSkills)) {
            total += section.length;
        }
        document.getElementById('statLibrary').textContent = total;
    } catch (err) {
        console.error('Failed to load skills:', err);
    }
}

async function loadInstalledSkills(workspacePath) {
    try {
        const res = await fetch(`${API}/api/workspace/skills?path=${encodeURIComponent(workspacePath)}`);
        installedSkills = await res.json();
    } catch (err) {
        console.error('Failed to load installed skills:', err);
        installedSkills = [];
    }
}

async function toggleSkill(skillName, install) {
    const endpoint = install ? '/api/install' : '/api/uninstall';
    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_path: selectedWorkspace.path,
                skill_name: skillName,
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || 'Unknown error');
        }

        const data = await res.json();
        showToast(data.message || `${install ? 'Installed' : 'Uninstalled'} ${skillName}`, 'success');

        await loadInstalledSkills(selectedWorkspace.path);
        renderSkillsView();

        // Update workspace badge
        const ws = workspaces.find(w => w.path === selectedWorkspace.path);
        if (ws) {
            ws.skill_count = installedSkills.length;
            renderWorkspaces();
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
        renderSkillsView();
    }
}

// ─── Preview Panel ───
async function openPreview(skillName, skillPath) {
    try {
        const res = await fetch(`${API}/api/skill/preview?path=${encodeURIComponent(skillPath)}`);
        if (!res.ok) throw new Error('Could not load SKILL.md');
        const data = await res.json();

        selectedSkillPath = skillPath;
        document.getElementById('previewSkillName').textContent = skillName;
        document.getElementById('previewContent').innerHTML = highlightMarkdown(data.content);
        document.getElementById('appRoot').classList.add('preview-open');

        // Update card selection
        document.querySelectorAll('.skill-card.selected').forEach(c => c.classList.remove('selected'));
        const card = document.querySelector(`.skill-card[data-path="${CSS.escape(skillPath)}"]`);
        if (card) card.classList.add('selected');

        lucide.createIcons({ attrs: { class: '' }, nameAttr: 'data-lucide' });
    } catch (err) {
        showToast(`Preview failed: ${err.message}`, 'error');
    }
}

function closePreview() {
    document.getElementById('appRoot').classList.remove('preview-open');
    selectedSkillPath = null;
    document.querySelectorAll('.skill-card.selected').forEach(c => c.classList.remove('selected'));
}

async function copyPreviewContent() {
    const content = document.getElementById('previewContent').textContent;
    try {
        await navigator.clipboard.writeText(content);
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard', 'success');
    }
}

async function openInFinder() {
    if (!selectedSkillPath) return;
    try {
        await fetch(`${API}/api/open-finder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: selectedSkillPath }),
        });
        showToast('Opened in Finder', 'success');
    } catch (err) {
        showToast('Failed to open Finder', 'error');
    }
}

function highlightMarkdown(text) {
    // Basic syntax highlighting for SKILL.md preview
    return text.split('\n').map(line => {
        // YAML frontmatter delimiters
        if (line === '---') return `<span class="fm-delim">${esc(line)}</span>`;
        // YAML key: value
        if (/^[a-zA-Z_-]+:/.test(line) && !line.startsWith('#')) {
            const [key, ...rest] = line.split(':');
            return `<span class="fm-key">${esc(key)}</span>:<span class="fm-value">${esc(rest.join(':'))}</span>`;
        }
        // Markdown headings
        if (/^#{1,4}\s/.test(line)) return `<span class="md-heading">${esc(line)}</span>`;
        // Bold text
        line = esc(line);
        line = line.replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">**$1**</span>');
        // Inline code
        line = line.replace(/`([^`]+)`/g, '<span class="md-code">`$1`</span>');
        return line;
    }).join('\n');
}

// ─── Rendering ───
function renderWorkspaces() {
    const container = document.getElementById('workspaceList');
    if (!workspaces.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="folder-x" class="empty-icon"></i>
                <div class="title">No workspaces found</div>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = workspaces.map(ws => `
        <div class="workspace-item ${selectedWorkspace?.path === ws.path ? 'active' : ''}"
             data-path="${esc(ws.path)}">
            <div class="workspace-dot"></div>
            <div class="workspace-info">
                <div class="workspace-name">${esc(ws.name)}</div>
                <div class="workspace-path">${esc(ws.short_path)}</div>
            </div>
            <span class="workspace-badge">${ws.skill_count}</span>
        </div>
    `).join('');

    container.querySelectorAll('.workspace-item').forEach(item => {
        item.addEventListener('click', async () => {
            const path = item.dataset.path;
            selectedWorkspace = workspaces.find(w => w.path === path);

            document.getElementById('mainContent').innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <span>Loading skills...</span>
                </div>`;

            closePreview();
            await loadInstalledSkills(path);
            renderWorkspaces();
            renderSkillsView();
        });
    });
}

function renderSkillsView() {
    const main = document.getElementById('mainContent');
    if (!selectedWorkspace) {
        main.innerHTML = `
            <div class="empty-state">
                <i data-lucide="package" class="empty-icon"></i>
                <div class="title">Select a workspace</div>
                <div class="subtitle">Choose a workspace from the sidebar to manage its skills</div>
            </div>`;
        lucide.createIcons();
        return;
    }

    const installedNames = new Set(installedSkills.map(s => s.name));

    // Build a map of all skills in the library (name → info)
    const librarySkillNames = new Set();
    for (const skills of Object.values(allSkills)) {
        for (const s of skills) {
            librarySkillNames.add(s.name);
        }
    }

    let html = '';

    // If "installed" filter, show installed-but-not-in-library skills first
    if (currentFilter === 'installed') {
        const localInstalled = installedSkills.filter(s => !librarySkillNames.has(s.name));
        let localFiltered = localInstalled;
        if (searchQuery) {
            localFiltered = localFiltered.filter(s =>
                s.name.toLowerCase().includes(searchQuery) ||
                (s.description || '').toLowerCase().includes(searchQuery)
            );
        }
        if (localFiltered.length) {
            html += renderLocalInstalledSection(localFiltered);
        }
    }

    // Render each section
    for (const sectionKey of Object.keys(allSkills)) {
        const skills = allSkills[sectionKey];
        if (!skills || !skills.length) continue;

        // Apply filter
        if (currentFilter === 'built-in' && !sectionKey.startsWith('built-in')) continue;
        if (currentFilter === 'custom' && !sectionKey.startsWith('custom')) continue;
        if (currentFilter === 'third-party' && !sectionKey.startsWith('third-party')) continue;

        let filtered = skills;

        if (searchQuery) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(searchQuery) ||
                s.description.toLowerCase().includes(searchQuery) ||
                (s.subcategory || '').toLowerCase().includes(searchQuery)
            );
        }

        if (currentFilter === 'installed') {
            filtered = filtered.filter(s => installedNames.has(s.name));
        }

        if (!filtered.length) continue;

        const sectionLabel = formatSectionLabel(sectionKey);
        const badgeClass = sectionKey.startsWith('third-party') ? 'third-party'
            : sectionKey === 'custom' ? 'custom' : 'built-in';

        html += `
            <div class="section-header">
                <span class="skill-source ${badgeClass}">${badgeClass.replace('third-party', '3rd party')}</span>
                <span class="section-title">${esc(sectionLabel)}</span>
                <span class="section-count">${filtered.length}</span>
                <div class="section-line"></div>
            </div>`;

        // Group by subcategory
        const subcats = groupBySubcategory(filtered);
        const subcatKeys = Object.keys(subcats).sort((a, b) => {
            if (a === '') return 1;  // "Other" last
            if (b === '') return -1;
            return a.localeCompare(b);
        });

        const hasSubcats = subcatKeys.length > 1 || (subcatKeys.length === 1 && subcatKeys[0] !== '');

        for (const subcat of subcatKeys) {
            const subcatSkills = subcats[subcat];
            if (hasSubcats) {
                html += `<div class="subcategory-header">${esc(subcat || 'Other')} <span class="subcat-count">${subcatSkills.length}</span></div>`;
            }
            html += '<div class="skills-grid">';
            for (const skill of subcatSkills) {
                html += renderSkillCard(skill, installedNames);
            }
            html += '</div>';
        }
    }

    if (!html) {
        html = `
            <div class="empty-state">
                <i data-lucide="search-x" class="empty-icon"></i>
                <div class="title">No skills match your search</div>
                <div class="subtitle">Try a different search term or filter</div>
            </div>`;
    }

    main.innerHTML = html;
    lucide.createIcons();
    attachCardListeners();
}

function renderSkillCard(skill, installedNames) {
    const isInstalled = installedNames.has(skill.name);
    const localInfo = installedSkills.find(s => s.name === skill.name);
    const isLocal = localInfo && localInfo.source === 'local';
    const isSelected = selectedSkillPath === skill.path;

    return `
        <div class="skill-card ${isInstalled ? 'installed' : ''} ${isSelected ? 'selected' : ''}"
             data-skill="${esc(skill.name)}"
             data-path="${esc(skill.path)}">
            <div class="skill-card-content">
                <div class="skill-name">${esc(skill.name)}</div>
                <div class="skill-desc">${esc(skill.description || 'No description')}</div>
                ${skill.subcategory ? `<div class="skill-meta"><span class="skill-subcat">${esc(skill.subcategory)}</span></div>` : ''}
            </div>
            <label class="toggle" title="${isLocal ? 'Local directory' : (isInstalled ? 'Uninstall' : 'Install')}"
                   onclick="event.stopPropagation()">
                <input type="checkbox"
                       ${isInstalled ? 'checked' : ''}
                       ${isLocal ? 'disabled' : ''}
                       data-skill="${esc(skill.name)}"
                       onchange="handleToggle(this)">
                <span class="toggle-slider"></span>
            </label>
        </div>`;
}

function renderLocalInstalledSection(skills) {
    let html = `
        <div class="section-header">
            <span class="skill-source local">local</span>
            <span class="section-title">Installed (workspace-local)</span>
            <span class="section-count">${skills.length}</span>
            <div class="section-line"></div>
        </div>
        <div class="skills-grid">`;

    for (const skill of skills) {
        const skillPath = skill.real_path || '';
        const isSelected = selectedSkillPath === skillPath;
        html += `
            <div class="skill-card installed ${isSelected ? 'selected' : ''}"
                 data-skill="${esc(skill.name)}"
                 data-path="${esc(skillPath)}">
                <div class="skill-card-content">
                    <div class="skill-name">${esc(skill.name)}</div>
                    <div class="skill-desc">${esc(skill.description || 'Local skill')}</div>
                    <div class="skill-meta"><span class="skill-source local">local</span></div>
                </div>
                <label class="toggle" title="${skill.is_symlink ? 'Uninstall' : 'Local directory'}"
                       onclick="event.stopPropagation()">
                    <input type="checkbox" checked
                           ${skill.is_symlink ? '' : 'disabled'}
                           data-skill="${esc(skill.name)}"
                           onchange="handleToggle(this)">
                    <span class="toggle-slider"></span>
                </label>
            </div>`;
    }

    html += '</div>';
    return html;
}

function attachCardListeners() {
    document.querySelectorAll('.skill-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open preview when clicking toggle
            if (e.target.closest('.toggle')) return;
            const skillName = card.dataset.skill;
            const skillPath = card.dataset.path;
            if (skillPath) openPreview(skillName, skillPath);
        });
    });
}

// ─── Event Handlers ───
async function handleToggle(checkbox) {
    const skillName = checkbox.dataset.skill;
    const install = checkbox.checked;
    const toggle = checkbox.closest('.toggle');
    toggle.classList.add('loading');
    await toggleSkill(skillName, install);
    toggle.classList.remove('loading');
}

// ─── Utilities ───
function groupBySubcategory(skills) {
    const groups = {};
    for (const skill of skills) {
        const key = skill.subcategory || '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(skill);
    }
    return groups;
}

function formatSectionLabel(key) {
    if (key === 'built-in') return 'Built-in';
    if (key === 'custom') return 'Custom';
    if (key.startsWith('third-party:')) {
        const repo = key.split(':')[1];
        return repo.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return key;
}

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 200ms ease';
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}
