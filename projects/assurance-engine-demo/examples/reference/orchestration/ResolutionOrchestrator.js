const { buildAssessment } = require('../model/AssuranceAssessment');
const { classifyCondition } = require('../registry/ConditionRegistry');
const { findCapabilities } = require('../registry/CapabilityRegistry');
const DeterministicAdvisor = require('../strategy/DeterministicAdvisor');
const { evaluatePolicy } = require('../policy/ResolutionPolicy');
const {
    executeControlledResolution
} = require('../execution/ControlledExecutor');
const {
    applyFeedback,
    buildFeedbackEvent
} = require('../profile/ProfileFeedback');

function resolutionState({ assessment, condition, policy, execution }) {
    if (execution?.status === 'success') return 'recovered';
    if (assessment.businessVerdict === 'placement_verified') return 'verified';
    if (assessment.businessVerdict === 'expected_placement_not_observed') {
        return 'not_observed';
    }
    if (execution?.status === 'verified_failure') return 'recovery_failed';
    if (policy?.status === 'blocked') return 'blocked_by_policy';
    if (condition.disposition === 'automatically_recoverable') {
        return 'recovery_available';
    }
    return 'action_required';
}

async function orchestrateResolution({
    context,
    profile = {},
    advisor = DeterministicAdvisor,
    executeAttempt
}) {
    const initialAssessment = buildAssessment(context);
    const triggeringCondition = classifyCondition(context);
    const candidateCapabilities = findCapabilities(triggeringCondition.code);
    const advice = await advisor.advise({
        condition: triggeringCondition,
        context,
        profile
    });
    const policy = evaluatePolicy({
        advice,
        condition: triggeringCondition,
        context,
        profile
    });
    const execution = await executeControlledResolution({
        advice,
        policy,
        initialContext: context,
        executeAttempt
    });
    const effectiveContext =
        execution.status === 'success' && execution.retryContext
            ? execution.retryContext
            : context;
    const finalAssessment = buildAssessment(effectiveContext);
    const finalCondition = classifyCondition(effectiveContext);
    const feedbackEvent = buildFeedbackEvent({
        advice,
        policy,
        execution,
        target: context.target
    });
    const updatedProfile = applyFeedback(profile, feedbackEvent);

    return {
        schemaVersion: '1.0',
        state: resolutionState({
            assessment: finalAssessment,
            condition: triggeringCondition,
            policy,
            execution
        }),
        initialAssessment,
        finalAssessment,
        triggeringCondition,
        finalCondition,
        candidateCapabilities,
        advice,
        policy,
        execution,
        feedbackEvent,
        updatedProfile
    };
}

module.exports = {
    orchestrateResolution,
    resolutionState
};
