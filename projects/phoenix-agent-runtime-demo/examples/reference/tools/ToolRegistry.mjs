export class ToolRegistry {
    #tools = new Map();

    register(definition) {
        const name = String(definition?.name || '').trim();
        if (!name) throw new TypeError('Tool name is required');
        if (this.#tools.has(name)) throw new Error(`Duplicate tool: ${name}`);
        if (!['read', 'write', 'execute'].includes(definition.effect)) {
            throw new TypeError(`Unsupported tool effect: ${definition.effect}`);
        }
        if (typeof definition.handler !== 'function') {
            throw new TypeError(`Tool ${name} must have a handler`);
        }

        this.#tools.set(name, Object.freeze({
            name,
            description: String(definition.description || ''),
            effect: definition.effect,
            pathArgument: definition.pathArgument || null,
            inputSchema: definition.inputSchema || {
                type: 'object',
                additionalProperties: true
            },
            handler: definition.handler
        }));

        return this;
    }

    get(name) {
        return this.#tools.get(name) || null;
    }

    list() {
        return [...this.#tools.values()];
    }

    specs() {
        return this.list().map(tool => ({
            type: 'function',
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }));
    }
}
