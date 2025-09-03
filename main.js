/* 交互逻辑：搜索过滤、收藏、主题切换、侧栏折叠、状态保持 */
(function () {
    const root = document.documentElement;
    const app = document.getElementById('appRoot');
    const searchInput = document.getElementById('searchInput');
    const grid = document.getElementById('toolsGrid');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const sidebar = document.getElementById('appSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const chips = Array.from(document.querySelectorAll('.chip'));
    const overlay = document.getElementById('detailOverlay');
    const drawer = document.getElementById('detailDrawer');
    const detailTitle = document.getElementById('detailTitle');
    const detailDesc = document.getElementById('detailDesc');
    const detailMeta = document.getElementById('detailMeta');
    const detailClose = document.getElementById('detailClose');
    const detailOpen = document.getElementById('detailOpen');
    const detailLoading = document.getElementById('detailLoading');
    const detailPreview = document.getElementById('detailPreview');

    // 工具路径映射（预览与完整页）
    const TOOL_ROUTES = {
        'Base64 编解码': { preview: 'tools/base64.html', full: 'tools/base64.html' },
        'JSON 格式化/校验': { preview: 'tools/json.html', full: 'tools/json.html' },
        'UUID 生成器': { preview: 'tools/uuid.html', full: 'tools/uuid.html' },
        '哈希计算器': { preview: 'tools/hash.html', full: 'tools/hash.html' },
        'HTTP 请求测试': { preview: 'tools/http.html', full: 'tools/http.html' },
        '图片压缩': { preview: 'tools/image.html', full: 'tools/image.html' },
        '二维码生成器': { preview: 'tools/qrcode.html', full: 'tools/qrcode.html' }
    };

    // 持久化键名
    const STORAGE_KEYS = {
        THEME: 'it_tools_theme',
        FAVORITES: 'it_tools_favorites',
        RECENT: 'it_tools_recent'
    };

    function getCards() {
        return Array.from(grid.querySelectorAll('.tool-card'));
    }

    function setTheme(mode) {
        const isLight = mode === 'light';
        app.classList.toggle('theme-light', isLight);
        themeIcon.textContent = isLight ? '🌞' : '🌙';
        try { localStorage.setItem(STORAGE_KEYS.THEME, mode); } catch {}
    }

    function initTheme() {
        let saved = null;
        try { saved = localStorage.getItem(STORAGE_KEYS.THEME); } catch {}
        if (saved) return setTheme(saved);
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    }

    function toggleTheme() {
        const isLight = app.classList.contains('theme-light');
        setTheme(isLight ? 'dark' : 'light');
    }

    function getFavoriteTitles() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]'); } catch { return []; }
    }
    function saveFavoriteTitles(list) {
        try { localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(list)); } catch {}
    }

    function setFavorite(card, active) {
        const btn = card.querySelector('.fav-btn');
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
        const title = card.querySelector('.card-title').textContent.trim();
        const current = new Set(getFavoriteTitles());
        if (active) current.add(title); else current.delete(title);
        saveFavoriteTitles(Array.from(current));
    }

    function initFavorites() {
        const favs = new Set(getFavoriteTitles());
        getCards().forEach(card => {
            const title = card.querySelector('.card-title').textContent.trim();
            const isFav = favs.has(title);
            card.querySelector('.fav-btn').classList.toggle('active', isFav);
        });
    }

    function markRecent(card) {
        const title = card.querySelector('.card-title').textContent.trim();
        let recent = [];
        try { recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT) || '[]'); } catch { recent = []; }
        const filtered = recent.filter(t => t !== title);
        filtered.unshift(title);
        try { localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(filtered.slice(0, 12))); } catch {}
    }

    function filterCards() {
        const q = (searchInput.value || '').toLowerCase().trim();
        const activeChip = chips.find(c => c.classList.contains('active'));
        const category = activeChip ? activeChip.getAttribute('data-filter') : 'all';
        const favSet = new Set(getFavoriteTitles());
        let visibleCount = 0;

        getCards().forEach(card => {
            const tags = (card.getAttribute('data-tags') || '').toLowerCase();
            const text = card.textContent.toLowerCase();
            const cardCategory = card.getAttribute('data-category') || 'misc';
            const title = card.querySelector('.card-title').textContent.trim();

            let matchSearch = !q || tags.includes(q) || text.includes(q);
            let matchCategory = (category === 'all')
                || (category === 'favorite' && favSet.has(title))
                || (category === 'recent')
                || (category === cardCategory);

            const show = matchSearch && matchCategory;
            card.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        grid.setAttribute('data-visible-count', String(visibleCount));
    }

    // 事件绑定
    themeToggle.addEventListener('click', toggleTheme);
    searchInput.addEventListener('input', filterCards);
    sidebarToggle.addEventListener('click', () => {
        const open = !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', open);
        const expanded = open ? 'true' : 'false';
        sidebarToggle.setAttribute('aria-expanded', expanded);
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterCards();
        });
    });

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.fav-btn');
        if (btn) {
            const card = e.target.closest('.tool-card');
            const active = !btn.classList.contains('active');
            setFavorite(card, active);
            return;
        }
        const open = e.target.closest('.btn-primary');
        if (open) {
            const card = e.target.closest('.tool-card');
            markRecent(card);
            openDetail(card);
            return;
        }
        const card = e.target.closest('.tool-card');
        if (card) {
            openDetail(card);
        }
    });

    function openDetail(card) {
        const title = card.querySelector('.card-title').textContent.trim();
        const desc = card.querySelector('.card-desc').textContent.trim();
        const category = card.getAttribute('data-category') || 'misc';
        const tags = card.getAttribute('data-tags') || '';

        detailTitle.textContent = title;
        detailDesc.textContent = desc;
        detailMeta.textContent = `类别：${category} ｜ 标签：${tags}`;

        // 预览加载
        detailLoading.style.display = '';
        detailPreview.style.display = 'none';
        detailPreview.src = '';
        const route = TOOL_ROUTES[title];
        if (route) {
            detailPreview.src = route.preview;
        }

        overlay.classList.add('show');
        drawer.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        drawer.setAttribute('aria-hidden', 'false');
        // 焦点管理
        detailClose.focus();

        detailPreview.onload = function () {
            detailLoading.style.display = 'none';
            detailPreview.style.display = '';
        };
        detailPreview.onerror = function () {
            detailLoading.textContent = '加载失败，请稍后重试。';
        };
    }

    function closeDetail() {
        overlay.classList.remove('show');
        drawer.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        drawer.setAttribute('aria-hidden', 'true');
    }

    overlay.addEventListener('click', closeDetail);
    detailClose.addEventListener('click', closeDetail);
    detailOpen.addEventListener('click', () => {
        const title = detailTitle.textContent.trim();
        const route = TOOL_ROUTES[title];
        if (route) {
            window.open(route.full, '_blank');
        } else {
            alert('未配置工具页面');
        }
        closeDetail();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDetail();
    });

    // 初始化
    initTheme();
    initFavorites();
    chips.find(c => c.getAttribute('data-filter') === 'all')?.classList.add('active');
    filterCards();
})();


