# Verification Policy — Publication Excerpt

> Source layer: `constitution`

...

## Verification Levels

### Level 1 — Structure

- required sections are present;
- forbidden sections are absent.

### Level 2 — Format

- field types;
- length constraints;
- enum constraints.

### Level 3 — Semantic Rules

- allowed values;
- logical consistency;
- contract compliance.

## Enforcement Rules

1. Execution is allowed only if validation passes.
2. Failed output must not be executed.
3. The model must not self-approve its own candidate.
4. Validation remains external to generation.

## Correction Loop

```text
generate candidate
-> validate
-> fail: correct candidate
-> repeat until pass or abort
```

...

Verification has higher priority than response speed.

...
