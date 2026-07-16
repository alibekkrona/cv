# Architecture

## Main Packages

| Package | Responsibility |
| --- | --- |
| `agent/` | Classification, planning, prompt composition and package execution |
| `runtime/` | Intake, orchestration, OpenAI sessions, outcomes and reports |
| `tools/` | Filesystem, Git, execution, registry and notification tools |
| `ops/` | Task/run/report lifecycle and persistence |
| `extensions/` | Protocol and capability activation |
| `phoenix/` | Registry and runtime context integration |

## Orchestration Boundary

The cron orchestration layer remains deliberately thin. It checks local worker
availability, updates the operations repository, validates the launch signal,
and invokes the runtime. It does not execute tasks itself.

## Runtime Boundary

After launch, the runtime owns project binding, task execution, tool
dispatching, progress recording, final outcome construction and notification.

## Failure Semantics

Tool failures are recorded explicitly. Package outcomes distinguish success,
failure and partial completion instead of collapsing every run into a text
response.

## Public Reference Runtime

The runnable implementation under
[`examples/reference`](../examples/reference/) maps the architecture to:

```text
contracts/
  TaskPackage

runtime/
  WorkerState
  ConversationStore
  ResponseLoop
  AgentRuntime
  OutcomeContract

tools/
  ToolRegistry
  ToolPolicy
  ToolDispatcher
  ToolEvents
  WorkspaceTools

operations/ + reporting/
  RunStore
  ReportBuilder
```

The reference runtime uses a deterministic fake Responses client so its tool
loop, persistence, and permission behavior can be tested without a network
request or private prompt.
