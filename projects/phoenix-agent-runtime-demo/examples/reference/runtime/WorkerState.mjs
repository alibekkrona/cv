const ALLOWED_TRANSITIONS = Object.freeze({
    idle: new Set(['running']),
    running: new Set(['idle'])
});

export class WorkerState {
    #state = {
        status: 'idle',
        packageId: null,
        startedAt: null
    };

    snapshot() {
        return { ...this.#state };
    }

    acquire(packageId) {
        if (this.#state.status !== 'idle') {
            throw new Error(
                `Worker is already running package ${this.#state.packageId}`
            );
        }

        this.#transition('running', {
            packageId,
            startedAt: new Date().toISOString()
        });

        return this.snapshot();
    }

    release(packageId) {
        if (this.#state.status !== 'running') {
            throw new Error('Worker is not running');
        }

        if (this.#state.packageId !== packageId) {
            throw new Error(
                `Package ${packageId} cannot release worker owned by ${this.#state.packageId}`
            );
        }

        this.#transition('idle', {
            packageId: null,
            startedAt: null
        });

        return this.snapshot();
    }

    #transition(status, patch) {
        const allowed = ALLOWED_TRANSITIONS[this.#state.status];
        if (!allowed?.has(status)) {
            throw new Error(
                `Invalid worker transition: ${this.#state.status} -> ${status}`
            );
        }

        this.#state = {
            ...this.#state,
            ...patch,
            status
        };
    }
}
