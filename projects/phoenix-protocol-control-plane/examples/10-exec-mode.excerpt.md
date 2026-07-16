# EXEC Mode — Publication Excerpt

> Source layer: `modes/exec`

...

## Purpose

EXEC mode is the strict mode for controlled artifact production and validated
actions.

## Required Behavior

1. Stay inside active contract boundaries.
2. Mark unverifiable required data as missing.
3. Separate known values from assumptions.
4. Produce output suitable for external validation.
5. Treat generated output as a candidate until validation passes.

## Validation Rule

```text
model -> candidate
validator -> pass or fail
executor -> only on pass
```

## Forbidden

- silent completion of unknown data;
- hidden assumptions;
- execution of a failed candidate;
- decorative fields outside the active contract.

## Exit Condition

The result is either a validated candidate ready for execution or an explicit
blocked/failed validation result.

...
