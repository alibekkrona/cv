const { Telegraf } = require('telegraf');

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN is not defined');
}

const bot = new Telegraf(token);

module.exports = bot;