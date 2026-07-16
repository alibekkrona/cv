function gateMilestone(name, verified, evidence = []) {
    return {
        name,
        status: verified ? 'verified' : 'unverified',
        evidence: evidence.filter(Boolean)
    };
}

function evaluateAssuranceGate({ trace, requestedCategory }) {
    const sourceReached = trace?.navigationSucceeded === true;
    const lobbyVerified =
        sourceReached &&
        trace?.contentReady === true &&
        trace?.contentErrorPage !== true;
    const categoryRequired = Boolean(String(requestedCategory || '').trim());
    const categoryVerified =
        lobbyVerified &&
        (!categoryRequired || trace?.categoryResolution?.found === true);
    const milestones = [
        gateMilestone('source_reached', sourceReached, [
            trace?.successfulUrl,
            trace?.finalUrl
        ]),
        gateMilestone('lobby_verified', lobbyVerified, [
            trace?.contentReadinessSource
        ]),
        gateMilestone('category_verified', categoryVerified, [
            trace?.categoryResolution?.matchedText,
            trace?.categoryResolution?.mode
        ])
    ];
    const firstUnverified = milestones.find(item => item.status === 'unverified');

    return {
        schemaVersion: '1.0',
        milestones,
        firstUnverifiedMilestone: firstUnverified?.name || null,
        expensiveSearchEligible: !firstUnverified,
        reason: firstUnverified
            ? `${firstUnverified.name}_not_verified`
            : 'search_prerequisites_verified'
    };
}

module.exports = {
    evaluateAssuranceGate
};
