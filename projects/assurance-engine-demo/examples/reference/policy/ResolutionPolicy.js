const { findCapabilityByAction } = require('../registry/CapabilityRegistry');

function normalizeHost(value) {
    try {
        return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    } catch (_) {
        return String(value || '').toLowerCase().replace(/^www\./, '');
    }
}

function evaluatePolicy({ advice, condition, context, profile = {} }) {
    const capability = findCapabilityByAction(advice?.decision);
    const checks = [];

    checks.push({
        name: 'known_capability',
        passed: Boolean(capability)
    });
    checks.push({
        name: 'condition_applicable',
        passed: Boolean(capability?.conditions.includes(condition.code))
    });
    checks.push({
        name: 'capability_executable',
        passed: capability?.executable === true
    });
    checks.push({
        name: 'confidence_threshold',
        passed: Number(advice?.confidence || 0) >= 0.8
    });

    if (advice?.decision === 'retry_allowed_host') {
        const allowedHosts = (profile.allowedHosts || []).map(normalizeHost);
        checks.push({
            name: 'host_allowlist',
            passed: allowedHosts.includes(normalizeHost(advice?.parameters?.host))
        });
    }

    if (advice?.decision === 'retry_market_route') {
        checks.push({
            name: 'market_allowlist',
            passed: (profile.allowedMarkets || [])
                .includes(advice?.parameters?.market)
        });
    }

    if (advice?.decision === 'open_verified_category_route') {
        const category = advice?.parameters?.category;
        checks.push({
            name: 'verified_category_route',
            passed:
                Boolean(category) &&
                profile.categoryRoutes?.[category] === advice?.parameters?.route
        });
    }

    const blockedChecks = checks.filter(item => !item.passed);
    const approved = blockedChecks.length === 0;

    return {
        schemaVersion: '1.0',
        status: approved ? 'approved' : 'blocked',
        executionAllowed: approved,
        capability,
        checks,
        blockedChecks: blockedChecks.map(item => item.name),
        targetReference: context?.target?.reference || null
    };
}

module.exports = {
    evaluatePolicy,
    normalizeHost
};
