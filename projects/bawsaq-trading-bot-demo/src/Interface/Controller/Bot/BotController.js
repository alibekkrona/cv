const { Markup } = require('telegraf');

const { safeAnswerCbQuery, safeEditMessage } = require('../../../Util/telegram');
const { sendCard } = require('../../../Util/ui');

const UserService = require('../../../Application/UserService');

const HomeView = require('../../View/Bot/pages/HomeView');
const ProfileView = require('../../View/Bot/pages/ProfileView');
const HelpView = require('../../View/Bot/pages/HelpView');
const DashboardView = require('../../View/Bot/pages/DashboardView');
const SettingsView = require('../../View/Bot/pages/SettingsView');
const CustomTagView = require('../../View/Bot/pages/CustomTagView');
const AccessStatusView = require('../../View/Bot/pages/AccessStatusView');
const AdminOnlyView = require('../../View/Bot/pages/AdminOnlyView');

class BotController {
    static async getCurrentUser(ctx) {
        await UserService.upsertFromTelegram(ctx.from);
        return UserService.findByTelegramId(ctx.from.id);
    }

    static async notifyUserAccessApproved(ctx, telegramId) {
        try {
            await ctx.telegram.sendMessage(
                Number(telegramId),
                [
                    '✅ Ваша заявка одобрена.',
                    'Доступ к функциям бота открыт.',
                    '',
                    'Откройте бота и нажмите /start чтобы обновить интерфейс.',
                ].join('\n')
            );
        } catch (error) {
            console.error('notifyUserAccessApproved error:', error.message);
        }
    }

    static async notifyUserAccessRejected(ctx, telegramId) {
        try {
            await ctx.telegram.sendMessage(
                Number(telegramId),
                [
                    '❌ Ваша заявка отклонена.',
                    'Сейчас доступ к функциям бота ограничен.',
                    '',
                    'Позже вы сможете подать заявку повторно, если логика проекта это позволит.',
                ].join('\n')
            );
        } catch (error) {
            console.error('notifyUserAccessRejected error:', error.message);
        }
    }

    static buildAdminMiniAppUrl() {
        const miniAppUrl = String(process.env.MINI_APP_URL || '').trim();

        if (!miniAppUrl) {
            return '';
        }

        if (miniAppUrl.endsWith('/mini-app')) {
            return `${miniAppUrl}/admin/users`;
        }

        if (miniAppUrl.endsWith('/mini-app/')) {
            return `${miniAppUrl}admin/users`;
        }

        return miniAppUrl;
    }

    static async start(ctx) {
        const user = await BotController.getCurrentUser(ctx);
        const totalUsers = await UserService.countUsers();

        const view = UserService.isApproved(user)
            ? HomeView.renderApproved({
                firstName: ctx.from?.first_name || 'друг',
                totalUsers,
                isAdmin: UserService.isAdmin(user),
            })
            : HomeView.renderGuest({
                firstName: ctx.from?.first_name || 'друг',
                accessStatus: user?.accessStatus || 'new',
            });

        await sendCard(ctx, view);
    }

    static async home(ctx) {
        const user = await BotController.getCurrentUser(ctx);
        const totalUsers = await UserService.countUsers();

        const view = UserService.isApproved(user)
            ? HomeView.renderApproved({
                firstName: ctx.from?.first_name || 'друг',
                totalUsers,
                isAdmin: UserService.isAdmin(user),
            })
            : HomeView.renderGuest({
                firstName: ctx.from?.first_name || 'друг',
                accessStatus: user?.accessStatus || 'new',
            });

        await safeEditMessage(ctx, view);
    }

    static async help(ctx) {
        const view = HelpView.render();
        await safeEditMessage(ctx, view);
    }

    static async profile(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        if (!UserService.isApproved(user)) {
            return BotController.showRestricted(ctx, user);
        }

        const view = ProfileView.render();
        await safeEditMessage(ctx, view);
    }

    static async dashboard(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        if (!UserService.isApproved(user)) {
            return BotController.showRestricted(ctx, user);
        }

        const userCount = await UserService.countUsers();

        const view = DashboardView.render({
            userCount,
        });

        await safeEditMessage(ctx, view);
    }

    static async settings(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        if (!UserService.isApproved(user)) {
            return BotController.showRestricted(ctx, user);
        }

        const view = SettingsView.render();
        await safeEditMessage(ctx, view);
    }

    static async customTag(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        if (!UserService.isApproved(user)) {
            return BotController.showRestricted(ctx, user);
        }

        const view = CustomTagView.render();
        await safeEditMessage(ctx, view);
    }

    static async accessStatus(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        const view = AccessStatusView.render({
            firstName: ctx.from?.first_name || 'друг',
            accessStatus: user?.accessStatus || 'new',
        });

        await safeEditMessage(ctx, view);
    }

    static async applyAccess(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        if (user?.accessStatus === 'approved') {
            const view = AccessStatusView.render({
                firstName: ctx.from?.first_name || 'друг',
                accessStatus: 'approved',
            });

            await safeEditMessage(ctx, view);
            return;
        }

        const updatedUser = await UserService.submitApplication(ctx.from.id);

        const view = AccessStatusView.render({
            firstName: ctx.from?.first_name || 'друг',
            accessStatus: updatedUser?.accessStatus || 'pending',
        });

        await safeEditMessage(ctx, view);
    }

    static async showRestricted(ctx, user) {
        const view = AccessStatusView.render({
            firstName: ctx.from?.first_name || 'друг',
            accessStatus: user?.accessStatus || 'new',
        });

        await safeEditMessage(ctx, view);
    }

    static async showAdminOnly(ctx) {
        const view = AdminOnlyView.render();

        if (ctx.callbackQuery) {
            await safeEditMessage(ctx, view);
            return;
        }

        await sendCard(ctx, view);
    }

    static async adminPanel(ctx) {
        const user = await BotController.getCurrentUser(ctx);

        if (!UserService.isAdmin(user)) {
            return BotController.showAdminOnly(ctx);
        }

        const adminMiniAppUrl = BotController.buildAdminMiniAppUrl();

        const text = [
            '<b>🛡 Admin Panel</b>',
            '',
            'Управление пользователями перенесено в Mini App.',
            'Используйте отдельный admin-контур внутри Mini App.',
            '',
            'Доступные действия:',
            '• просмотр списка пользователей',
            '• поиск и фильтрация',
            '• approve / reject / delete',
        ].join('\n');

        const extra = {
            parse_mode: 'HTML',
        };

        if (adminMiniAppUrl) {
            Object.assign(
                extra,
                Markup.inlineKeyboard([
                    [Markup.button.webApp('🚀 Открыть Admin Mini App', adminMiniAppUrl)],
                    [Markup.button.callback('🏠 Home', 'home')],
                ])
            );
        } else {
            Object.assign(
                extra,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🏠 Home', 'home')],
                ])
            );
        }

        if (ctx.callbackQuery) {
            await safeEditMessage(ctx, { text, extra });
            return;
        }

        await ctx.reply(text, extra);
    }

    static async seedUsers(ctx) {
        const adminUser = await BotController.getCurrentUser(ctx);

        if (!UserService.isAdmin(adminUser)) {
            return BotController.showAdminOnly(ctx);
        }

        const text = String(ctx.message?.text || '').trim();
        const parts = text.split(/\s+/);
        const count = Number(parts[1]) || 20;

        const result = await UserService.seedTestUsers(count);

        await ctx.reply(`✅ Тестовые пользователи созданы: ${result.insertedCount}`);
    }

    static async noopCallback(ctx) {
        await safeAnswerCbQuery(ctx);
    }

    static async homeCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.home(ctx);
    }

    static async profileCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.profile(ctx);
    }

    static async helpCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.help(ctx);
    }

    static async dashboardCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.dashboard(ctx);
    }

    static async settingsCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.settings(ctx);
    }

    static async customTagCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.customTag(ctx);
    }

    static async accessStatusCallback(ctx) {
        await safeAnswerCbQuery(ctx);
        await BotController.accessStatus(ctx);
    }

    static async applyAccessCallback(ctx) {
        await safeAnswerCbQuery(ctx, 'Заявка отправлена');
        await BotController.applyAccess(ctx);
    }

    static async checkSubscriptionCallback(ctx) {
        await safeAnswerCbQuery(ctx, 'Проверка подписки пока в разработке');
    }
}

module.exports = BotController;
