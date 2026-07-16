import { assertLaunchable, normalizeTaskPackage } from '../contracts/TaskPackage.mjs';
import { ToolEventLog } from '../tools/ToolEvents.mjs';
import { buildOutcome } from './OutcomeContract.mjs';
import { buildReport } from '../reporting/ReportBuilder.mjs';
import { runResponseLoop } from './ResponseLoop.mjs';

export class AgentRuntime {
    constructor({
        client,
        model,
        registry,
        dispatcher,
        conversationStore,
        workerState,
        runStore
    }) {
        this.client = client;
        this.model = model;
        this.registry = registry;
        this.dispatcher = dispatcher;
        this.conversationStore = conversationStore;
        this.workerState = workerState;
        this.runStore = runStore;
    }

    async execute(input) {
        const taskPackage = normalizeTaskPackage(input);
        assertLaunchable(taskPackage);
        this.workerState.acquire(taskPackage.packageId);
        const run = await this.runStore.begin(taskPackage);
        const taskResults = [];

        try {
            for (const task of taskPackage.tasks) {
                try {
                    const result = await runResponseLoop({
                        client: this.client,
                        model: this.model,
                        instructions: [
                            'Operate only through the supplied tools.',
                            'Respect package permissions and workspace scope.',
                            'Return a concise factual completion summary.'
                        ].join('\n'),
                        input: {
                            taskId: task.id,
                            prompt: task.prompt,
                            acceptanceCriteria: task.acceptanceCriteria
                        },
                        toolSpecs: this.registry.specs(),
                        dispatcher: this.dispatcher,
                        taskPackage,
                        conversationStore: this.conversationStore
                    });

                    taskResults.push({
                        taskId: task.id,
                        title: task.title,
                        status: 'completed',
                        summary: result.text,
                        responseId: result.responseId,
                        turns: result.turns
                    });
                } catch (error) {
                    taskResults.push({
                        taskId: task.id,
                        title: task.title,
                        status: 'failed',
                        summary: '',
                        error: error.message
                    });
                    break;
                }
            }

            const outcome = buildOutcome({
                taskPackage,
                run,
                taskResults,
                toolEventLog: this.dispatcher.eventLog
            });
            const report = buildReport(outcome);
            const persistence = await this.runStore.complete(run, outcome, report);

            return {
                outcome,
                report,
                persistence
            };
        } finally {
            this.workerState.release(taskPackage.packageId);
        }
    }
}

export function createToolEventLog() {
    return new ToolEventLog();
}
