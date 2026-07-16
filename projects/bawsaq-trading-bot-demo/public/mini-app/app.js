const tg = window.Telegram?.WebApp;

const pageTitleEl = document.getElementById('pageTitle');
const appContentEl = document.getElementById('appContent');
const navButtonEls = Array.from(document.querySelectorAll('.nav-tabs__button'));
const navUsersButtonEl = document.getElementById('navUsersButton');

let currentPage = window.__MINI_APP_PAGE__?.initialPage || 'home';
let currentMe = null;
let currentSignalsState = {
    selectedSignalId: null,
};

function getRawInitData() {
    return tg?.initData || '';
}

function getUnsafeTelegramUser() {
    return tg?.initDataUnsafe?.user || null;
}

function getTelegramUserDisplayName(user) {
    if (!user) {
        return 'Пользователь Telegram не определён';
    }

    const fullName = [user.firstName || user.first_name, user.lastName || user.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

    const username = user.username ? ` (@${user.username})` : '';
    return `${fullName || 'Без имени'}${username}`;
}

function getRequestedPage() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    return ['home', 'dashboard', 'market', 'signals', 'profile', 'users'].includes(page) ? page : 'home';
}

function updateUrlPage(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.history.replaceState({}, '', url);
}

function buildAdminUsersUrl(embed = false) {
    const url = new URL('/mini-app/admin/users', window.location.origin);

    const initData = getRawInitData();
    if (initData) {
        url.searchParams.set('initData', initData);
    }

    if (embed) {
        url.searchParams.set('embed', '1');
    }

    return url.toString();
}

async function miniAppFetch(url, options = {}) {
    const initData = getRawInitData();
    const headers = {
        ...(options.headers || {}),
        'X-Telegram-Init-Data': initData,
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
        const error = new Error(result.error || `Request failed: ${response.status}`);
        error.code = result.code || null;
        error.status = response.status;
        error.payload = result;
        throw error;
    }

    return result;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderChart(data) {
    return data
        .map((item) => {
            return `
                <div class="chart__bar-group">
                    <div class="chart__bar" style="height: ${item.value}%"></div>
                    <div class="chart__label">${item.label}</div>
                </div>
            `;
        })
        .join('');
}

function renderAccessBadge(accessStatus) {
    if (accessStatus === 'approved') return 'APPROVED';
    if (accessStatus === 'pending') return 'PENDING';
    if (accessStatus === 'rejected') return 'REJECTED';
    return 'NEW';
}

function formatPrice(value) {
    if (!Number.isFinite(value)) {
        return '—';
    }

    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: value >= 1000 ? 2 : 4,
        maximumFractionDigits: value >= 1000 ? 2 : 4,
    }).format(value);
}

function formatChange(value) {
    if (!Number.isFinite(value)) {
        return '—';
    }

    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('ru-RU');
}

function getMarketChangeClass(value) {
    if (value > 0) return 'market-list__change--positive';
    if (value < 0) return 'market-list__change--negative';
    return '';
}

function getSignalSideClass(side) {
    return side === 'sell' ? 'status-badge--rejected' : 'status-badge--approved';
}

function getSignalStatusClass(status) {
    if (status === 'active') return 'status-badge--approved';
    if (status === 'draft') return 'status-badge--new';
    if (status === 'closed') return 'status-badge--pending';
    if (status === 'canceled') return 'status-badge--rejected';
    return 'status-badge--new';
}

function renderMarketRows(assets) {
    return assets
        .map((asset) => {
            const changeClass = getMarketChangeClass(asset.change24h);

            return `
                <div class="market-list__row">
                    <div class="market-list__cell market-list__cell--symbol">${asset.symbol}</div>
                    <div class="market-list__cell">${formatPrice(asset.price)}</div>
                    <div class="market-list__cell ${changeClass}">${formatChange(asset.change24h)}</div>
                </div>
            `;
        })
        .join('');
}

function renderSignalsEmptyState() {
    return `
        <div class="signals-empty-state">
            <div class="signals-empty-state__icon">📡</div>
            <div class="signals-empty-state__title">No active signals right now</div>
            <div class="signals-empty-state__text">New trade ideas will appear here when they are published.</div>
        </div>
    `;
}

function renderSignalCards(items) {
    if (!items.length) {
        return renderSignalsEmptyState();
    }

    return items
        .map((signal) => {
            const publishedLabel = signal.publishedAt
                ? `Published ${escapeHtml(formatDateTime(signal.publishedAt))}`
                : `Status: ${escapeHtml(signal.status || 'draft')}`;

            return `
                <article class="signal-card signal-card--active">
                    <div class="signal-card__header">
                        <div>
                            <div class="signal-card__eyebrow">Active signal</div>
                            <div class="signal-card__symbol-row">
                                <div class="signal-card__symbol">${escapeHtml(signal.symbol)}</div>
                                <span class="status-badge ${getSignalSideClass(signal.side)}">${escapeHtml(signal.side)}</span>
                            </div>
                        </div>
                        <div class="signal-card__badges">
                            <span class="status-badge ${getSignalStatusClass(signal.status)}">${escapeHtml(signal.status)}</span>
                        </div>
                    </div>

                    <div class="signal-card__grid">
                        <div class="signal-card__item"><span>Entry zone</span><strong>${escapeHtml(signal.entryZone)}</strong></div>
                        <div class="signal-card__item"><span>Stop loss</span><strong>${escapeHtml(signal.stopLoss)}</strong></div>
                        <div class="signal-card__item"><span>Take profit</span><strong>${escapeHtml(signal.takeProfit)}</strong></div>
                    </div>

                    <div class="signal-card__comment">${escapeHtml(signal.comment || 'No additional comment yet.')}</div>

                    <div class="signal-card__footer">
                        <div class="signal-card__meta">${publishedLabel}</div>
                        <div class="signal-card__actions">
                            <button class="admin-button admin-button--primary" type="button" data-view-signal-id="${escapeHtml(signal.id)}">View details</button>
                        </div>
                    </div>
                </article>
            `;
        })
        .join('');
}

function renderSignalDetails(signal) {
    return `
        <section class="panel panel--signal-details">
            <div class="panel__header">
                <div>
                    <div class="panel__eyebrow">Signal details</div>
                    <h3 class="panel__title">${escapeHtml(signal.symbol)} · ${escapeHtml(String(signal.side || '').toUpperCase() || '—')}</h3>
                </div>
                <span class="status-badge ${getSignalStatusClass(signal.status)}">${escapeHtml(signal.status)}</span>
            </div>

            <div class="info-list">
                <div class="info-row"><div class="info-row__label">Entry zone</div><div class="info-row__value">${escapeHtml(signal.entryZone)}</div></div>
                <div class="info-row"><div class="info-row__label">Stop loss</div><div class="info-row__value">${escapeHtml(signal.stopLoss)}</div></div>
                <div class="info-row"><div class="info-row__label">Take profit</div><div class="info-row__value">${escapeHtml(signal.takeProfit)}</div></div>
                <div class="info-row"><div class="info-row__label">Comment</div><div class="info-row__value">${escapeHtml(signal.comment || '—')}</div></div>
                <div class="info-row"><div class="info-row__label">Published at</div><div class="info-row__value">${escapeHtml(formatDateTime(signal.publishedAt))}</div></div>
            </div>
        </section>
    `;
}
