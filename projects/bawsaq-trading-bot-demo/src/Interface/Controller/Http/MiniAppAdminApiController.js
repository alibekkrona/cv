const AdminUserService = require('../../../Application/AdminUserService');
const MiniAppApiController = require('./MiniAppApiController');
const SignalService = require('../../../Application/SignalService');
const UserService = require('../../../Application/UserService');

class MiniAppAdminApiController {
    static async resolveAdmin(req) {
        const resolved = await MiniAppApiController.resolveCurrentUser(req);

        if (!resolved.ok) {
            return resolved;
        }

        if (!UserService.isAdmin(resolved.data.user)) {
            return {
                ok: false,
                code: 'ADMIN_ONLY',
                error: 'Admin access required',
            };
        }

        return resolved;
    }

    static async users(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const page = req.query.page || 1;
            const perPage = req.query.perPage || 10;
            const status = req.query.status || 'all';
            const search = req.query.search || '';

            const pageData = await AdminUserService.getUsersPage({
                page,
                perPage,
                status,
                search,
            });

            return res.json({
                ok: true,
                data: pageData,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.users error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load admin users',
            });
        }
    }

    static async signals(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const items = await SignalService.getAdminSignals();

            return res.json({
                ok: true,
                data: {
                    items,
                },
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.signals error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load admin signals',
            });
        }
    }

    static async createSignal(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await SignalService.createSignal(req.body || {}, resolved.data.user.telegramId);

            if (!result.ok) {
                return res.status(result.code === 'VALIDATION_ERROR' ? 400 : 500).json({
                    ok: false,
                    code: result.code,
                    error: result.error || 'Failed to create signal',
                });
            }

            return res.status(201).json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.createSignal error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to create signal',
            });
        }
    }

    static async updateSignal(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await SignalService.updateDraftSignal(req.params.signalId, req.body || {});

            if (!result.ok) {
                const status = result.code === 'NOT_FOUND' ? 404 : 400;

                return res.status(status).json({
                    ok: false,
                    code: result.code,
                    error: result.error || 'Failed to update signal',
                    data: result.signal ? { signal: result.signal } : null,
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.updateSignal error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to update signal',
            });
        }
    }

    static async publishSignal(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await SignalService.publishSignal(req.params.signalId);

            if (!result.ok) {
                const status = result.code === 'NOT_FOUND' ? 404 : 400;

                return res.status(status).json({
                    ok: false,
                    code: result.code,
                    error: 'Failed to publish signal',
                    data: result.signal ? { signal: result.signal } : null,
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.publishSignal error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to publish signal',
            });
        }
    }

    static async closeSignal(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await SignalService.closeSignal(req.params.signalId);

            if (!result.ok) {
                const status = result.code === 'NOT_FOUND' ? 404 : 400;

                return res.status(status).json({
                    ok: false,
                    code: result.code,
                    error: 'Failed to close signal',
                    data: result.signal ? { signal: result.signal } : null,
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.closeSignal error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to close signal',
            });
        }
    }

    static async cancelSignal(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await SignalService.cancelSignal(req.params.signalId);

            if (!result.ok) {
                const status = result.code === 'NOT_FOUND' ? 404 : 400;

                return res.status(status).json({
                    ok: false,
                    code: result.code,
                    error: 'Failed to cancel signal',
                    data: result.signal ? { signal: result.signal } : null,
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.cancelSignal error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to cancel signal',
            });
        }
    }

    static async approve(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await AdminUserService.approveUser(
                req.params.telegramId,
                resolved.data.user.telegramId
            );

            if (!result.ok) {
                return res.status(result.code === 'NOT_FOUND' ? 404 : 400).json({
                    ok: false,
                    code: result.code,
                    error: 'Failed to approve user',
                    data: result.user ? { user: result.user } : null,
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.approve error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to approve user',
            });
        }
    }

    static async reject(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await AdminUserService.rejectUser(
                req.params.telegramId,
                resolved.data.user.telegramId
            );

            if (!result.ok) {
                return res.status(result.code === 'NOT_FOUND' ? 404 : 400).json({
                    ok: false,
                    code: result.code,
                    error: 'Failed to reject user',
                    data: result.user ? { user: result.user } : null,
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.reject error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to reject user',
            });
        }
    }

    static async remove(req, res) {
        try {
            const resolved = await MiniAppAdminApiController.resolveAdmin(req);

            if (!resolved.ok) {
                return res.status(resolved.code === 'ADMIN_ONLY' ? 403 : 401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const result = await AdminUserService.deleteUser(
                req.params.telegramId,
                resolved.data.user.telegramId
            );

            if (!result.ok) {
                return res.status(result.code === 'NOT_FOUND' ? 404 : 400).json({
                    ok: false,
                    code: result.code,
                    error: 'Failed to delete user',
                });
            }

            return res.json({
                ok: true,
                data: result,
            });
        } catch (error) {
            console.error('MiniAppAdminApiController.remove error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to delete user',
            });
        }
    }
}

module.exports = MiniAppAdminApiController;
