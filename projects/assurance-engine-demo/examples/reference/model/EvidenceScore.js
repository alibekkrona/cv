const MILESTONE_WEIGHT = Object.freeze({
    source_reached: 10,
    lobby_verified: 20,
    category_verified: 30,
    collection_verified: 40,
    placement_assessed: 50
});

function scoreAssessment(assessment) {
    return (assessment?.milestones || []).reduce((score, item) => {
        if (item.status !== 'verified') return score;
        return score + (MILESTONE_WEIGHT[item.name] || 0);
    }, 0);
}

function compareAssessments(before, after) {
    const beforeScore = scoreAssessment(before);
    const afterScore = scoreAssessment(after);
    const beforeVerified = new Set(
        (before?.milestones || [])
            .filter(item => item.status === 'verified')
            .map(item => item.name)
    );
    const newlyVerified = (after?.milestones || [])
        .filter(item => item.status === 'verified' && !beforeVerified.has(item.name))
        .map(item => item.name);

    return {
        beforeScore,
        afterScore,
        improved: afterScore > beforeScore,
        delta: afterScore - beforeScore,
        newlyVerified
    };
}

module.exports = {
    MILESTONE_WEIGHT,
    compareAssessments,
    scoreAssessment
};
