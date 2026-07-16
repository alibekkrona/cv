const test = require('node:test');
const assert = require('node:assert/strict');

const {
    categoryUnresolvedContext,
    recoveredCategoryContext,
    sourceUnavailableContext
} = require('../fixtures/contexts');
const {
    orchestrateResolution
} = require('../orchestration/ResolutionOrchestrator');

const profile = {
    allowedHosts: ['brand.example'],
    allowedMarkets: ['example-market'],
    preferredMarket: 'example-market',
    categoryRoutes: {
        Featured: '/catalog/featured'
    }
};

test('verified category route recovers the failed milestone', async () => {
    const result = await orchestrateResolution({
        context: categoryUnresolvedContext(),
        profile,
        executeAttempt: async () => recoveredCategoryContext()
    });

    assert.equal(result.state, 'recovered');
    assert.equal(
        result.advice.capabilityId,
        'navigation.open_verified_category_route'
    );
    assert.equal(result.policy.status, 'approved');
    assert.equal(result.execution.evidenceVerified, true);
    assert.equal(result.execution.comparison.improved, true);
    assert.ok(
        result.execution.comparison.newlyVerified.includes('category_verified')
    );
    assert.equal(
        result.updatedProfile.categoryRoutes.Featured,
        '/catalog/featured'
    );
});

test('policy blocks an advisor action unsupported by the profile', async () => {
    const context = categoryUnresolvedContext();
    const ungovernedAdvisor = {
        advise: async () => ({
            decision: 'open_verified_category_route',
            capabilityId: 'navigation.open_verified_category_route',
            parameters: {
                category: 'Featured',
                route: 'https://unapproved.example/featured'
            },
            confidence: 1
        })
    };

    const result = await orchestrateResolution({
        context,
        profile,
        advisor: ungovernedAdvisor,
        executeAttempt: async () => {
            throw new Error('Blocked execution must not run');
        }
    });

    assert.equal(result.state, 'blocked_by_policy');
    assert.equal(result.execution.status, 'blocked');
    assert.ok(result.policy.blockedChecks.includes('verified_category_route'));
});

test('source failure without governed alternate host requires review', async () => {
    const result = await orchestrateResolution({
        context: sourceUnavailableContext(),
        profile: {
            allowedHosts: [],
            allowedMarkets: [],
            categoryRoutes: {}
        }
    });

    assert.equal(result.advice.decision, 'request_human_review');
    assert.equal(result.policy.status, 'blocked');
    assert.equal(result.feedbackEvent, null);
});
