# Code Examples

## Launch Contract

The public task-package contract accepts known lifecycle states but marks only
`ready` as launchable:

```js
return {
    valid: true,
    contractStatus,
    launchable: contractStatus === "ready",
    reason: null
};
```

This prevents file presence alone from causing repeated execution.

## Response And Tool Loop

The public reference runtime implements the same OpenAI-compatible loop:

1. receives function calls;
2. parses arguments;
3. dispatches enabled local tools;
4. records effects or errors;
5. returns one output for every call ID;
6. continues from the previous response.

An invariant check rejects a turn if any expected tool call lacks a matching
output.

## Package Outcome

Package completion is computed from task results:

```text
no failed task                    -> success
failed task + completed tasks     -> partial
failed task + no completed tasks  -> failed
```

The resulting contract retains package, project, task and run IDs, tool events,
response IDs, model-turn counts and the reason execution stopped.

See the complete modules in
[`examples/reference`](../examples/reference/README.md).
