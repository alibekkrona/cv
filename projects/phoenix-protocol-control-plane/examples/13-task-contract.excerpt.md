# Task Contract — Publication Excerpt

> Source layer: `artifacts/task`

...

## Purpose

Task is a structured definition of work to be executed.

Task is not execution.  
Task is not result.

## Required Semantic Fields

### `task_id`

Unique task identity.

### `objective`

Specific, outcome-oriented, and unambiguous goal.

### `scope`

Explicit included and excluded boundaries.

### `constraints`

Rules, limitations, formats, and allowed operations.

### `expected_output`

Required result structure and artifact type.

## Rules

1. Missing fields must not be silently filled.
2. Assumptions must be explicit.
3. A task must be executable in principle.
4. Execution results must not be embedded into the task.

```text
Task -> Execution -> Report
```

...
