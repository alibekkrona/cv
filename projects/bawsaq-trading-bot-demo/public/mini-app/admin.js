(function () {
    const tg = window.Telegram?.WebApp;
    const pageType = window.__MINI_APP_PAGE__?.pageType || '';

    function getRawInitData() {
        return tg?.initData || '';
    }

    function buildMiniAppUrl(page) {
        const url = new URL('/mini-app', window.location.origin);
        url.searchParams.set('page', page);

        const initData = getRawInitData();
        if (initData) {
            url.searchParams.set('initData', initData);
        }

        return url.toString();
    }

    async function miniAppFetch(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'X-Telegram-Init-Data': getRawInitData(),
            },
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

    function formatName(user) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        return fullName || 'Без имени';
    }

    function getAvatarText(user) {
        const source = [user.firstName, user.lastName]
            .filter(Boolean)
            .map((part) => String(part).trim())
            .filter(Boolean);

        if (source.length) {
            return source.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
        }

        if (user.username) {
            return String(user.username).slice(0, 2).toUpperCase();
        }

        return 'TG';
    }

    function renderAvatar(user) {
        const imageUrl = user.photoUrl || user.avatarUrl || '';

        if (imageUrl) {
            return `<span class="admin-avatar"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(formatName(user))}" /></span>`;
        }

        return `<span class="admin-avatar">${escapeHtml(getAvatarText(user))}</span>`;
    }

    function createAdminUsersPage(rootEl, { standalone = false } = {}) {
        const adminRoleValueEl = rootEl.querySelector('#adminRoleValue');
        const adminAccessValueEl = rootEl.querySelector('#adminAccessValue');
        const adminUsersBadgeEl = rootEl.querySelector('#adminUsersBadge');
        const adminUsersTableStateEl = rootEl.querySelector('#adminUsersTableState');
        const adminNavButtonEls = standalone
            ? Array.from(document.querySelectorAll('#adminMiniAppNav .nav-tabs__button'))
            : [];

        const state = {
            page: 1,
            perPage: 10,
            status: 'all',
            search: '',
            usersPage: null,
            isBusy: false,
        };

        function setActionButtonsDisabled(disabled) {
            rootEl.querySelectorAll('[data-action][data-telegram-id]').forEach((buttonEl) => {
                buttonEl.disabled = disabled;
            });
        }

        function renderDeniedState(message) {
            if (adminUsersBadgeEl) {
                adminUsersBadgeEl.textContent = 'Access denied';
            }

            if (adminRoleValueEl) {
                adminRoleValueEl.textContent = 'Unavailable';
            }

            if (adminAccessValueEl) {
                adminAccessValueEl.textContent = 'Denied';
            }

            if (adminUsersTableStateEl) {
                adminUsersTableStateEl.innerHTML = `<div class="admin-empty-state">${escapeHtml(message)}</div>`;
            }
        }

        function renderToolbar() {
            return `
                <div class="admin-toolbar">
                    <div class="admin-toolbar__group">
                        <label class="admin-toolbar__label" for="statusFilter">Status</label>
                        <select id="statusFilter" class="admin-toolbar__select">
                            <option value="all" ${state.status === 'all' ? 'selected' : ''}>All</option>
                            <option value="new" ${state.status === 'new' ? 'selected' : ''}>New</option>
                            <option value="pending" ${state.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${state.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${state.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>

                    <div class="admin-toolbar__group admin-toolbar__group--search">
                        <label class="admin-toolbar__label" for="searchInput">Search</label>
                        <input id="searchInput" class="admin-toolbar__input" type="text" value="${escapeHtml(state.search)}" placeholder="username / telegram id" />
                    </div>

                    <div class="admin-toolbar__actions">
                        <button id="applyFiltersButton" class="admin-button admin-button--primary" type="button">Apply</button>
                        <button id="resetFiltersButton" class="admin-button" type="button">Reset</button>
                    </div>
                </div>
            `;
        }

        function renderTable(pageData) {
            if (!pageData.items.length) {
                return '<div class="admin-empty-state">No users match the current filters.</div>';
            }

            const rows = pageData.items.map((user) => `
                <tr>
                    <td>
                        <div class="admin-user-cell">
                            ${renderAvatar(user)}
                            <div class="admin-user-meta">
                                <div class="admin-user-meta__name">${escapeHtml(formatName(user))}</div>
                                <div class="admin-user-meta__sub">@${escapeHtml(user.username || 'unknown')}</div>
                            </div>
                        </div>
                    </td>
                    <td>@${escapeHtml(user.username || 'unknown')}</td>
                    <td>${escapeHtml(String(user.telegramId))}</td>
                    <td>
                        <span class="status-badge status-badge--${escapeHtml(user.accessStatus)}">${escapeHtml(user.accessStatus)}</span>
                    </td>
                    <td>${user.isAdmin ? 'YES' : 'NO'}</td>
                    <td class="admin-actions-cell">
                        ${user.accessStatus !== 'approved' ? `<button class="admin-button admin-button--success" data-action="approve" data-telegram-id="${user.telegramId}">Approve</button>` : ''}
                        ${user.accessStatus !== 'rejected' ? `<button class="admin-button admin-button--warning" data-action="reject" data-telegram-id="${user.telegramId}">Reject</button>` : ''}
                        <button class="admin-button admin-button--danger" data-action="delete" data-telegram-id="${user.telegramId}">Delete</button>
                    </td>
                </tr>
            `).join('');

            return `
                <div class="admin-table-wrap">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Profile Image</th>
                                <th>Username</th>
                                <th>Telegram ID</th>
                                <th>Status</th>
                                <th>Admin</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
        }

        function renderPagination(pageData) {
            return `
                <div class="admin-pagination">
                    <button id="prevPageButton" class="admin-button admin-pagination__button admin-pagination__button--prev" type="button" ${pageData.hasPrev ? '' : 'disabled'}>Prev</button>
                    <div class="admin-pagination__meta">Page ${pageData.page} / ${pageData.totalPages}</div>
                    <button id="nextPageButton" class="admin-button admin-pagination__button admin-pagination__button--next" type="button" ${pageData.hasNext ? '' : 'disabled'}>Next</button>
                    <div class="admin-pagination__total">Total ${pageData.total}</div>
                </div>
            `;
        }

        function renderPageData(pageData) {
            if (adminUsersBadgeEl) {
                adminUsersBadgeEl.textContent = `Users: ${pageData.total}`;
            }

            if (adminUsersTableStateEl) {
                adminUsersTableStateEl.innerHTML = `${renderToolbar()}${renderTable(pageData)}${renderPagination(pageData)}`;
            }

            bindToolbarEvents();
            bindPaginationEvents(pageData);
            bindActionEvents();
            setActionButtonsDisabled(state.isBusy);
        }

        function setAdminMeta(me) {
            const access = me?.data?.access || {};
            const user = me?.data?.user || {};

            if (adminUsersBadgeEl) {
                adminUsersBadgeEl.textContent = 'Admin ready';
            }
            if (adminRoleValueEl) {
                adminRoleValueEl.textContent = access.isAdmin ? 'Administrator' : 'User';
            }
            if (adminAccessValueEl) {
                adminAccessValueEl.textContent = access.accessStatus || user.accessStatus || 'new';
            }
        }

        async function loadUsersPage(options = {}) {
            const { keepContent = false } = options;
            const params = new URLSearchParams({
                page: String(state.page),
                perPage: String(state.perPage),
                status: state.status,
                search: state.search,
            });

            if (adminUsersTableStateEl) {
                if (!keepContent || !state.usersPage) {
                    adminUsersTableStateEl.innerHTML = '<div class="admin-loading-state">Loading users...</div>';
                } else {
                    adminUsersTableStateEl.style.minHeight = `${adminUsersTableStateEl.offsetHeight}px`;
                    adminUsersTableStateEl.classList.add('is-updating');
                }
            }

            try {
                const result = await miniAppFetch(`/api/mini-app/admin/users?${params.toString()}`);
                state.usersPage = result.data;
                renderPageData(result.data);
            } finally {
                if (adminUsersTableStateEl) {
                    adminUsersTableStateEl.classList.remove('is-updating');
                    adminUsersTableStateEl.style.minHeight = '';
                }
            }
        }

        async function performAction(action, telegramId) {
            if (state.isBusy) return;

            const labels = {
                approve: 'Approve this user?',
                reject: 'Reject this user?',
                delete: 'Delete this user?',
            };

            if (!window.confirm(labels[action] || 'Confirm action?')) return;

            state.isBusy = true;
            setActionButtonsDisabled(true);

            try {
                let url = `/api/mini-app/admin/users/${telegramId}`;
                let method = 'DELETE';

                if (action === 'approve') {
                    url = `/api/mini-app/admin/users/${telegramId}/approve`;
                    method = 'POST';
                }
                if (action === 'reject') {
                    url = `/api/mini-app/admin/users/${telegramId}/reject`;
                    method = 'POST';
                }

                await miniAppFetch(url, { method });
                await loadUsersPage({ keepContent: true });
            } catch (error) {
                console.error(`${action} failed:`, error);
            } finally {
                state.isBusy = false;
                setActionButtonsDisabled(false);
            }
        }

        function bindToolbarEvents() {
            const statusFilterEl = rootEl.querySelector('#statusFilter');
            const searchInputEl = rootEl.querySelector('#searchInput');
            const applyFiltersButtonEl = rootEl.querySelector('#applyFiltersButton');
            const resetFiltersButtonEl = rootEl.querySelector('#resetFiltersButton');

            if (applyFiltersButtonEl) {
                applyFiltersButtonEl.addEventListener('click', async () => {
                    state.status = statusFilterEl?.value || 'all';
                    state.search = searchInputEl?.value?.trim() || '';
                    state.page = 1;
                    await loadUsersPage();
                });
            }
            if (searchInputEl) {
                searchInputEl.addEventListener('keydown', async (event) => {
                    if (event.key !== 'Enter') return;
                    state.status = statusFilterEl?.value || 'all';
                    state.search = searchInputEl?.value?.trim() || '';
                    state.page = 1;
                    await loadUsersPage();
                });
            }
            if (resetFiltersButtonEl) {
                resetFiltersButtonEl.addEventListener('click', async () => {
                    state.status = 'all';
                    state.search = '';
                    state.page = 1;
                    await loadUsersPage();
                });
            }
        }

        function bindPaginationEvents(pageData) {
            const prevPageButtonEl = rootEl.querySelector('#prevPageButton');
            const nextPageButtonEl = rootEl.querySelector('#nextPageButton');

            if (prevPageButtonEl) {
                prevPageButtonEl.addEventListener('click', async () => {
                    if (!pageData.hasPrev) return;
                    state.page = pageData.page - 1;
                    await loadUsersPage();
                });
            }
            if (nextPageButtonEl) {
                nextPageButtonEl.addEventListener('click', async () => {
                    if (!pageData.hasNext) return;
                    state.page = pageData.page + 1;
                    await loadUsersPage();
                });
            }
        }

        function bindActionEvents() {
            rootEl.querySelectorAll('[data-action][data-telegram-id]').forEach((buttonEl) => {
                buttonEl.addEventListener('click', async () => {
                    await performAction(buttonEl.dataset.action, buttonEl.dataset.telegramId);
                });
            });
        }

        function bindAdminNavEvents() {
            adminNavButtonEls.forEach((buttonEl) => {
                buttonEl.addEventListener('click', () => {
                    const page = buttonEl.dataset.page;
                    if (page === 'users') return;
                    window.location.href = buildMiniAppUrl(page);
                });
            });
        }

        async function setupViewport() {
            if (!tg) return;
            tg.ready();
            tg.expand();
            if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes();
            if (tg.MainButton) tg.MainButton.hide();
        }

        async function init() {
            if (standalone) {
                await setupViewport();
                bindAdminNavEvents();

                if (window.__ADMIN_BOOTSTRAP_ERROR__) {
                    renderDeniedState(window.__ADMIN_BOOTSTRAP_ERROR__);
                    return;
                }
            }

            try {
                const me = await miniAppFetch('/api/mini-app/me');
                const isAdmin = Boolean(me?.data?.access?.isAdmin);
                if (!isAdmin) {
                    renderDeniedState('У вас нет доступа к admin panel.');
                    return;
                }
                setAdminMeta(me);
                await loadUsersPage();
            } catch (error) {
                console.error('admin bootstrap error:', error);
                renderDeniedState('Не удалось инициализировать admin page.');
            }
        }

        return { init };
    }

    window.AdminUsersPage = {
        async initEmbedded(rootEl) {
            const page = createAdminUsersPage(rootEl, { standalone: false });
            await page.init();
        },
    };

    if (pageType === 'admin-users') {
        const page = createAdminUsersPage(document, { standalone: true });
        page.init();
    }
})();
