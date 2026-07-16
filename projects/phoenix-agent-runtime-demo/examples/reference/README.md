# Phoenix Agent Runtime Reference

This directory contains a complete, runnable, public-safe agent runtime built
from the architectural concepts used in the private Phoenix Agent project.

It is not a collection of disconnected prompt examples. The modules form one
execution path:

```text
task package
-> launch validation
-> worker lock
-> run persistence
-> OpenAI-compatible response loop
-> tool policy and dispatch
-> tool event recording
-> structured outcome
-> Markdown report
-> worker release
```

The implementation does not include private prompts, project bindings, Phoenix
Protocol content, registry data, repository credentials, or production
operations artifacts.

## Run

Only the Node.js standard library is required.

```bash
npm run demo
npm test
```

The demo uses a scripted OpenAI-compatible client. The model requests a file
write, requests a read-back verification, and then returns a final completion
message. The runtime persists the resulting run contract and report.

## Module Map

### Input Contract

- [`contracts/TaskPackage.mjs`](contracts/TaskPackage.mjs) validates package
  status, project identity, workspace, permissions, tasks, prompts, and
  acceptance criteria.

Only `ready` packages may launch. Terminal or already-running packages are not
silently executed again.

### Runtime State

- [`runtime/WorkerState.mjs`](runtime/WorkerState.mjs) implements the independent
  `idle -> running -> idle` worker lock.
- [`runtime/ConversationStore.mjs`](runtime/ConversationStore.mjs) stores the
  last response ID per project for continuation.
- [`runtime/ResponseLoop.mjs`](runtime/ResponseLoop.mjs) implements the
  OpenAI-compatible function-call loop.
- [`runtime/AgentRuntime.mjs`](runtime/AgentRuntime.mjs) executes package tasks
  and coordinates persistence and finalization.
- [`runtime/OutcomeContract.mjs`](runtime/OutcomeContract.mjs) derives
  `completed`, `partial`, or `failed` package outcomes.

### Tools And Permissions

- [`tools/ToolRegistry.mjs`](tools/ToolRegistry.mjs) registers tools and emits
  model-facing function specifications.
- [`tools/ToolPolicy.mjs`](tools/ToolPolicy.mjs) maps effects to explicit package
  permissions and enforces workspace boundaries.
- [`tools/ToolDispatcher.mjs`](tools/ToolDispatcher.mjs) parses arguments,
  evaluates policy, executes handlers, and reports failures.
- [`tools/ToolEvents.mjs`](tools/ToolEvents.mjs) records started, completed,
  blocked, and failed tool calls.
- [`tools/WorkspaceTools.mjs`](tools/WorkspaceTools.mjs) provides guarded read
  and write examples.

### Operations And Reporting

- [`operations/RunStore.mjs`](operations/RunStore.mjs) writes `run.json` and
  `report.md` into an operations-style task/run hierarchy.
- [`reporting/ReportBuilder.mjs`](reporting/ReportBuilder.mjs) converts the
  structured outcome into a human-readable report.

### Test Client And Demonstration

- [`fixtures/FakeResponsesClient.mjs`](fixtures/FakeResponsesClient.mjs)
  provides a deterministic replacement for a network model call.
- [`fixtures/createRuntime.mjs`](fixtures/createRuntime.mjs) assembles a
  reference runtime and neutral task package.
- [`demo.mjs`](demo.mjs) runs the complete flow.

### Tests

- [`tests/contracts.test.mjs`](tests/contracts.test.mjs) covers package
  launchability, permission validation, and concurrency locking.
- [`tests/response-loop.test.mjs`](tests/response-loop.test.mjs) covers tool
  output completeness, dispatch, and response continuity.
- [`tests/runtime.test.mjs`](tests/runtime.test.mjs) covers artifact creation,
  run/report persistence, and policy-blocked writes.

## Response Loop Invariant

For every function call emitted by the model, the runtime must send exactly one
matching `function_call_output` before continuing:

```text
response
-> collect function calls
-> dispatch each call
-> convert success or error to output
-> verify every call ID is represented
-> continue with previous_response_id
```

Tool errors become model-visible structured outputs and operational events.
They are not silently discarded.

## Permission Model

The reference package may grant:

- `read_workspace`;
- `write_workspace`;
- `execute_commands`.

Tools declare an effect:

- `read`;
- `write`;
- `execute`.

Policy maps the effect to the required permission and separately checks that
path-based operations remain inside the active workspace.

## Persistence Shape

```text
ops/
└── PKG-001/
    └── runs/
        └── run-<timestamp>/
            ├── run.json
            └── report.md
```

This makes agent execution inspectable outside the model conversation.
