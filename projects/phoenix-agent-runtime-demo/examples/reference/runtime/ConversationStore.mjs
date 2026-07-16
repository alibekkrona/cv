export class ConversationStore {
    #conversations = new Map();

    get(projectId) {
        const value = this.#conversations.get(projectId);
        return value ? { ...value } : null;
    }

    remember(projectId, response) {
        const existing = this.#conversations.get(projectId);
        const next = {
            projectId,
            conversationId: existing?.conversationId || `conversation:${projectId}`,
            previousResponseId: response.id,
            turns: (existing?.turns || 0) + 1,
            updatedAt: new Date().toISOString()
        };

        this.#conversations.set(projectId, next);
        return { ...next };
    }

    reset(projectId) {
        return this.#conversations.delete(projectId);
    }
}
