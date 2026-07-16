import fs from 'node:fs/promises';

import {
    buildReadyPackage,
    createReferenceRuntime
} from './fixtures/createRuntime.mjs';

const context = await createReferenceRuntime();
const result = await context.runtime.execute(
    buildReadyPackage(context.workspaceRoot)
);
const artifact = await fs.readFile(
    `${context.workspaceRoot}/artifacts/result.txt`,
    'utf8'
);

console.log(JSON.stringify({
    status: result.outcome.status,
    taskResults: result.outcome.taskResults,
    toolEventSummary: result.outcome.toolEventSummary,
    artifact,
    runJsonPath: result.persistence.runJsonPath,
    reportPath: result.persistence.reportPath
}, null, 2));
