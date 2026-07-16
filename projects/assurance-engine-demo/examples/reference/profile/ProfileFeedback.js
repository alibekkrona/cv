function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function buildFeedbackEvent({ advice, policy, execution, target }) {
    if (
        policy?.executionAllowed !== true ||
        execution?.evidenceVerified !== true ||
        execution?.comparison?.improved !== true
    ) {
        return null;
    }

    return {
        schemaVersion: '1.0',
        targetReference: target?.reference || null,
        capabilityId: advice.capabilityId,
        action: advice.decision,
        parameters: { ...advice.parameters },
        evidence: {
            delta: execution.comparison.delta,
            newlyVerified: [...execution.comparison.newlyVerified]
        },
        recordedAt: new Date().toISOString()
    };
}

function applyFeedback(profile = {}, event) {
    if (!event) return { ...profile };

    const next = {
        ...profile,
        allowedHosts: [...(profile.allowedHosts || [])],
        allowedMarkets: [...(profile.allowedMarkets || [])],
        categoryRoutes: { ...(profile.categoryRoutes || {}) },
        successfulCapabilities: [...(profile.successfulCapabilities || [])]
    };

    if (event.action === 'retry_allowed_host') {
        next.allowedHosts = unique([
            ...next.allowedHosts,
            event.parameters.host
        ]);
    }

    if (event.action === 'retry_market_route') {
        next.allowedMarkets = unique([
            ...next.allowedMarkets,
            event.parameters.market
        ]);
        next.preferredMarket = event.parameters.market;
    }

    if (event.action === 'open_verified_category_route') {
        next.categoryRoutes[event.parameters.category] =
            event.parameters.route;
    }

    next.successfulCapabilities = unique([
        ...next.successfulCapabilities,
        event.capabilityId
    ]);
    next.lastVerifiedAt = event.recordedAt;

    return next;
}

module.exports = {
    applyFeedback,
    buildFeedbackEvent,
    unique
};
