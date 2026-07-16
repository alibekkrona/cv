import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { ConversationStore } from '../runtime/ConversationStore.mjs';
import { AgentRuntime, createToolEventLog } from '../runtime/AgentRuntime.mjs';
import { WorkerState } from '../runtime/WorkerState.mjs';
import { RunStore } from '../operations/RunStore.mjs';
import { ToolDispatcher } from '../tools/ToolDispatcher.mjs';
import { ToolRegistry } from '../tools/ToolRegistry.mjs';
import { registerWorkspaceTools } from '../tools/WorkspaceTools.mjs';
import { FakeResponsesClient, writeThenReadScript } from './FakeResponsesClient.mjs';

export async function createReferenceRuntime(options = {}) {
    const root = options.root || await fs.mkdtemp(
        path.join(os.tmpdir(), 'phoenix-agent-reference-')
    );
    const workspaceRoot = path.join(root, 'workspace');
    const opsRoot = path.join(root, 'ops');
    await fs.mkdir(workspaceRoot, { recursive: true });

    const registry = registerWorkspaceTools(new ToolRegistry());
    const eventLog = createToolEventLog();
    const dispatcher = new ToolDispatcher({ registry, eventLog });
    const client = options.client || new FakeResponsesClient(writeThenReadScript());
    const runtime = new AgentRuntime({
        client,
        model: 'reference-model',
        registry,
        dispatcher,
        conversationStore: new ConversationStore(),
        workerState: new WorkerState(),
        runStore: new RunStore(opsRoot)
    });

    return {
        root,
        workspaceRoot,
        opsRoot,
        registry,
        eventLog,
        dispatcher,
        client,
        runtime
    };
}

export function buildReadyPackage(workspaceRoot, overrides = {}) {
    return {
        packageId: 'PKG-001',
        projectId: 'portfolio-project',
        status: 'ready',
        workspaceRoot,
        permissions: ['read_workspace', 'write_workspace'],
        tasks: [{
            id: 'TASK-001',
            title: 'Create verified artifact',
            prompt: 'Create the requested artifact and read it back for verification.',
            acceptanceCriteria: [
                'artifacts/result.txt exists',
                'the file content is verified through a read tool'
            ]
        }],
        ...overrides
    };
}
