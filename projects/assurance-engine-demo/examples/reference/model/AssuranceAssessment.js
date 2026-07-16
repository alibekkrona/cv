const BUSINESS_VERDICTS = Object.freeze({
    VERIFIED: 'placement_verified',
    NOT_OBSERVED: 'expected_placement_not_observed',
    UNVERIFIABLE: 'placement_unverifiable'
});

const MILESTONE_NAMES = Object.freeze([
    'source_reached',
    'lobby_verified',
    'category_verified',
    'collection_verified',
    'placement_assessed'
]);

function milestone(name, verified, evidence = []) {
    return {
        name,
        status: verified ? 'verified' : 'unverified',
        evidence: evidence.filter(Boolean)
    };
}

function deriveBusinessVerdict(context) {
    if (context?.outcome?.status === 'found') {
        return BUSINESS_VERDICTS.VERIFIED;
    }

    const verifiedNegative =
        context?.outcome?.status === 'not_found' &&
        context?.access?.navigation?.succeeded === true &&
        context?.access?.content?.ready === true &&
        context?.access?.content?.errorPage !== true &&
        (
            !context?.access?.category?.requested ||
            context?.access?.category?.found === true
        ) &&
        Number(context?.extraction?.candidateCount || 0) > 0;

    return verifiedNegative
        ? BUSINESS_VERDICTS.NOT_OBSERVED
        : BUSINESS_VERDICTS.UNVERIFIABLE;
}

function buildMilestones(context) {
    const sourceReached = context?.access?.navigation?.succeeded === true;
    const lobbyVerified =
        sourceReached &&
        context?.access?.content?.ready === true &&
        context?.access?.content?.errorPage !== true;
    const categoryRequested = Boolean(context?.access?.category?.requested);
    const categoryVerified =
        lobbyVerified &&
        (!categoryRequested || context?.access?.category?.found === true);
    const candidateCount = Number(context?.extraction?.candidateCount || 0);
    const collectionVerified =
        categoryVerified &&
        (candidateCount > 0 || context?.extraction?.targetFound === true);
    const placementAssessed =
        context?.outcome?.status === 'found' ||
        (
            context?.outcome?.status === 'not_found' &&
            collectionVerified
        );

    return [
        milestone('source_reached', sourceReached, [
            context?.access?.navigation?.successfulUrl,
            context?.access?.navigation?.finalUrl
        ]),
        milestone('lobby_verified', lobbyVerified, [
            context?.access?.content?.readinessSource
        ]),
        milestone('category_verified', categoryVerified, [
            context?.access?.category?.matchedText,
            context?.access?.category?.mode
        ]),
        milestone('collection_verified', collectionVerified, [
            candidateCount ? `candidate_count:${candidateCount}` : null
        ]),
        milestone('placement_assessed', placementAssessed, [
            context?.outcome?.status,
            context?.outcome?.reason
        ])
    ];
}

function buildAssessment(context) {
    const milestones = buildMilestones(context);
    const firstUnverified = milestones.find(item => item.status !== 'verified');

    return {
        schemaVersion: '1.0',
        businessVerdict: deriveBusinessVerdict(context),
        milestones,
        firstUnverifiedMilestone: firstUnverified?.name || null,
        complete: !firstUnverified
    };
}

module.exports = {
    BUSINESS_VERDICTS,
    MILESTONE_NAMES,
    buildAssessment,
    buildMilestones,
    deriveBusinessVerdict
};
