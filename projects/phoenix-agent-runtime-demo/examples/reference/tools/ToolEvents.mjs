export class ToolEventLog {
    #events = [];

    recordStarted(call) {
        this.#events.push({
            type: 'tool_started',
            callId: call.callId,
            tool: call.name,
            args: call.args,
            at: new Date().toISOString()
        });
    }

    recordCompleted(call, result) {
        this.#events.push({
            type: 'tool_completed',
            callId: call.callId,
            tool: call.name,
            result,
            at: new Date().toISOString()
        });
    }

    recordBlocked(call, policy) {
        this.#events.push({
            type: 'tool_blocked',
            callId: call.callId,
            tool: call.name,
            blockedChecks: [...policy.blockedChecks],
            at: new Date().toISOString()
        });
    }

    recordFailed(call, error) {
        this.#events.push({
            type: 'tool_failed',
            callId: call.callId,
            tool: call.name,
            error: error.message,
            at: new Date().toISOString()
        });
    }

    list() {
        return this.#events.map(event => ({ ...event }));
    }

    summary() {
        return this.#events.reduce((summary, event) => {
            summary[event.type] = (summary[event.type] || 0) + 1;
            return summary;
        }, {});
    }
}
