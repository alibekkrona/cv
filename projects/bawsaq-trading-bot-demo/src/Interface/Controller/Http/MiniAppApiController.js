const DashboardService = require('../../../Application/DashboardService');
const MarketDataService = require('../../../Application/MarketDataService');
const SignalService = require('../../../Application/SignalService');
const UserService = require('../../../Application/UserService');
const { getValidatedMiniAppSession } = require('../../../Util/telegramMiniApp');

class MiniAppApiController {
    static async resolveCurrentUser(req) {
        const validation = getValidatedMiniAppSession(req);

        if (!validation.ok) {
            return validation;
        }

        const telegramUser = validation.data.user;

        await UserService.upsertFromTelegram({
            id: telegramUser.id,
            username: telegramUser.username || '',
            first_name: telegramUser.first_name || '',
            last_name: telegramUser.last_name || '',
            language_code: telegramUser.language_code || '',
            is_bot: telegramUser.is_bot || false,
        });

        const user = await UserService.findByTelegramId(telegramUser.id);

        return {
            ok: true,
            data: {
                telegramUser,
                user,
                queryId: validation.data.queryId,
                authDate: validation.data.authDate,
                startParam: validation.data.startParam,
            },
        };
    }

    static buildPublicUserPayload(user) {
        if (!user) {
            return null;
        }

        return {
            telegramId: user.telegramId,
            username: user.username || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            languageCode: user.languageCode || '',
            isBot: Boolean(user.isBot),
            isAdmin: Boolean(user.isAdmin),
            accessStatus: user.accessStatus || 'new',
            applicationText: user.applicationText || null,
            applicationSubmittedAt: user.applicationSubmittedAt || null,
            approvedAt: user.approvedAt || null,
            rejectedAt: user.rejectedAt || null,
            createdAt: user.createdAt || null,
            updatedAt: user.updatedAt || null,
        };
    }

    static async me(req, res) {
        try {
            const resolved = await MiniAppApiController.resolveCurrentUser(req);

            if (!resolved.ok) {
                return res.status(401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const { telegramUser, user, authDate, startParam } = resolved.data;

            return res.json({
                ok: true,
                data: {
                    telegramUser: {
                        id: telegramUser.id,
                        firstName: telegramUser.first_name || '',
                        lastName: telegramUser.last_name || '',
                        username: telegramUser.username || '',
                        languageCode: telegramUser.language_code || '',
                    },
                    user: MiniAppApiController.buildPublicUserPayload(user),
                    access: {
                        isAdmin: UserService.isAdmin(user),
                        isApproved: UserService.isApproved(user),
                        accessStatus: user?.accessStatus || 'new',
                    },
                    session: {
                        authDate,
                        startParam,
                    },
                },
            });
        } catch (error) {
            console.error('MiniAppApiController.me error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load current user',
            });
        }
    }

    static async dashboard(req, res) {
        try {
            const resolved = await MiniAppApiController.resolveCurrentUser(req);

            if (!resolved.ok) {
                return res.status(401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const { user } = resolved.data;

            if (!UserService.isApproved(user)) {
                return res.status(403).json({
                    ok: false,
                    error: 'Access denied',
                    code: 'ACCESS_DENIED',
                    data: {
                        accessStatus: user?.accessStatus || 'new',
                    },
                });
            }

            const summary = await DashboardService.getSummary();

            return res.json({
                ok: true,
                data: {
                    ...summary,
                    accessStatus: user.accessStatus,
                    isAdmin: UserService.isAdmin(user),
                },
            });
        } catch (error) {
            console.error('MiniAppApiController.dashboard error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load dashboard data',
            });
        }
    }

    static async profile(req, res) {
        try {
            const resolved = await MiniAppApiController.resolveCurrentUser(req);

            if (!resolved.ok) {
                return res.status(401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const { user } = resolved.data;

            return res.json({
                ok: true,
                data: {
                    profile: MiniAppApiController.buildPublicUserPayload(user),
                },
            });
        } catch (error) {
            console.error('MiniAppApiController.profile error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load profile data',
            });
        }
    }

    static async market(req, res) {
        try {
            const resolved = await MiniAppApiController.resolveCurrentUser(req);

            if (!resolved.ok) {
                return res.status(401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const market = await MarketDataService.getMarketData();

            return res.json({
                ok: true,
                data: {
                    assets: market,
                },
            });
        } catch (error) {
            console.error('MiniAppApiController.market error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load market data',
            });
        }
    }

    static async signals(req, res) {
        try {
            const resolved = await MiniAppApiController.resolveCurrentUser(req);

            if (!resolved.ok) {
                return res.status(401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const signals = await SignalService.getActiveSignals();

            return res.json({
                ok: true,
                data: {
                    items: signals,
                },
            });
        } catch (error) {
            console.error('MiniAppApiController.signals error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load signals',
            });
        }
    }

    static async signalDetails(req, res) {
        try {
            const resolved = await MiniAppApiController.resolveCurrentUser(req);

            if (!resolved.ok) {
                return res.status(401).json({
                    ok: false,
                    error: resolved.error,
                    code: resolved.code,
                });
            }

            const signal = await SignalService.getVisibleSignalById(req.params.signalId);

            if (!signal) {
                return res.status(404).json({
                    ok: false,
                    code: 'NOT_FOUND',
                    error: 'Signal not found',
                });
            }

            return res.json({
                ok: true,
                data: {
                    signal,
                },
            });
        } catch (error) {
            console.error('MiniAppApiController.signalDetails error:', error);

            return res.status(500).json({
                ok: false,
                error: 'Failed to load signal details',
            });
        }
    }
}

module.exports = MiniAppApiController;
