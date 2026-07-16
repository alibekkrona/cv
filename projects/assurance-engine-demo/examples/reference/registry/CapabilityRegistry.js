const DEFINITIONS = Object.freeze([
    {
        id: 'access.retry_allowed_host',
        action: 'retry_allowed_host',
        conditions: ['access.source_unavailable', 'content.error_page'],
        status: 'available',
        owner: 'system',
        requiredInput: ['targetUrl', 'profile.allowedHosts'],
        improvementProof: 'source or lobby milestone must improve'
    },
    {
        id: 'access.retry_market_route',
        action: 'retry_market_route',
        conditions: [
            'access.market_mismatch',
            'access.source_unavailable',
            'content.lobby_unverified'
        ],
        status: 'available',
        owner: 'system',
        requiredInput: ['profile.allowedMarkets'],
        improvementProof: 'lobby evidence must be verified in the expected market'
    },
    {
        id: 'navigation.open_verified_category_route',
        action: 'open_verified_category_route',
        conditions: ['navigation.category_unresolved'],
        status: 'available',
        owner: 'system',
        requiredInput: ['requestedCategory', 'profile.categoryRoutes'],
        improvementProof: 'the exact requested category must become verified'
    },
    {
        id: 'access.authenticate_with_profile',
        action: 'authenticate_with_profile',
        conditions: ['access.authentication_required'],
        status: 'planned',
        owner: 'development',
        requiredInput: ['profile.secretReference'],
        improvementProof: 'authentication boundary must disappear'
    },
    {
        id: 'access.request_verified_session',
        action: null,
        conditions: ['access.captcha_required'],
        status: 'manual',
        owner: 'operations',
        requiredInput: [],
        improvementProof: 'approved session must verify lobby content'
    },
    {
        id: 'access.install_route_configuration',
        action: null,
        conditions: ['access.route_configuration_missing'],
        status: 'manual',
        owner: 'operations',
        requiredInput: [],
        improvementProof: 'expected market route must become available'
    },
    {
        id: 'pipeline.reduce_ai_input',
        action: null,
        conditions: ['pipeline.ai_input_too_large'],
        status: 'planned',
        owner: 'development',
        requiredInput: [],
        improvementProof: 'category-scoped evidence must pass the input policy'
    },
    {
        id: 'pipeline.inspect_internal_error',
        action: null,
        conditions: ['pipeline.internal_error'],
        status: 'manual',
        owner: 'development',
        requiredInput: [],
        improvementProof: 'the failed pipeline stage must complete'
    },
    {
        id: 'review.request_human_decision',
        action: null,
        conditions: ['unknown'],
        status: 'manual',
        owner: 'reviewer',
        requiredInput: [],
        improvementProof: 'reviewer must attach a reason and evidence reference'
    }
]);

function project(definition) {
    return {
        ...definition,
        conditions: [...definition.conditions],
        requiredInput: [...definition.requiredInput],
        executable:
            definition.status === 'available' &&
            Boolean(definition.action) &&
            Boolean(definition.improvementProof)
    };
}

function listCapabilities() {
    return DEFINITIONS.map(project);
}

function findCapabilities(conditionCode) {
    return DEFINITIONS
        .filter(item => item.conditions.includes(conditionCode))
        .map(project);
}

function findCapabilityByAction(action) {
    const definition = DEFINITIONS.find(item => item.action === action);
    return definition ? project(definition) : null;
}

module.exports = {
    findCapabilities,
    findCapabilityByAction,
    listCapabilities
};
