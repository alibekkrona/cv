const UserService = require('../../../Application/UserService');
const { getValidatedMiniAppSession } = require('../../../Util/telegramMiniApp');

async function requireMiniAppAdmin(req, res, next) {
    try {
        const validation = getValidatedMiniAppSession(req);

        if (!validation.ok) {
            return res.status(401).render('MiniApp/admin/pages/AdminUsers', {
                title: 'Bawsaq Mini App Admin',
                assetVersion: process.env.MINI_APP_ASSET_VERSION || '1',
                bootstrapError: 'Telegram session is required to open admin page.',
            });
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

        if (!UserService.isAdmin(user)) {
            return res.status(403).render('MiniApp/admin/pages/AdminUsers', {
                title: 'Bawsaq Mini App Admin',
                assetVersion: process.env.MINI_APP_ASSET_VERSION || '1',
                bootstrapError: 'Admin access required.',
            });
        }

        req.miniAppSession = validation.data;
        req.miniAppUser = user;
        return next();
    } catch (error) {
        console.error('RequireMiniAppAdmin error:', error);

        return res.status(500).render('MiniApp/admin/pages/AdminUsers', {
            title: 'Bawsaq Mini App Admin',
            assetVersion: process.env.MINI_APP_ASSET_VERSION || '1',
            bootstrapError: 'Failed to validate admin session.',
        });
    }
}

module.exports = requireMiniAppAdmin;
