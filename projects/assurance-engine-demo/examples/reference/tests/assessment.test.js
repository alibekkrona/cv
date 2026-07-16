const test = require('node:test');
const assert = require('node:assert/strict');

const {
    BUSINESS_VERDICTS,
    buildAssessment
} = require('../model/AssuranceAssessment');
const {
    classifyCondition,
    listConditions
} = require('../registry/ConditionRegistry');
const {
    findCapabilities,
    listCapabilities
} = require('../registry/CapabilityRegistry');
const {
    baseContext,
    categoryUnresolvedContext,
    sourceUnavailableContext
} = require('../fixtures/contexts');

test('verified negative evidence produces a business-safe not-observed verdict', () => {
    const assessment = buildAssessment(baseContext());

    assert.equal(
        assessment.businessVerdict,
        BUSINESS_VERDICTS.NOT_OBSERVED
    );
    assert.equal(assessment.complete, true);
    assert.equal(
        classifyCondition(baseContext()).code,
        'extraction.target_not_present'
    );
});

test('unresolved category remains unverifiable and recoverable', () => {
    const context = categoryUnresolvedContext();
    const assessment = buildAssessment(context);
    const condition = classifyCondition(context);
    const capabilities = findCapabilities(condition.code);

    assert.equal(
        assessment.businessVerdict,
        BUSINESS_VERDICTS.UNVERIFIABLE
    );
    assert.equal(assessment.firstUnverifiedMilestone, 'category_verified');
    assert.equal(condition.code, 'navigation.category_unresolved');
    assert.ok(
        capabilities.some(item =>
            item.id === 'navigation.open_verified_category_route'
        )
    );
});

test('network failure is not misclassified as missing product', () => {
    const condition = classifyCondition(sourceUnavailableContext());

    assert.equal(condition.code, 'access.source_unavailable');
    assert.equal(condition.owner, 'system');
});

test('available capabilities have an action and improvement contract', () => {
    for (const capability of listCapabilities()
        .filter(item => item.status === 'available')) {
        assert.equal(capability.executable, true);
        assert.ok(capability.action);
        assert.ok(capability.improvementProof);
    }

    assert.ok(listConditions().some(item => item.code === 'unknown'));
});
