import test from 'node:test';
import assert from 'node:assert/strict';

import {
    assertLaunchable,
    normalizeTaskPackage
} from '../contracts/TaskPackage.mjs';
import { WorkerState } from '../runtime/WorkerState.mjs';
import { buildReadyPackage } from '../fixtures/createRuntime.mjs';

test('only ready task packages are launchable', () => {
    const ready = normalizeTaskPackage(buildReadyPackage('/tmp/workspace'));
    assert.doesNotThrow(() => assertLaunchable(ready));

    const completed = normalizeTaskPackage({
        ...buildReadyPackage('/tmp/workspace'),
        status: 'completed'
    });
    assert.throws(
        () => assertLaunchable(completed),
        /not launchable/
    );
});

test('unknown permissions are rejected', () => {
    assert.throws(
        () => normalizeTaskPackage({
            ...buildReadyPackage('/tmp/workspace'),
            permissions: ['read_workspace', 'become_root']
        }),
        /Unknown package permission/
    );
});

test('worker lock prevents concurrent package execution', () => {
    const worker = new WorkerState();
    worker.acquire('PKG-001');
    assert.throws(() => worker.acquire('PKG-002'), /already running/);
    assert.throws(() => worker.release('PKG-002'), /cannot release/);
    worker.release('PKG-001');
    assert.equal(worker.snapshot().status, 'idle');
});
