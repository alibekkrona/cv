const { resolveImageInput, withHtmlParseMode } = require('./ui');

async function safeAnswerCbQuery(ctx, text = null) {
    try {
        if (ctx.updateType === 'callback_query') {
            return await ctx.answerCbQuery(text || undefined);
        }
    } catch (error) {
        const description = error?.description || '';

        if (
            description.includes('query is too old') ||
            description.includes('query ID is invalid')
        ) {
            return;
        }

        throw error;
    }
}

async function safeEditMessage(ctx, view) {
    try {
        const image = resolveImageInput(view.image);

        if (ctx.updateType === 'callback_query') {
            const hasPhoto = Boolean(ctx.callbackQuery?.message?.photo?.length);

            if (hasPhoto && image) {
                return await ctx.editMessageMedia(
                    {
                        type: 'photo',
                        media: image,
                        caption: view.text,
                        parse_mode: 'HTML',
                    },
                    {
                        reply_markup: view.extra?.reply_markup,
                    }
                );
            }

            if (hasPhoto) {
                return await ctx.editMessageCaption(view.text, {
                    parse_mode: 'HTML',
                    reply_markup: view.extra?.reply_markup,
                });
            }

            return await ctx.editMessageText(view.text, withHtmlParseMode(view.extra));
        }

        if (image) {
            return await ctx.replyWithPhoto(image, {
                caption: view.text,
                parse_mode: 'HTML',
                reply_markup: view.extra?.reply_markup,
            });
        }

        return await ctx.reply(view.text, withHtmlParseMode(view.extra));
    } catch (error) {
        const description = error?.description || '';

        if (description.includes('message is not modified')) {
            return;
        }

        throw error;
    }
}

module.exports = {
    safeAnswerCbQuery,
    safeEditMessage,
};
