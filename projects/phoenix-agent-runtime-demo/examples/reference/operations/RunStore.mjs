import fs from 'node:fs/promises';
import path from 'node:path';

async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export class RunStore {
    constructor(root) {
        this.root = path.resolve(root);
    }

    runRoot(packageId, runId) {
        return path.join(this.root, packageId, 'runs', runId);
    }

    async begin(taskPackage) {
        const runId = `run-${Date.now()}`;
        const record = {
            schemaVersion: '1.0',
            packageId: taskPackage.packageId,
            projectId: taskPackage.projectId,
            runId,
            status: 'running',
            startedAt: new Date().toISOString(),
            completedAt: null,
            taskResults: []
        };

        await writeJson(
            path.join(this.runRoot(taskPackage.packageId, runId), 'run.json'),
            record
        );

        return record;
    }

    async complete(run, outcome, report) {
        const finalRecord = {
            ...run,
            status: outcome.status,
            completedAt: new Date().toISOString(),
            taskResults: outcome.taskResults
        };
        const root = this.runRoot(run.packageId, run.runId);

        await writeJson(path.join(root, 'run.json'), finalRecord);
        await fs.writeFile(path.join(root, 'report.md'), report, 'utf8');

        return {
            record: finalRecord,
            runJsonPath: path.join(root, 'run.json'),
            reportPath: path.join(root, 'report.md')
        };
    }
}
