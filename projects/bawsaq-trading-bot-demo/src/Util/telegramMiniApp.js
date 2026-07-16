const crypto = require('crypto');

const DEFAULT_INIT_DATA_TTL = 60 * 60;
const HEX_256_PATTERN = /^[a-f0-9]{64}$/i;

function getBotToken() {
    return process.env.BOT_TOKEN || '';
}

function getInitDataTtl() {
    const ttl = Number(process.env.TELEGRAM_INIT_DATA_TTL || DEFAULT_INIT_DATA_TTL);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_INIT_DATA_TTL;
}

function extractInitData(req) {
    const headerValue = req.get('x-telegram-init-data');
    const authHeader = req.get('authorization');
    const bodyValue = req.body?.initData;
    const queryValue = req.query?.initData;

    if (headerValue) {
        return String(headerValue);
    }

    if (authHeader && /^tma\s+/i.test(authHeader)) {
        return authHeader.replace(/^tma\s+/i, '').trim();
    }

    if (bodyValue) {
        return String(bodyValue);
    }

    if (queryValue) {
        return String(queryValue);
    }

    return '';
}

function buildDataCheckString(params) {
    return Array.from(params.entries())
        .filter(([key]) => key !== 'hash')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
}

function createSecretKey(botToken) {
    return crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
}

function createDataHash(dataCheckString, secretKey) {
    return crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
}

function isValidSha256Hex(value) {
    return HEX_256_PATTERN.test(String(value || ''));
}

function safeEqualHex(a, b) {
    if (!isValidSha256Hex(a) || !isValidSha256Hex(b)) {
        return false;
    }

    const left = Buffer.from(String(a), 'hex');
    const right = Buffer.from(String(b), 'hex');

    return crypto.timingSafeEqual(left, right);
}

function parseUserFromInitData(params) {
    const rawUser = params.get('user');

    if (!rawUser) {
        return null;
    }

    try {
        return JSON.parse(rawUser);
    } catch (error) {
        return null;
    }
}

function validateTelegramInitData(initDataRaw) {
    const botToken = getBotToken();

    if (!botToken) {
        return {
            ok: false,
            code: 'BOT_TOKEN_MISSING',
            error: 'BOT_TOKEN is not configured',
        };
    }

    if (!initDataRaw) {
        return {
            ok: false,
            code: 'INIT_DATA_MISSING',
            error: 'Telegram initData is required',
        };
    }

    const params = new URLSearchParams(initDataRaw);
    const receivedHash = params.get('hash');

    if (!receivedHash) {
        return {
            ok: false,
            code: 'HASH_MISSING',
            error: 'Telegram initData hash is missing',
        };
    }

    const authDate = Number(params.get('auth_date'));

    if (!Number.isFinite(authDate) || authDate <= 0) {
        return {
            ok: false,
            code: 'AUTH_DATE_INVALID',
            error: 'Telegram initData auth_date is invalid',
        };
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ageInSeconds = nowInSeconds - authDate;

    if (ageInSeconds > getInitDataTtl()) {
        return {
            ok: false,
            code: 'INIT_DATA_EXPIRED',
            error: 'Telegram initData is expired',
        };
    }

    const dataCheckString = buildDataCheckString(params);
    const secretKey = createSecretKey(botToken);
    const computedHash = createDataHash(dataCheckString, secretKey);

    if (!safeEqualHex(receivedHash, computedHash)) {
        return {
            ok: false,
            code: 'HASH_INVALID',
            error: 'Telegram initData hash is invalid',
        };
    }

    const user = parseUserFromInitData(params);

    if (!user || !user.id) {
        return {
            ok: false,
            code: 'USER_MISSING',
            error: 'Telegram user is missing in initData',
        };
    }

    return {
        ok: true,
        data: {
            initDataRaw,
            authDate,
            queryId: params.get('query_id') || null,
            startParam: params.get('start_param') || null,
            user,
        },
    };
}

function getValidatedMiniAppSession(req) {
    const initDataRaw = extractInitData(req);
    return validateTelegramInitData(initDataRaw);
}

module.exports = {
    extractInitData,
    validateTelegramInitData,
    getValidatedMiniAppSession,
};