const { buildAssessment } = require('../model/AssuranceAssessment');
const { compareAssessments } = require('../model/EvidenceScore');

const EXECUTABLE_ACTIONS = new Set([
    'retry_allowed_host',
    'retry_market_route',
    'open_verified_category_route'
]);

async function executeControlledResolution({
    advice,
    policy,
    initialContext,
    executeAttempt
}) {
    if (policy?.executionAllowed !== true) {
        return {
            status: 'blocked',
            attempts: 0,
            evidenceVerified: false,
            reason: 'policy_did_not_approve_execution'
        };
    }

    if (!EXECUTABLE_ACTIONS.has(advice?.decision)) {
        return {
            status: 'not_supported',
            attempts: 0,
            evidenceVerified: false,
            reason: 'executor_not_attached'
        };
    }

    if (typeof executeAttempt !== 'function') {
        throw new TypeError('executeAttempt must be provided');
    }

    const before = buildAssessment(initialContext);
    const retryContext = await executeAttempt({
        action: advice.decision,
        parameters: advice.parameters,
        initialContext
    });
    const after = buildAssessment(retryContext);
    const comparison = compareAssessments(before, after);

    return {
        status: comparison.improved ? 'success' : 'verified_failure',
        attempts: 1,
        evidenceVerified: true,
        action: advice.decision,
        comparison,
        before,
        after,
        retryContext
    };
}

module.exports = {
    EXECUTABLE_ACTIONS,
    executeControlledResolution
};
