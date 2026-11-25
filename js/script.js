// ESTADO DA APLICAÇÃO (LOCALSTORAGE)
let appData = {
    midias: [],
    store: [],
    easterEggs: [],
    watchlist: JSON.parse(localStorage.getItem('watchlist')) || [],
    downloads: JSON.parse(localStorage.getItem('downloads')) || [],
    cart: JSON.parse(localStorage.getItem('cart')) || []
};

let currentWatchlistTab = 'depois';
let heroSeries = [];
let currentHeroIndex = 0;
let heroInterval = null;

// CARREGAR DADOS DO ARQUIVO DADOS.JSON
document.addEventListener('DOMContentLoaded', () => {
    fetch('js/dados.json')
        .then(res => {
            if (!res.ok) throw new Error("Erro ao carregar o arquivo de dados.");
            return res.json();
        })
        .then(data => {
            appData.midias = data.midias || [];
            appData.store = data.store || [];
            appData.easterEggs = data.easterEggs || [];
            initApp();
        })
        .catch(err => {
            console.error(err);
            document.getElementById('app-content').innerHTML = `
                <div style="text-align: center; padding: 50px; color: #ff5555;">
                    <h2>Ops! Falha ao carregar os dados da plataforma.</h2>
                    <p>Certifique-se de rodar o projeto através de um servidor local (como o Live Server no VS Code).</p>
                </div>`;
        });
});

function initApp() {
    initHeroCarousel();
    renderHome();
    renderCatalogo();
    renderIndies();
    renderCronologia();
    renderEasterEggs();
    renderStore();
    renderWatchlist();
    renderDownloads();
    updateCartUI();
}

// GERENCIADOR DE NAVEGAÇÃO SPA
function navigate(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const activePage = document.getElementById(`page-${pageId}`);
    if (activePage) activePage.classList.add('active');

    const btnActive = Array.from(document.querySelectorAll('.nav-btn'))
        .find(btn => btn.getAttribute('onclick')?.includes(`'${pageId}'`));
    if (btnActive) btnActive.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// MENU MOBILE (GAVETA DE NAVEGAÇÃO)
function toggleMobileDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.classList.toggle('open');
}

function navigateMobile(pageId) {
    navigate(pageId);
    toggleMobileDrawer();
    
    document.querySelectorAll('.mobile-drawer-btn').forEach(b => b.classList.remove('active'));
    const activeMobileBtn = Array.from(document.querySelectorAll('.mobile-drawer-btn'))
        .find(btn => btn.getAttribute('onclick')?.includes(`'${pageId}'`));
    if (activeMobileBtn) activeMobileBtn.classList.add('active');
}

// CRIAÇÃO DE CARD PADRÃO DE MÍDIA
function createMediaCard(item) {
    const isWatch = appData.watchlist.some(w => w.id === item.id);
    const isDown = appData.downloads.some(d => d.id === item.id);
    const videoIdParam = item.videoId ? `'${item.videoId}'` : 'undefined';
    const sourceButton = item.fonteTrailer
        ? `<a class="btn-icon btn-source" href="${item.fonteTrailer}" target="_blank" rel="noopener noreferrer" title="Ver no site original: ${item.nomeFonteTrailer || 'Fonte do trailer'}">
                        <i data-lucide="external-link"></i>
                    </a>`
        : '';

    return `
        <div class="card-media">
            <div class="card-image-wrapper">
                <img src="${item.capa}" alt="${item.titulo}" loading="lazy">
                <div class="card-overlay-actions">
                    <button class="btn-icon btn-play" onclick="playMedia('${item.titulo.replace(/'/g, "\\'")}', ${videoIdParam})" title="Assistir">
                        <i data-lucide="play"></i>
                    </button>
                    <button class="btn-icon ${isWatch ? 'active' : ''}" onclick="toggleWatchlist(${item.id})" title="Watchlist">
                        <i data-lucide="${isWatch ? 'check' : 'plus'}"></i>
                    </button>
                    <button class="btn-icon ${isDown ? 'active' : ''}" onclick="toggleDownload(${item.id})" title="Baixar">
                        <i data-lucide="${isDown ? 'check-circle' : 'download'}"></i>
                    </button>
                    ${sourceButton}
                </div>
            </div>
            <div class="card-info">
                <h4>${item.titulo}</h4>
                <p>${item.categoria} • ${item.ano}</p>
            </div>
        </div>
    `;
}

function getYearHighlights() {
    const featuredTitles = new Set(['Haikyu!!', 'Hanako-kun: Toilet-bound']);

    return appData.midias
        .filter(item =>
            [2023, 2024, 2025].includes(item.ano) ||
            (item.genero === 'Ação' && item.ano >= 2010 && item.ano < 2022) ||
            featuredTitles.has(item.titulo)
        )
        .sort((a, b) => b.ano - a.ano || a.ordemCronologica - b.ordemCronologica);
}

// RENDERIZAR HOME
function renderHome() {
    const lanc = document.getElementById('carousel-lancamentos');
    const pop = document.getElementById('carousel-populares');
    const classicos = document.getElementById('carousel-classicos');
    const outros = document.getElementById('carousel-outros');
    const highlights = getYearHighlights();
    const highlightedIds = new Set(highlights.map(item => item.id));
    const popularesList = appData.midias.filter(item =>
        item.genero === 'Ação' &&
        item.ano >= 2010 &&
        item.ano < 2022
    );
    const popularIds = new Set(popularesList.map(item => item.id));
    const classicosList = appData.midias.filter(item =>
        !highlightedIds.has(item.id) &&
        !popularIds.has(item.id) &&
        (item.ano < 2010 || item.genero === 'Comédia' || item.genero === 'Fantasia')
    );
    const classicIds = new Set(classicosList.map(item => item.id));
    const outrosList = appData.midias.filter(item =>
        !highlightedIds.has(item.id) &&
        !popularIds.has(item.id) &&
        !classicIds.has(item.id)
    );

    if (lanc) lanc.innerHTML = highlights.map(createMediaCard).join('');
    if (pop) pop.innerHTML = popularesList.map(createMediaCard).join('');
    if (classicos) classicos.innerHTML = classicosList.map(createMediaCard).join('');
    if (outros) outros.innerHTML = outrosList.map(createMediaCard).join('');
    
    if (window.lucide) lucide.createIcons();
}


// RENDERIZAR CATÁLOGO & FILTROS
function renderCatalogo() {
    filterCatalogo();
}

function filterCatalogo() {
    const search = document.getElementById('search-catalogo')?.value.toLowerCase() || '';
    const genero = document.getElementById('filter-genero')?.value || 'todos';

    const filtered = appData.midias.filter(m => {
        const matchSearch = m.titulo.toLowerCase().includes(search);
        const matchGenero = genero === 'todos' || m.genero === genero;
        return matchSearch && matchGenero;
    });

    const grid = document.getElementById('grid-catalogo');
    if (grid) grid.innerHTML = filtered.map(createMediaCard).join('');
    if (window.lucide) lucide.createIcons();
}

// RENDERIZAR INDIES
function renderIndies() {
    const indies = appData.midias.filter(m => m.indie);
    const grid = document.getElementById('grid-indies');
    if (!grid) return;

    grid.innerHTML = indies.map(m => `
        <div class="card-media" style="min-width: 100%;">
            <div class="card-info">
                <h3>${m.titulo}</h3>
                <p><strong>Diretor/Autor:</strong> ${m.diretor}</p>
                <p>${m.sinopse}</p>
                <br>
                <button class="btn btn-primary" onclick="playMedia('${m.titulo.replace(/'/g, "\\'")}', '${m.videoId || ''}')">Assistir Produção Indie</button>
            </div>
        </div>
    `).join('');
}

// RENDERIZAR CRONOLOGIA
function renderCronologia() {
    const sorted = [...appData.midias].sort((a,b) => a.ordemCronologica - b.ordemCronologica);
    const container = document.getElementById('timeline-content');
    if (!container) return;

    container.innerHTML = sorted.map(m => `
        <div class="timeline-item">
            <span class="badge-neon">Ordem #${m.ordemCronologica}</span>
            <h3>${m.titulo} (${m.ano})</h3>
            <p><strong>Universo Compartilhado:</strong> ${m.universo || 'Geral'}</p>
        </div>
    `).join('');
}

// RENDERIZAR EASTER EGGS
function renderEasterEggs() {
    filterEasterEggs();
}

function filterEasterEggs() {
    const query = document.getElementById('search-easter')?.value.toLowerCase() || '';
    const filtered = appData.easterEggs.filter(e => e.filme.toLowerCase().includes(query) || e.descricao.toLowerCase().includes(query));

    const grid = document.getElementById('grid-easter-eggs');
    if (!grid) return;

    grid.innerHTML = filtered.map(e => `
        <div class="card-media" style="min-width: 220px;">
            <img src="${e.imagem}" alt="Easter Egg" style="width:100%; height:140px; object-fit:cover;">
            <div class="card-info">
                <h4>${e.filme}</h4>
                <p>${e.descricao}</p>
            </div>
        </div>
    `).join('');
}

// RENDERIZAR GEEK STORE
function renderStore() {
    const grid = document.getElementById('grid-store');
    if (!grid) return;

    grid.innerHTML = appData.store.map(p => `
        <div class="card-media">
            <img src="${p.imagem}" alt="${p.nome}" style="width:100%; height:150px; object-fit:cover;">
            <div class="card-info">
                <h4>${p.nome}</h4>
                <p><strong>R$ ${p.preco.toFixed(2)}</strong></p>
                <br>
                <button class="btn btn-action" onclick="addToCart(${p.id})">Adicionar ao Carrinho</button>
            </div>
        </div>
    `).join('');
}

// GERENCIADOR WATCHLIST
function toggleWatchlist(id) {
    const index = appData.watchlist.findIndex(w => w.id === id);
    if (index > -1) {
        appData.watchlist.splice(index, 1);
    } else {
        const item = appData.midias.find(m => m.id === id);
        if (item) appData.watchlist.push({...item, assistido: false});
    }
    localStorage.setItem('watchlist', JSON.stringify(appData.watchlist));
    renderWatchlist();
    renderHome();
    renderCatalogo();
}

function switchWatchlistTab(tab) {
    currentWatchlistTab = tab;
    document.getElementById('tab-assistir-depois')?.classList.toggle('active', tab === 'depois');
    document.getElementById('tab-assistidos')?.classList.toggle('active', tab === 'assistidos');
    renderWatchlist();
}

function renderWatchlist() {
    const container = document.getElementById('grid-watchlist');
    if (!container) return;
    
    const filtered = appData.watchlist.filter(w => currentWatchlistTab === 'assistidos' ? w.assistido : !w.assistido);

    container.innerHTML = filtered.length > 0 
        ? filtered.map(createMediaCard).join('') 
        : '<p style="color:var(--text-muted);">Sua lista está vazia nesta aba.</p>';
    if (window.lucide) lucide.createIcons();
}

// GERENCIADOR DOWNLOADS
function toggleDownload(id) {
    const index = appData.downloads.findIndex(d => d.id === id);
    if (index > -1) {
        appData.downloads.splice(index, 1);
    } else {
        const item = appData.midias.find(m => m.id === id);
        if (item) appData.downloads.push(item);
    }
    localStorage.setItem('downloads', JSON.stringify(appData.downloads));
    renderDownloads();
    renderHome();
    renderCatalogo();
}

function renderDownloads() {
    const container = document.getElementById('grid-downloads');
    if (!container) return;
    
    container.innerHTML = appData.downloads.length > 0 
        ? appData.downloads.map(createMediaCard).join('') 
        : '<p style="color:var(--text-muted);">Nenhum item baixado offline.</p>';
    if (window.lucide) lucide.createIcons();
}

// GERENCIADOR DO CARRINHO
function addToCart(productId) {
    const prod = appData.store.find(p => p.id === productId);
    if (prod) {
        appData.cart.push(prod);
        localStorage.setItem('cart', JSON.stringify(appData.cart));
        updateCartUI();
        showCartNotification();
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.innerText = appData.cart.length;

    const itemsContainer = document.getElementById('cart-items');
    if (itemsContainer) {
        itemsContainer.innerHTML = appData.cart.length > 0 
            ? appData.cart.map((item, idx) => `
                <div class="cart-item">
                    <span>${item.nome}</span>
                    <strong>R$ ${item.preco.toFixed(2)}</strong>
                    <button onclick="removeFromCart(${idx})" style="background:none;border:none;color:red;cursor:pointer;font-size:1.2rem;">&times;</button>
                </div>
            `).join('') 
            : '<p style="color:var(--text-muted);">Carrinho vazio.</p>';
    }

    const total = appData.cart.reduce((sum, item) => sum + item.preco, 0);
    const totalEl = document.getElementById('cart-total-value');
    if (totalEl) totalEl.innerText = `R$ ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    appData.cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(appData.cart));
    updateCartUI();
}

function toggleCartModal() {
    document.getElementById('modal-carrinho')?.classList.toggle('active');
}

function checkout() {
    if (appData.cart.length === 0) return alert('Seu carrinho está vazio!');
    alert('Compra simulada finalizada com sucesso!');
    appData.cart = [];
    localStorage.setItem('cart', JSON.stringify([]));
    updateCartUI();
    toggleCartModal();
}

// MODAL E PLAYER DE VÍDEO (YOUTUBE EMBED SEGURO)
const streamingPlatformTitles = {
    Netflix: new Set([
        'Pokémon',
        "JoJo's Bizarre Adventure",
        'Cyberpunk: Edgerunners',
        'Death Note',
        'Vinland Saga',
        'Violet Evergarden',
        'Your Name'
    ]),
    'Disney+': new Set([
        'Tokyo Revengers',
        'Bleach: Thousand-Year Blood War'
    ]),
    'Prime Video': new Set([
        'A Tartaruga Vermelha'
    ])
};

function getStreamingPlatform(media) {
    if (media?.universo === 'Studio Ghibli') return 'Netflix';

    for (const [platform, titles] of Object.entries(streamingPlatformTitles)) {
        if (titles.has(media?.titulo)) return platform;
    }

    return 'Crunchyroll';
}

function getStreamingSearchUrl(platform, titulo) {
    const query = encodeURIComponent(titulo);
    const searchUrls = {
        Netflix: `https://www.netflix.com/search?q=${query}`,
        'Disney+': `https://www.disneyplus.com/search?q=${query}`,
        'Prime Video': `https://www.primevideo.com/search?phrase=${query}`,
        Crunchyroll: `https://www.crunchyroll.com/search?q=${query}`
    };

    return searchUrls[platform];
}

function playMedia(titulo, videoId = 'ynr6gnyu9NE') {
    const playerTitle = document.getElementById('player-title');
    if (playerTitle) playerTitle.innerText = `Reproduzindo: ${titulo}`;

    const media = appData.midias.find(item => item.videoId === videoId);
    const platform = getStreamingPlatform(media);
    const creditsLink = document.getElementById('player-credits-link');
    const creditsSource = document.getElementById('player-credits-source');
    if (creditsLink) {
        creditsLink.href = getStreamingSearchUrl(platform, titulo);
    }
    if (creditsSource) {
        creditsSource.textContent = platform;
    }
    
    const iframe = document.getElementById('html5-player');
    if (iframe) {
        // Usa o modo de embed padrão otimizado com rel=0 para evitar bloqueios comuns
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    }
    
    document.getElementById('modal-player')?.classList.add('active');
    if (window.lucide) lucide.createIcons();
}

function closePlayer() {
    const iframe = document.getElementById('html5-player');
    if (iframe) {
        iframe.src = '';
    }
    document.getElementById('modal-player')?.classList.remove('active');
}

// CONTROLE DO CARROSSEL HERO
function initHeroCarousel() {
    heroSeries = getYearHighlights();

    if (heroSeries.length === 0) return;

    renderHeroSlide(currentHeroIndex);
    renderHeroIndicators();

    if (heroInterval) clearInterval(heroInterval);

    heroInterval = setInterval(() => {
        currentHeroIndex = (currentHeroIndex + 1) % heroSeries.length;
        renderHeroSlide(currentHeroIndex);
    }, 10000);
}

function renderHeroSlide(index) {
    const item = heroSeries[index];
    const banner = document.getElementById('hero-banner');
    const content = document.getElementById('hero-content');

    if (!banner || !content || !item) return;

    banner.style.backgroundImage = `url('${item.capa}')`;

    content.innerHTML = `
        <div class="hero-meta">
            <span class="badge-neon">${item.categoria}</span>
            <span>${item.genero || 'Ação'}</span>
            <span>•</span>
            <span>${item.ano}</span>
        </div>
        <h1>${item.titulo}</h1>
        <p>${item.sinopse}</p>
        <div class="hero-buttons">
            <button class="btn-hero-play" onclick="playMedia('${item.titulo.replace(/'/g, "\\'")}', '${item.videoId || 'ynr6gnyu9NE'}')">
                <i data-lucide="play"></i> Assistir
            </button>
            <button class="btn-hero-info" onclick="toggleWatchlist(${item.id})">
                <i data-lucide="plus"></i> Watchlist
            </button>
        </div>
    `;

    document.querySelectorAll('.hero-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === index);
    });

    if (window.lucide) lucide.createIcons();
}

function renderHeroIndicators() {
    const container = document.getElementById('hero-indicators');
    if (!container) return;

    container.innerHTML = heroSeries.map((_, idx) => `
        <span class="hero-dot ${idx === 0 ? 'active' : ''}" onclick="goToHeroSlide(${idx})"></span>
    `).join('');
    }

    function goToHeroSlide(index) {
        currentHeroIndex = index;
        renderHeroSlide(currentHeroIndex);

        clearInterval(heroInterval);
        heroInterval = setInterval(() => {
            currentHeroIndex = (currentHeroIndex + 1) % heroSeries.length;
            renderHeroSlide(currentHeroIndex);
        }, 10000);
    }
    function showCartNotification() {
        const existingToast = document.querySelector('.cart-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.innerHTML = `
            <i data-lucide="shopping-cart"></i>
            <span>Seu produto foi adicionado ao carrinho.</span>
        `;

        document.body.appendChild(toast);

        if (window.lucide) {
            lucide.createIcons();
        }

        setTimeout(() => {
            toast.remove();
        }, 2500);
    }

