const PACKAGE_STATUSES = new Set([
    'draft',
    'ready',
    'running',
    'completed',
    'partial',
    'failed',
    'blocked'
]);

const PERMISSIONS = new Set([
    'read_workspace',
    'write_workspace',
    'execute_commands'
]);

function requiredString(value, field) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new TypeError(`${field} is required`);
    return normalized;
}

function normalizeTask(task, index) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
        throw new TypeError(`tasks[${index}] must be an object`);
    }

    return Object.freeze({
        id: requiredString(task.id, `tasks[${index}].id`),
        title: requiredString(task.title, `tasks[${index}].title`),
        prompt: requiredString(task.prompt, `tasks[${index}].prompt`),
        acceptanceCriteria: Array.isArray(task.acceptanceCriteria)
            ? task.acceptanceCriteria.map(String).map(value => value.trim()).filter(Boolean)
            : []
    });
}

function normalizeTaskPackage(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError('Task package must be an object');
    }

    const status = String(input.status || '').trim().toLowerCase();
    if (!PACKAGE_STATUSES.has(status)) {
        throw new TypeError(`Unknown task package status: ${status || 'missing'}`);
    }

    if (!Array.isArray(input.tasks) || input.tasks.length === 0) {
        throw new TypeError('Task package must contain at least one task');
    }

    const permissions = Array.isArray(input.permissions)
        ? [...new Set(input.permissions.map(String))]
        : [];

    for (const permission of permissions) {
        if (!PERMISSIONS.has(permission)) {
            throw new TypeError(`Unknown package permission: ${permission}`);
        }
    }

    return Object.freeze({
        schemaVersion: '1.0',
        packageId: requiredString(input.packageId, 'packageId'),
        projectId: requiredString(input.projectId, 'projectId'),
        status,
        workspaceRoot: requiredString(input.workspaceRoot, 'workspaceRoot'),
        permissions: Object.freeze(permissions),
        tasks: Object.freeze(input.tasks.map(normalizeTask))
    });
}

function assertLaunchable(taskPackage) {
    if (taskPackage.status !== 'ready') {
        throw new Error(
            `Task package ${taskPackage.packageId} is not launchable from status ${taskPackage.status}`
        );
    }
}

export {
    PACKAGE_STATUSES,
    PERMISSIONS,
    assertLaunchable,
    normalizeTaskPackage
};
