const BotController = require('../../Controller/Bot/BotController');

function registerBotRoutes(bot) {
    bot.start(BotController.start);

    bot.command('help', BotController.help);
    bot.command('dashboard', BotController.dashboard);
    bot.command('settings', BotController.settings);
    bot.command('profile', BotController.profile);
    bot.command('admin', BotController.adminPanel);
    bot.command('seed_users', BotController.seedUsers);

    bot.action('home', BotController.homeCallback);
    bot.action('profile', BotController.profileCallback);
    bot.action('help', BotController.helpCallback);
    bot.action('dashboard', BotController.dashboardCallback);
    bot.action('dashboard_refresh', BotController.dashboardCallback);
    bot.action('settings', BotController.settingsCallback);
    bot.action('custom_tag', BotController.customTagCallback);
    bot.action('access_status', BotController.accessStatusCallback);
    bot.action('apply_access', BotController.applyAccessCallback);

    bot.action('noop', BotController.noopCallback);
    bot.action('check_subscription', BotController.checkSubscriptionCallback);
}

module.exports = registerBotRoutes;
