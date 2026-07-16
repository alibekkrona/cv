# Fallback Policy — Publication Excerpt

> Source layer: `resolver`

...

## Core Principle

No unsafe fallback.

Fallback is allowed only when it:

1. is low risk;
2. does not change artifact meaning;
3. does not grant new permissions;
4. does not silently enter execution or persistence.

## Safe Example

When mode is `ask` and no artifact is specified:

- continue without a strict artifact contract;
- keep write permission denied;
- preserve unresolved scope instead of inventing one.

## Unsafe Examples

### Missing Mode

Mode defines behavioral semantics and must not be guessed.

### Missing Artifact In Strict Execution

The resolver must not guess whether the target is a task, report, or another
artifact.

### Missing Save Destination

Persistence must stop when the destination is unresolved.

## Default Deny

Missing context affecting execution, write access, validation, or artifact
meaning resolves to blocked or unresolved, never implicitly allowed.

...
