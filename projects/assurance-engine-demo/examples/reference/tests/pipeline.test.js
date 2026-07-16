const test = require('node:test');
const assert = require('node:assert/strict');

const {
    evaluateAssuranceGate
} = require('../pipeline/AssuranceGate');
const {
    DEFAULT_MAX_INPUT_CHARS,
    evaluateAiInputPolicy
} = require('../pipeline/AiInputPolicy');

test('expensive search requires verified source, lobby, and category', () => {
    const gate = evaluateAssuranceGate({
        requestedCategory: 'Featured',
        trace: {
            navigationSucceeded: true,
            contentReady: true,
            contentErrorPage: false,
            contentReadinessSource: 'semantic_catalog',
            categoryResolution: {
                found: true,
                matchedText: 'Featured',
                mode: 'navigation-control'
            }
        }
    });

    assert.equal(gate.expensiveSearchEligible, true);
    assert.equal(gate.firstUnverifiedMilestone, null);
});

test('service shell blocks search before AI fallback', () => {
    const gate = evaluateAssuranceGate({
        requestedCategory: 'Featured',
        trace: {
            navigationSucceeded: true,
            contentReady: false,
            contentErrorPage: false,
            categoryResolution: { found: false }
        }
    });

    assert.equal(gate.expensiveSearchEligible, false);
    assert.equal(gate.firstUnverifiedMilestone, 'lobby_verified');
});

test('AI input policy blocks empty and oversized inputs', () => {
    assert.equal(evaluateAiInputPolicy('').reason, 'ai_input_empty');
    assert.equal(
        evaluateAiInputPolicy('x'.repeat(DEFAULT_MAX_INPUT_CHARS + 1)).reason,
        'ai_input_too_large'
    );
});
