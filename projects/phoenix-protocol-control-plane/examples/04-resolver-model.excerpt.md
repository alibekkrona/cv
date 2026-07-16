# Resolver Model — Publication Excerpt

> Source layer: `resolver`

...

## Resolution Order

1. Load the constitution.
2. Load the extension registry without activating extensions.
3. Resolve exactly one active mode.
4. Load artifact contracts only when required.
5. Apply a project overlay when one is explicitly selected.
6. Activate extensions only through an explicit binding or request.
7. Activate a workflow only through an explicit workflow request.
8. Resolve execution and persistence permissions.

## Resolution Formula

```text
Resolved Context =
  Constitution
  + Mode
  + Artifact Contracts (when required)
  + Project Overlay (when present)
  + Explicit Extensions
  + Explicit Workflow
  + Explicit Permissions
```

## Determinism Rule

The same entry must resolve to the same active node set unless the versioned
protocol files have changed.

Resolver builds context from declared layers.  
Resolver does not invent context or merge unrelated layers arbitrarily.

...
