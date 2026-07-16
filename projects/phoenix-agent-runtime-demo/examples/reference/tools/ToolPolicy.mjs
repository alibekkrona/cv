import path from 'node:path';

const EFFECT_PERMISSION = Object.freeze({
    read: 'read_workspace',
    write: 'write_workspace',
    execute: 'execute_commands'
});

function isInsideRoot(root, target) {
    const relative = path.relative(path.resolve(root), path.resolve(target));
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function evaluateToolPolicy({
    tool,
    args,
    taskPackage
}) {
    const checks = [];
    const requiredPermission = EFFECT_PERMISSION[tool.effect];

    checks.push({
        name: 'known_effect',
        passed: Boolean(requiredPermission)
    });
    checks.push({
        name: 'package_permission',
        passed: taskPackage.permissions.includes(requiredPermission)
    });

    if (tool.pathArgument) {
        const requestedPath = args?.[tool.pathArgument];
        const absolutePath = path.resolve(taskPackage.workspaceRoot, requestedPath || '');
        checks.push({
            name: 'workspace_boundary',
            passed: Boolean(requestedPath) &&
                isInsideRoot(taskPackage.workspaceRoot, absolutePath)
        });
    }

    const blockedChecks = checks.filter(item => !item.passed);

    return {
        approved: blockedChecks.length === 0,
        effect: tool.effect,
        requiredPermission,
        checks,
        blockedChecks: blockedChecks.map(item => item.name)
    };
}

export {
    EFFECT_PERMISSION,
    isInsideRoot
};
