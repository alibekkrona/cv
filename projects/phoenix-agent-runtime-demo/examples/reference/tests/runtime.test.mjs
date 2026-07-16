import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import { FakeResponsesClient } from '../fixtures/FakeResponsesClient.mjs';
import {
    buildReadyPackage,
    createReferenceRuntime
} from '../fixtures/createRuntime.mjs';

test('runtime persists run JSON, report, and verified artifact', async () => {
    const context = await createReferenceRuntime();
    const result = await context.runtime.execute(
        buildReadyPackage(context.workspaceRoot)
    );

    assert.equal(result.outcome.status, 'completed');
    assert.equal(result.outcome.taskResults[0].status, 'completed');
    assert.match(result.report, /Create verified artifact/);
    assert.equal(
        await fs.readFile(
            `${context.workspaceRoot}/artifacts/result.txt`,
            'utf8'
        ),
        'Verified agent artifact'
    );
    assert.ok((await fs.stat(result.persistence.runJsonPath)).isFile());
    assert.ok((await fs.stat(result.persistence.reportPath)).isFile());
});

test('write tool is blocked when package grants read access only', async () => {
    const client = new FakeResponsesClient([
        {
            id: 'response-blocked-1',
            output: [{
                type: 'function_call',
                call_id: 'call-write',
                name: 'write_text_file',
                arguments: JSON.stringify({
                    path: 'blocked.txt',
                    content: 'must not be written'
                })
            }]
        },
        {
            id: 'response-blocked-2',
            output_text: 'Write was blocked by policy.'
        }
    ]);
    const context = await createReferenceRuntime({ client });
    const result = await context.runtime.execute(
        buildReadyPackage(context.workspaceRoot, {
            permissions: ['read_workspace']
        })
    );

    assert.equal(result.outcome.status, 'completed');
    assert.equal(result.outcome.toolEventSummary.tool_blocked, 1);
    await assert.rejects(
        fs.stat(`${context.workspaceRoot}/blocked.txt`),
        error => error.code === 'ENOENT'
    );
});
