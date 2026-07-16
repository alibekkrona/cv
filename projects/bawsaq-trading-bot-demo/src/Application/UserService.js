const UserModel = require('../Infrastructure/Database/Model/UserModel');

class UserService {
    static getAdminTelegramIds() {
        return String(process.env.ADMIN_TELEGRAM_IDS || '')
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isFinite(value) && value > 0);
    }

    static isConfiguredAdminId(telegramId) {
        return UserService.getAdminTelegramIds().includes(Number(telegramId));
    }

    static async upsertFromTelegram(telegramUser) {
        const configuredAdmin = UserService.isConfiguredAdminId(telegramUser.id);

        let user = await UserModel.findOneAndUpdate(
            { telegramId: telegramUser.id },
            {
                $set: {
                    telegramId: telegramUser.id,
                    username: telegramUser.username || '',
                    firstName: telegramUser.first_name || '',
                    lastName: telegramUser.last_name || '',
                    languageCode: telegramUser.language_code || '',
                    isBot: telegramUser.is_bot || false,
                    lastSeenAt: new Date(),
                },
                $setOnInsert: {
                    isAdmin: false,
                    accessStatus: 'new',
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

        const nextIsAdmin = configuredAdmin;
        const nextAccessStatus =
            configuredAdmin && user.accessStatus === 'new'
                ? 'approved'
                : user.accessStatus;

        if (user.isAdmin !== nextIsAdmin || user.accessStatus !== nextAccessStatus) {
            user = await UserModel.findOneAndUpdate(
                { telegramId: telegramUser.id },
                {
                    $set: {
                        isAdmin: nextIsAdmin,
                        accessStatus: nextAccessStatus,
                    },
                },
                {
                    new: true,
                }
            );
        }

        return user;
    }

    static async countUsers() {
        return UserModel.countDocuments();
    }

    static async findByTelegramId(telegramId) {
        return UserModel.findOne({
            telegramId: Number(telegramId),
        });
    }

    static isApproved(user) {
        return Boolean(user && user.accessStatus === 'approved');
    }

    static isAdmin(user) {
        return Boolean(user && user.isAdmin === true);
    }

    static async submitApplication(telegramId, applicationText = null) {
        return UserModel.findOneAndUpdate(
            { telegramId: Number(telegramId) },
            {
                $set: {
                    accessStatus: 'pending',
                    applicationText: applicationText || 'Пользователь подал заявку через Telegram bot',
                    applicationSubmittedAt: new Date(),
                    approvedAt: null,
                    approvedBy: null,
                    rejectedAt: null,
                    rejectedBy: null,
                },
            },
            {
                new: true,
            }
        );
    }

    static async approveUser(targetTelegramId, adminTelegramId) {
        const user = await UserModel.findOne({
            telegramId: Number(targetTelegramId),
        });

        if (!user) {
            return {
                ok: false,
                code: 'NOT_FOUND',
            };
        }

        if (user.accessStatus === 'approved') {
            return {
                ok: false,
                code: 'ALREADY_APPROVED',
                user,
            };
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            { telegramId: Number(targetTelegramId) },
            {
                $set: {
                    accessStatus: 'approved',
                    approvedAt: new Date(),
                    approvedBy: Number(adminTelegramId),
                    rejectedAt: null,
                    rejectedBy: null,
                },
            },
            {
                new: true,
            }
        );

        return {
            ok: true,
            code: 'APPROVED',
            user: updatedUser,
        };
    }

    static async rejectUser(targetTelegramId, adminTelegramId) {
        const user = await UserModel.findOne({
            telegramId: Number(targetTelegramId),
        });

        if (!user) {
            return {
                ok: false,
                code: 'NOT_FOUND',
            };
        }

        if (user.accessStatus === 'rejected') {
            return {
                ok: false,
                code: 'ALREADY_REJECTED',
                user,
            };
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            { telegramId: Number(targetTelegramId) },
            {
                $set: {
                    accessStatus: 'rejected',
                    rejectedAt: new Date(),
                    rejectedBy: Number(adminTelegramId),
                    approvedAt: null,
                    approvedBy: null,
                },
            },
            {
                new: true,
            }
        );

        return {
            ok: true,
            code: 'REJECTED',
            user: updatedUser,
        };
    }

    static async deleteUser(targetTelegramId) {
        return UserModel.deleteOne({
            telegramId: Number(targetTelegramId),
        });
    }

    static normalizePage(page) {
        const parsed = Number(page);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 1;
        }

        return Math.floor(parsed);
    }

    static buildPaginationMeta(total, page, perPage) {
        const safeTotal = Number(total) || 0;
        const safePerPage = Number(perPage) || 10;
        const totalPages = Math.max(1, Math.ceil(safeTotal / safePerPage));
        const safePage = Math.min(UserService.normalizePage(page), totalPages);
        const skip = (safePage - 1) * safePerPage;

        return {
            page: safePage,
            perPage: safePerPage,
            total: safeTotal,
            totalPages,
            skip,
            hasPrev: safePage > 1,
            hasNext: safePage < totalPages,
        };
    }

    static async getPendingUsersPage(page = 1, perPage = 10) {
        const total = await UserModel.countDocuments({
            accessStatus: 'pending',
        });

        const meta = UserService.buildPaginationMeta(total, page, perPage);

        const items = await UserModel.find({
            accessStatus: 'pending',
        })
            .sort({ applicationSubmittedAt: 1, createdAt: 1 })
            .skip(meta.skip)
            .limit(meta.perPage);

        return {
            items,
            ...meta,
        };
    }

    static async getAllUsersPage(page = 1, perPage = 10) {
        const total = await UserModel.countDocuments({});

        const meta = UserService.buildPaginationMeta(total, page, perPage);

        const items = await UserModel.find({})
            .sort({ createdAt: -1 })
            .skip(meta.skip)
            .limit(meta.perPage);

        return {
            items,
            ...meta,
        };
    }

    static getAccessLabel(accessStatus) {
        if (accessStatus === 'approved') return 'APPROVED';
        if (accessStatus === 'pending') return 'PENDING';
        if (accessStatus === 'rejected') return 'REJECTED';
        return 'NEW';
    }

    static formatDate(value) {
        if (!value) return '—';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return date.toLocaleString('ru-RU');
    }

    static formatUserListItem(user, options = {}) {
        const { index = null } = options;

        const fullName =
            [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Без имени';

        const username = user?.username ? `@${user.username}` : '—';
        const prefix = index !== null ? `${index}. ` : '';

        return [
            `${prefix}${fullName}`,
            `ID: ${user?.telegramId || '—'}`,
            `user: ${username}`,
            `status: ${UserService.getAccessLabel(user?.accessStatus)}`,
            `admin: ${user?.isAdmin ? 'YES' : 'NO'}`,
        ].join('\n');
    }

    static buildSeedUser(index, baseId) {
        const statuses = ['new', 'pending', 'approved', 'rejected'];
        const accessStatus = statuses[index % statuses.length];
        const telegramId = baseId + index + 1;
        const createdAt = new Date(Date.now() - index * 60 * 60 * 1000);

        const seedUser = {
            telegramId,
            username: `test_user_${index + 1}`,
            firstName: `Test${index + 1}`,
            lastName: 'User',
            languageCode: 'ru',
            isBot: false,
            isAdmin: false,
            accessStatus,
            applicationText: null,
            applicationSubmittedAt: null,
            approvedAt: null,
            approvedBy: null,
            rejectedAt: null,
            rejectedBy: null,
            lastSeenAt: createdAt,
            createdAt,
            updatedAt: createdAt,
        };

        if (accessStatus === 'pending') {
            seedUser.applicationText = `Тестовая заявка #${index + 1}`;
            seedUser.applicationSubmittedAt = createdAt;
        }

        if (accessStatus === 'approved') {
            seedUser.applicationText = `Тестовая заявка #${index + 1}`;
            seedUser.applicationSubmittedAt = createdAt;
            seedUser.approvedAt = createdAt;
            seedUser.approvedBy = 1;
        }

        if (accessStatus === 'rejected') {
            seedUser.applicationText = `Тестовая заявка #${index + 1}`;
            seedUser.applicationSubmittedAt = createdAt;
            seedUser.rejectedAt = createdAt;
            seedUser.rejectedBy = 1;
        }

        return seedUser;
    }

    static async seedTestUsers(count = 20) {
        const safeCount = Math.max(1, Math.min(100, Number(count) || 20));
        const baseId = Number(`7${String(Date.now()).slice(-10)}`);
        const docs = [];

        for (let i = 0; i < safeCount; i += 1) {
            docs.push(UserService.buildSeedUser(i, baseId));
        }

        await UserModel.insertMany(docs);

        return {
            insertedCount: docs.length,
        };
    }
}

module.exports = UserService;