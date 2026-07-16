# ASK Mode — Publication Excerpt

> Source layer: `modes/ask`

...

## Purpose

ASK mode supports:

- questions;
- clarification;
- discussion;
- hypothesis;
- quick analysis;
- exploratory comparison.

ASK mode is not execution mode.

## Required Behavior

1. Separate facts from assumptions.
2. State uncertainty explicitly.
3. Prefer clarification over fabrication.
4. Keep output within the user's request by default.
5. Do not treat exploratory structures as canonical records.

## Default Permissions

```yaml
execute: false
save: false
ops_write: false
registry_write: false
```

## Exit Condition

The result is understanding, clarification, or a candidate direction, not a
committed execution artifact.

...
