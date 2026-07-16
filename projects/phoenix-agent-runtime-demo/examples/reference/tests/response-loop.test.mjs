import test from 'node:test';
import assert from 'node:assert/strict';

import { ConversationStore } from '../runtime/ConversationStore.mjs';
import {
    assertToolOutputCompleteness,
    runResponseLoop
} from '../runtime/ResponseLoop.mjs';
import {
    buildReadyPackage,
    createReferenceRuntime
} from '../fixtures/createRuntime.mjs';

test('response loop returns one output for every function call', () => {
    assert.throws(
        () => assertToolOutputCompleteness(
            [{ callId: 'call-1' }, { callId: 'call-2' }],
            [{ call_id: 'call-1' }]
        ),
        /call-2/
    );
});

test('response loop dispatches tools and preserves response continuity', async () => {
    const context = await createReferenceRuntime();
    const taskPackage = buildReadyPackage(context.workspaceRoot);
    const result = await runResponseLoop({
        client: context.client,
        model: 'reference-model',
        instructions: 'Use tools.',
        input: 'Create an artifact.',
        toolSpecs: context.registry.specs(),
        dispatcher: context.dispatcher,
        taskPackage,
        conversationStore: new ConversationStore()
    });

    assert.equal(result.text, 'Created and verified artifacts/result.txt.');
    assert.equal(result.turns, 3);
    assert.equal(
        context.client.requests[1].previous_response_id,
        'response-1'
    );
    assert.equal(
        context.client.requests[2].previous_response_id,
        'response-2'
    );
    assert.deepEqual(context.eventLog.summary(), {
        tool_started: 2,
        tool_completed: 2
    });
});
