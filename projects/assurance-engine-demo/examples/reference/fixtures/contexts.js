function baseContext() {
    return {
        target: {
            reference: 'promotion-target-001',
            url: 'https://brand.example/catalog',
            product: 'Example Product',
            category: 'Featured'
        },
        access: {
            navigation: {
                succeeded: true,
                successfulUrl: 'https://brand.example/catalog',
                finalUrl: 'https://brand.example/catalog'
            },
            market: {
                expected: 'example-market',
                redirected: false,
                geoBlocked: false
            },
            authentication: {
                required: false,
                captchaRequired: false
            },
            content: {
                ready: true,
                errorPage: false,
                readinessSource: 'semantic_catalog'
            },
            category: {
                requested: 'Featured',
                found: true,
                matchedText: 'Featured',
                mode: 'navigation-control'
            }
        },
        extraction: {
            targetFound: false,
            candidateCount: 24,
            aiInputPolicy: {
                allowed: true,
                reason: 'ai_input_within_limit'
            }
        },
        outcome: {
            status: 'not_found',
            reason: 'target_not_present'
        },
        failure: null
    };
}

function categoryUnresolvedContext() {
    const context = baseContext();
    context.access.category.found = false;
    context.access.category.matchedText = null;
    context.extraction.candidateCount = 0;
    context.outcome = {
        status: 'unknown',
        reason: 'category_unresolved'
    };
    return context;
}

function recoveredCategoryContext() {
    return baseContext();
}

function sourceUnavailableContext() {
    const context = baseContext();
    context.access.navigation = {
        succeeded: false,
        successfulUrl: null,
        finalUrl: 'browser-error://unreachable'
    };
    context.access.content.ready = false;
    context.access.content.readinessSource = null;
    context.access.category.found = false;
    context.extraction.candidateCount = 0;
    context.outcome = {
        status: 'failed',
        reason: 'source_unavailable'
    };
    context.failure = {
        code: 'DNS_NOT_RESOLVED',
        category: 'network'
    };
    return context;
}

module.exports = {
    baseContext,
    categoryUnresolvedContext,
    recoveredCategoryContext,
    sourceUnavailableContext
};
