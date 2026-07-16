import fs from 'node:fs/promises';
import path from 'node:path';

function resolveWorkspacePath(taskPackage, relativePath) {
    return path.resolve(taskPackage.workspaceRoot, relativePath);
}

export function registerWorkspaceTools(registry) {
    registry.register({
        name: 'read_text_file',
        description: 'Read a UTF-8 file inside the active workspace.',
        effect: 'read',
        pathArgument: 'path',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' }
            },
            required: ['path'],
            additionalProperties: false
        },
        handler: async ({ path: relativePath }, { taskPackage }) => {
            const absolutePath = resolveWorkspacePath(taskPackage, relativePath);
            return await fs.readFile(absolutePath, 'utf8');
        }
    });

    registry.register({
        name: 'write_text_file',
        description: 'Write a UTF-8 file inside the active workspace.',
        effect: 'write',
        pathArgument: 'path',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                content: { type: 'string' }
            },
            required: ['path', 'content'],
            additionalProperties: false
        },
        handler: async ({ path: relativePath, content }, { taskPackage }) => {
            const absolutePath = resolveWorkspacePath(taskPackage, relativePath);
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.writeFile(absolutePath, String(content), 'utf8');
            return {
                path: relativePath,
                bytes: Buffer.byteLength(String(content))
            };
        }
    });

    return registry;
}
