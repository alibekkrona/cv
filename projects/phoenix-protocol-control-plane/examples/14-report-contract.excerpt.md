# Report Contract — Publication Excerpt

> Source layer: `artifacts/report`

...

## Purpose

Report represents what actually happened during execution.

Report is not a plan and not a task.

## Required Semantic Fields

- `task_id`;
- `status`;
- `result`;
- `output_data`.

## Canonical Markdown Sections

```text
# Run Report: <RUN_ID>

## Task
## Run Pointers
## Run Status
## Summary
## Actions
## Result
```

Optional sections may include:

- `Files Changed`;
- `Git`;
- `Next`.

## Rules

1. Status must match the actual outcome.
2. Missing output must remain explicit.
3. Success must not be reported without a result.
4. Actions list completed actions, not intentions.
5. Report structure must preserve traceability to run artifacts.

...
