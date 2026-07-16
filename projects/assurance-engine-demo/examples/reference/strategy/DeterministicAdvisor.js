const { findCapabilities } = require('../registry/CapabilityRegistry');

function hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
}

function chooseExecutableCapability(condition, context, profile = {}) {
    const candidates = findCapabilities(condition.code)
        .filter(item => item.executable);

    for (const capability of candidates) {
        if (
            capability.action === 'retry_allowed_host' &&
            Array.isArray(profile.allowedHosts) &&
            profile.allowedHosts.length
        ) {
            return {
                capability,
                parameters: {
                    host: profile.allowedHosts[0],
                    targetUrl: context?.target?.url
                }
            };
        }

        if (
            capability.action === 'retry_market_route' &&
            Array.isArray(profile.allowedMarkets) &&
            profile.allowedMarkets.length
        ) {
            return {
                capability,
                parameters: {
                    market: profile.preferredMarket || profile.allowedMarkets[0]
                }
            };
        }

        if (capability.action === 'open_verified_category_route') {
            const requested = context?.access?.category?.requested;
            const route = profile.categoryRoutes?.[requested];

            if (hasValue(requested) && hasValue(route)) {
                return {
                    capability,
                    parameters: {
                        category: requested,
                        route
                    }
                };
            }
        }
    }

    return null;
}

function advise({ condition, context, profile = {} }) {
    const selection = chooseExecutableCapability(condition, context, profile);

    if (!selection) {
        return {
            schemaVersion: '1.0',
            decision: 'request_human_review',
            capabilityId: null,
            parameters: {},
            confidence: 1,
            reason: `No executable capability has sufficient governed input for ${condition.code}`
        };
    }

    return {
        schemaVersion: '1.0',
        decision: selection.capability.action,
        capabilityId: selection.capability.id,
        parameters: selection.parameters,
        confidence: 1,
        reason: `Deterministic profile evidence supports ${selection.capability.id}`
    };
}

module.exports = {
    advise,
    chooseExecutableCapability
};
