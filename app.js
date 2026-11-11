// ============================================================
// app.js — Logique principale du site MicroCas
// Dr. Wail NAMOUNE — Microbiologie Médicale
// ============================================================

// Charge la base de données JSON
async function loadDatabase() {
    try {
        const response = await fetch('data/cas_cliniques.json');
        if (!response.ok) throw new Error('Erreur de chargement');
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return { total: 0, cas: [] };
    }
}

// Affiche les statistiques sur la page d'accueil
function renderStats(data) {
    const cas = data.cas;
    
    // Calcule les stats
    const parties = {};
    let avecCorrigeType = 0;
    const tags = {};
    
    cas.forEach(c => {
        parties[c.partie] = (parties[c.partie] || 0) + 1;
        if (c.type_corrige === 'Corrigé type') avecCorrigeType++;
        c.tags.forEach(t => { tags[t] = (tags[t] || 0) + 1; });
    });

    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${data.total}</div>
            <div class="stat-label">Cas cliniques</div>
            <div class="stat-sub">Énoncés & corrigés</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">26</div>
            <div class="stat-label">Chapitres</div>
            <div class="stat-sub">4 grandes parties</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${avecCorrigeType}</div>
            <div class="stat-label">Corrigés officiels</div>
            <div class="stat-sub">Issus des examens</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.total - avecCorrigeType}</div>
            <div class="stat-label">Corrigés suggérés</div>
            <div class="stat-sub">Rédigés par l'auteur</div>
        </div>
    `;
}

// Affiche les parties sur la page d'accueil
function renderParties(data) {
    const grid = document.getElementById('partiesGrid');
    if (!grid) return;

    const partiesConfig = [
        {
            nom: 'Résistance aux antibiotiques',
            emoji: '🛡️',
            color: '#dc2626',
            desc: 'Phénotypes de résistance, BLSE, carbapénémases, SARM, ERV',
            chapitres: '1 chapitre · 70+ cas'
        },
        {
            nom: 'Virologie',
            emoji: '🦠',
            color: '#7c3aed',
            desc: 'Hépatites virales, infections materno-fœtales, VIH, herpès, rubéole',
            chapitres: '12 chapitres'
        },
        {
            nom: 'Bactériologie',
            emoji: '🔬',
            color: '#0369a1',
            desc: 'Infections respiratoires, urinaires, SNC, zoonoses, IST, tuberculose',
            chapitres: '12 chapitres'
        },
        {
            nom: 'Mix',
            emoji: '🔀',
            color: '#065f46',
            desc: 'Cas transversaux combinant plusieurs disciplines',
            chapitres: '1 chapitre'
        }
    ];

    const cas = data.cas;
    grid.innerHTML = partiesConfig.map(p => {
        const count = cas.filter(c => c.partie === p.nom).length;
        return `
            <div class="partie-card" onclick="filterByPartie('${p.nom}')" style="border-top-color: ${p.color}">
                <div class="partie-emoji">${p.emoji}</div>
                <h3 class="partie-nom">${p.nom}</h3>
                <p class="partie-desc">${p.desc}</p>
                <div class="partie-footer">
                    <span class="partie-count">${count} cas</span>
                    <span class="partie-chapitres">${p.chapitres}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Affiche les derniers cas ajoutés
function renderRecentCas(data, limit = 6) {
    const grid = document.getElementById('recentCas');
    if (!grid) return;
    
    const recent = data.cas.slice(-limit).reverse();
    grid.innerHTML = recent.map(cas => createCasCard(cas)).join('');
}

// Crée une carte de cas clinique
function createCasCard(cas) {
    const partieColors = {
        'Résistance aux antibiotiques': '#dc2626',
        'Virologie': '#7c3aed',
        'Bactériologie': '#0369a1',
        'Mix': '#065f46'
    };
    
    const color = partieColors[cas.partie] || '#374151';
    const badgeClass = cas.type_corrige === 'Corrigé type' ? 'badge-green' : 'badge-blue';
    const badgeText = cas.type_corrige === 'Corrigé type' ? '✅ Corrigé officiel' : '💡 Corrigé suggéré';
    
    const diffBadge = {
        'Facile': '<span class="diff-badge diff-easy">🟢 Facile</span>',
        'Moyen': '<span class="diff-badge diff-medium">🟡 Moyen</span>',
        'Difficile': '<span class="diff-badge diff-hard">🔴 Difficile</span>'
    }[cas.difficulte] || '';

    // Extrait un aperçu de l'énoncé (200 premiers caractères)
    const apercu = cas.enonce ? 
        cas.enonce.substring(0, 200).replace(/\n/g, ' ') + '...' : 
        'Voir l\'énoncé complet...';

    // Affiche les 3 premiers tags
    const tagsHtml = cas.tags.slice(0, 3).map(t => 
        `<span class="tag">${t}</span>`
    ).join('');

    return `
        <div class="cas-card" onclick="ouvrirCas('${cas.id}')">
            <div class="cas-card-header" style="background: ${color}">
                <span class="cas-numero">Cas ${cas.numero}</span>
                <span class="cas-chapitre">${cas.chapitre_nom}</span>
            </div>
            <div class="cas-card-body">
                ${cas.source ? `<div class="cas-source">📌 ${cas.source}</div>` : ''}
                <p class="cas-apercu">${apercu}</p>
                <div class="cas-tags">${tagsHtml}</div>
            </div>
            <div class="cas-card-footer">
                <span class="badge ${badgeClass}">${badgeText}</span>
                ${diffBadge}
            </div>
        </div>
    `;
}

// Affiche la grille de cas (avec pagination)
function renderCasGrid() {
    const grid = document.getElementById('casGrid');
    const info = document.getElementById('resultsInfo');
    if (!grid) return;

    const start = (currentPage - 1) * PER_PAGE;
    const end = start + PER_PAGE;
    const pageCas = filteredCas.slice(start, end);

    if (filteredCas.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Aucun cas trouvé</h3>
                <p>Essayez de modifier vos filtres ou votre recherche</p>
            </div>
        `;
        if (info) info.textContent = '';
        renderPagination(0);
        return;
    }

    if (info) {
        info.textContent = `${filteredCas.length} cas trouvés`;
    }

    grid.innerHTML = pageCas.map(cas => createCasCard(cas)).join('');
    renderPagination(filteredCas.length);
}

// Génère la pagination
function renderPagination(total) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;

    const totalPages = Math.ceil(total / PER_PAGE);
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    
    if (currentPage > 1) {
        html += `<button onclick="goToPage(${currentPage - 1})" class="page-btn">← Précédent</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
            html += `<button onclick="goToPage(${i})" class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (Math.abs(i - currentPage) === 3) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }

    if (currentPage < totalPages) {
        html += `<button onclick="goToPage(${currentPage + 1})" class="page-btn">Suivant →</button>`;
    }

    paginationEl.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderCasGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Ouvre un cas individuel
function ouvrirCas(id) {
    window.location.href = `cas-detail.html?id=${id}`;
}

// Filtre par partie (depuis la page d'accueil)
function filterByPartie(partie) {
    window.location.href = `cas.html?partie=${encodeURIComponent(partie)}`;
}

// Remplit le filtre des chapitres
function populateChapitreFilter(cas) {
    const select = document.getElementById('filterChapitre');
    if (!select) return;

    const chapitres = {};
    cas.forEach(c => {
        if (c.chapitre_num && c.chapitre_nom) {
            chapitres[c.chapitre_num] = c.chapitre_nom;
        }
    });

    const sortedChapitres = Object.entries(chapitres).sort((a, b) => a[0] - b[0]);
    sortedChapitres.forEach(([num, nom]) => {
        select.innerHTML += `<option value="${num}">Ch. ${num} — ${nom}</option>`;
    });
}

// Utilitaire debounce pour la recherche
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Gère les paramètres URL (pour les liens directs)
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const partie = params.get('partie');
    
    if (partie && document.getElementById('filterPartie')) {
        document.getElementById('filterPartie').value = partie;
    }
});
