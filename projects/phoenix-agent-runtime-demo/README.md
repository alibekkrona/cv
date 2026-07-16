# Phoenix Agent

Phoenix Agent is an independently designed Node.js execution runtime that
connects OpenAI tool calling, repository operations, Phoenix Protocol, and a
separate Phoenix Ops state layer.

It is not a web dashboard. Its primary interfaces are a CLI, files and Git
repositories used as operational control surfaces, OpenAI Responses API calls,
tool dispatch, task packages, and generated run/report artifacts.

## Real Project Scale

At the time of this snapshot, the private source repository contains:

- 364 commits;
- approximately 500 KB of runtime source;
- 68 JavaScript modules;
- agent, runtime, tool, operations, extension, Git, registry and project-binding
  packages;
- architecture documentation covering multiple refactoring phases.

## Technology

- Node.js and ECMAScript modules;
- OpenAI Responses API and function calling;
- filesystem and Git tooling;
- Phoenix Protocol integration;
- Phoenix Ops task/run/report persistence;
- cron-driven orchestration;
- Telegram completion notifications.

The [package.json](package.json) and [.env.example](.env.example) preserve the
representative runtime family and configuration surface while exposing only
commands that work inside this public snapshot.

## Architecture

```text
cron / direct CLI
  -> orchestration cycle
  -> local worker-state guard
  -> Phoenix Ops pull
  -> package launch-contract validation
  -> project binding
  -> Phoenix Protocol bootstrap
  -> OpenAI response/tool loop
  -> guarded filesystem, Git and execution tools
  -> task/run/report persistence
  -> package finalization
  -> notification
```

See [Architecture](docs/architecture.md).

## Execution Contract

Only a package whose contract is `ready` may launch.

```text
success: ready -> running -> completed
failure: ready -> running -> failed
```

The local worker state independently prevents concurrent execution:

```text
idle -> running -> idle
```

Terminal package contracts are not relaunched on later cron cycles.

## OpenAI Tool Loop

The runtime sends instructions, input and enabled tool specifications to the
OpenAI Responses API. Function calls are dispatched locally, and every call
must receive a matching `function_call_output` before the next model turn.

Tool effects and tool errors are recorded in runtime state and later included
in the execution outcome.

See [Code Examples](docs/code-examples.md).

## Operations Layer

Phoenix Ops is a separate operational repository used for:

- package launch contracts;
- task state;
- run JSON;
- human-readable reports;
- progress and terminal status;
- review and audit.

This keeps operational state outside the model conversation and allows later
processes or humans to inspect what actually happened.

## Runnable Reference Implementation

The [`examples/reference`](examples/reference/) directory contains a coherent
public-safe runtime instead of two isolated source snippets.

It includes 19 ECMAScript modules and approximately 1,080 lines covering:

- validated task packages and explicit permissions;
- launchability and terminal-state protection;
- an independent worker concurrency lock;
- OpenAI-compatible function calling and `previous_response_id` continuity;
- tool registration, policy, dispatch, and event tracking;
- guarded workspace reads and writes;
- operations-style `run.json` and `report.md` persistence;
- structured package outcomes;
- deterministic model fixtures, a complete demo, and seven automated tests.

Run it without an API key:

```bash
npm run demo
npm test
```

Start with the [reference implementation guide](examples/reference/README.md).
The implementation is independently written from the architecture and does not
publish private runtime modules.

## Public Snapshot Boundary

Not included:

- the complete runtime source;
- internal prompts and instructions;
- full tool registries and command policies;
- project registry and bindings;
- Phoenix Ops persistence implementation;
- private conversations and execution artifacts;
- API keys, Telegram tokens or repository credentials.

## Portfolio Context

Phoenix Agent demonstrates:

- building an executable LLM agent rather than only prompting a model;
- OpenAI tool-call orchestration;
- repository and project boundaries;
- deterministic launch and lifecycle guards;
- tool-effect and error tracking;
- resumable conversation context;
- task/package result modeling;
- operational persistence and reporting;
- architecture evolution from a CLI MVP into a controlled local execution
  system.
