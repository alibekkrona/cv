const DISPOSITIONS = Object.freeze({
    NONE: 'none',
    AUTOMATIC: 'automatically_recoverable',
    OPERATIONS: 'operations_action_required',
    DEVELOPMENT: 'development_required',
    REVIEW: 'human_review_required'
});

const DEFINITIONS = Object.freeze([
    {
        code: 'pipeline.ai_input_too_large',
        family: 'pipeline',
        failedMilestone: 'placement_assessed',
        disposition: DISPOSITIONS.DEVELOPMENT,
        owner: 'development',
        matches: context =>
            context?.extraction?.aiInputPolicy?.reason === 'ai_input_too_large'
    },
    {
        code: 'pipeline.internal_error',
        family: 'pipeline',
        failedMilestone: 'source_reached',
        disposition: DISPOSITIONS.DEVELOPMENT,
        owner: 'development',
        matches: context =>
            Boolean(context?.failure) &&
            context.failure.category === 'internal'
    },
    {
        code: 'access.captcha_required',
        family: 'access',
        failedMilestone: 'lobby_verified',
        disposition: DISPOSITIONS.OPERATIONS,
        owner: 'operations',
        matches: context => context?.access?.authentication?.captchaRequired === true
    },
    {
        code: 'access.authentication_required',
        family: 'access',
        failedMilestone: 'lobby_verified',
        disposition: DISPOSITIONS.OPERATIONS,
        owner: 'operations',
        matches: context => context?.access?.authentication?.required === true
    },
    {
        code: 'access.market_mismatch',
        family: 'access',
        failedMilestone: 'lobby_verified',
        disposition: DISPOSITIONS.AUTOMATIC,
        owner: 'system',
        matches: context =>
            context?.access?.market?.geoBlocked === true ||
            context?.access?.market?.redirected === true
    },
    {
        code: 'access.route_configuration_missing',
        family: 'access',
        failedMilestone: 'source_reached',
        disposition: DISPOSITIONS.OPERATIONS,
        owner: 'operations',
        matches: context =>
            context?.failure?.code === 'ACCESS_ROUTE_CONFIGURATION_MISSING'
    },
    {
        code: 'access.source_unavailable',
        family: 'access',
        failedMilestone: 'source_reached',
        disposition: DISPOSITIONS.AUTOMATIC,
        owner: 'system',
        matches: context =>
            context?.access?.navigation?.succeeded !== true &&
            Boolean(context?.failure)
    },
    {
        code: 'content.error_page',
        family: 'content',
        failedMilestone: 'lobby_verified',
        disposition: DISPOSITIONS.AUTOMATIC,
        owner: 'system',
        matches: context => context?.access?.content?.errorPage === true
    },
    {
        code: 'content.lobby_unverified',
        family: 'content',
        failedMilestone: 'lobby_verified',
        disposition: DISPOSITIONS.AUTOMATIC,
        owner: 'system',
        matches: context =>
            context?.access?.navigation?.succeeded === true &&
            context?.access?.content?.ready !== true
    },
    {
        code: 'navigation.category_unresolved',
        family: 'navigation',
        failedMilestone: 'category_verified',
        disposition: DISPOSITIONS.AUTOMATIC,
        owner: 'system',
        matches: context =>
            Boolean(context?.access?.category?.requested) &&
            context?.access?.category?.found !== true
    },
    {
        code: 'extraction.target_not_present',
        family: 'extraction',
        failedMilestone: null,
        disposition: DISPOSITIONS.NONE,
        owner: 'none',
        matches: context => context?.outcome?.status === 'not_found'
    },
    {
        code: 'placement.verified',
        family: 'placement',
        failedMilestone: null,
        disposition: DISPOSITIONS.NONE,
        owner: 'none',
        matches: context => context?.outcome?.status === 'found'
    },
    {
        code: 'unknown',
        family: 'unknown',
        failedMilestone: null,
        disposition: DISPOSITIONS.REVIEW,
        owner: 'reviewer',
        matches: () => true
    }
]);

function project(definition) {
    return {
        code: definition.code,
        family: definition.family,
        failedMilestone: definition.failedMilestone,
        disposition: definition.disposition,
        owner: definition.owner
    };
}

function classifyCondition(context) {
    return project(DEFINITIONS.find(item => item.matches(context)));
}

function listConditions() {
    return DEFINITIONS.map(project);
}

module.exports = {
    DISPOSITIONS,
    classifyCondition,
    listConditions
};
