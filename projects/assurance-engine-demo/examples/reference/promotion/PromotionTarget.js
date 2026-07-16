function requiredString(value, field) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new TypeError(`${field} is required`);
    return normalized;
}

function normalizeExpectedPosition(value) {
    if (value === null || value === undefined || value === '') return null;
    const position = Number(value);

    if (!Number.isInteger(position) || position < 1) {
        throw new TypeError('expectedPosition must be a positive integer');
    }

    return position;
}

function createPromotionTarget(input) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        throw new TypeError('Promotion dates must be valid');
    }

    if (endsAt < startsAt) {
        throw new RangeError('Promotion end date cannot precede start date');
    }

    return Object.freeze({
        reference: requiredString(input.reference, 'reference'),
        operator: requiredString(input.operator, 'operator'),
        brand: requiredString(input.brand, 'brand'),
        market: requiredString(input.market, 'market'),
        product: requiredString(input.product, 'product'),
        category: requiredString(input.category, 'category'),
        expectedPosition: normalizeExpectedPosition(input.expectedPosition),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        owner: requiredString(input.owner, 'owner')
    });
}

function buildScanRequest(target, profile) {
    return {
        target: {
            reference: target.reference,
            product: target.product,
            category: target.category,
            expectedPosition: target.expectedPosition
        },
        access: {
            market: target.market,
            allowedHosts: [...(profile.allowedHosts || [])],
            preferredMarket: profile.preferredMarket || target.market,
            categoryRoute: profile.categoryRoutes?.[target.category] || null
        }
    };
}

module.exports = {
    buildScanRequest,
    createPromotionTarget,
    normalizeExpectedPosition
};
