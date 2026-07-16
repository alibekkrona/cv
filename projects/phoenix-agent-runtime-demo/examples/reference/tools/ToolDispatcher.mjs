import { evaluateToolPolicy } from './ToolPolicy.mjs';

function parseArguments(rawArguments) {
    if (!rawArguments) return {};
    if (typeof rawArguments === 'object') return rawArguments;

    try {
        return JSON.parse(rawArguments);
    } catch (error) {
        throw new Error(`Tool arguments are invalid JSON: ${error.message}`);
    }
}

export class ToolDispatcher {
    constructor({ registry, eventLog }) {
        this.registry = registry;
        this.eventLog = eventLog;
    }

    async dispatch(call, taskPackage) {
        const tool = this.registry.get(call.name);
        if (!tool) throw new Error(`Unknown tool: ${call.name}`);

        const normalizedCall = {
            callId: call.callId,
            name: call.name,
            args: parseArguments(call.arguments)
        };
        const policy = evaluateToolPolicy({
            tool,
            args: normalizedCall.args,
            taskPackage
        });

        this.eventLog.recordStarted(normalizedCall);

        if (!policy.approved) {
            this.eventLog.recordBlocked(normalizedCall, policy);
            throw new Error(
                `Tool ${call.name} blocked by policy: ${policy.blockedChecks.join(', ')}`
            );
        }

        try {
            const result = await tool.handler(normalizedCall.args, {
                taskPackage,
                policy
            });
            this.eventLog.recordCompleted(normalizedCall, result);
            return result;
        } catch (error) {
            this.eventLog.recordFailed(normalizedCall, error);
            throw error;
        }
    }
}

export {
    parseArguments
};
