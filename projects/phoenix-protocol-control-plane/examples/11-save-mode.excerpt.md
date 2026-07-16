# SAVE Mode — Publication Excerpt

> Source layer: `modes/save`

...

## Purpose

SAVE mode controls canonical persistence.

It is not exploration, drafting, or execution.

## Input Requirement

SAVE expects:

- a validated artifact;
- an explicitly approved artifact; or
- canonical content already prepared for fixation.

## Required Behavior

1. Preserve artifact meaning during persistence.
2. Keep traceability to the source artifact.
3. Verify that the destination is explicitly allowed.
4. Distinguish draft content from canonical content.

## Forbidden

- saving an exploratory draft as canonical;
- silently rewriting semantics during save;
- writing to an unresolved or restricted destination;
- treating validation as implicit permission to persist.

## Exit Condition

```text
saved
or explicitly refused
or blocked by validation / policy / destination
```

...
