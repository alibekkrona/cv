function packageStatus(taskResults) {
    const completed = taskResults.filter(item => item.status === 'completed');
    const failed = taskResults.filter(item => item.status === 'failed');

    if (!failed.length) return 'completed';
    if (completed.length) return 'partial';
    return 'failed';
}

export function buildOutcome({
    taskPackage,
    run,
    taskResults,
    toolEventLog
}) {
    const status = packageStatus(taskResults);

    return {
        schemaVersion: '1.0',
        packageId: taskPackage.packageId,
        projectId: taskPackage.projectId,
        runId: run.runId,
        status,
        taskResults: taskResults.map(result => ({
            taskId: result.taskId,
            title: result.title,
            status: result.status,
            summary: result.summary,
            responseId: result.responseId || null,
            turns: result.turns || 0,
            error: result.error || null
        })),
        toolEvents: toolEventLog.list(),
        toolEventSummary: toolEventLog.summary()
    };
}

export {
    packageStatus
};
