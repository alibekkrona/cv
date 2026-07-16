const {
    categoryUnresolvedContext,
    recoveredCategoryContext
} = require('./fixtures/contexts');
const {
    orchestrateResolution
} = require('./orchestration/ResolutionOrchestrator');

async function main() {
    const context = categoryUnresolvedContext();
    const profile = {
        allowedHosts: ['brand.example'],
        allowedMarkets: ['example-market'],
        preferredMarket: 'example-market',
        categoryRoutes: {
            Featured: '/catalog/featured'
        }
    };

    const result = await orchestrateResolution({
        context,
        profile,
        executeAttempt: async ({ action }) => {
            if (action !== 'open_verified_category_route') {
                throw new Error(`Unexpected action: ${action}`);
            }
            return recoveredCategoryContext();
        }
    });

    console.log(JSON.stringify({
        state: result.state,
        triggeringCondition: result.triggeringCondition.code,
        selectedCapability: result.advice.capabilityId,
        policy: result.policy.status,
        evidenceImprovement: result.execution.comparison,
        finalVerdict: result.finalAssessment.businessVerdict,
        learnedRoutes: result.updatedProfile.categoryRoutes
    }, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
