require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const engine = require('ejs-mate');

const connectDB = require('./Infrastructure/Database/Connection');

const bot = require('./Infrastructure/Telegram/Bot');
const registerTelegramRoutes = require('./Interface/Route/Bot/BotRoutes');

const miniAppRoutes = require('./Interface/Route/Http/MiniAppRoutes');
const miniAppApiRoutes = require('./Interface/Route/Http/MiniAppApiRoutes');
const miniAppAdminApiRoutes = require('./Interface/Route/Http/MiniAppAdminApiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

async function bootstrap() {
    await connectDB();

    app.engine('ejs', engine);
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'Interface/View'));

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use(
        session({
            secret: process.env.SESSION_SECRET || 'dev-secret',
            resave: false,
            saveUninitialized: false,
        })
    );

    app.use(flash());

    app.use('/', miniAppRoutes);
    app.use('/', miniAppApiRoutes);
    app.use('/', miniAppAdminApiRoutes);

    app.use(
        express.static(path.join(__dirname, '../public'), {
            setHeaders: (res, filePath) => {
                if (filePath.includes(`${path.sep}mini-app${path.sep}`)) {
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                }
            },
        })
    );

    registerTelegramRoutes(bot);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    try {
        await bot.launch();
        console.log('Telegram bot started');
    } catch (error) {
        console.error('Telegram bot launch error:', error);
    }
}

bootstrap().catch((error) => {
    console.error('Bootstrap error:', error);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));