# Layering Model — Publication Excerpt

> Source layer: `constitution`

...

## Layers

### L1 — Constitution

Global terminology, truth model, and verification invariants.

### L2 — Modes

Behavioral contexts such as `ask`, `plan`, `exec`, `save`, and `agent`.

### L3 — Artifact Contracts

Meaning and required structure of task, report, and execution artifacts.

### L4 — Schemas And Validators

Machine-readable structural enforcement.

### L5 — Overlays

Project-specific specialization.

### L6 — Extensions

Optional attachable capability layers.

### L7 — Runtime

Execution state and lifecycle.

## Isolation Rules

1. Lower layers may specialize but must not redefine upper layers.
2. Overlays must not change the constitution.
3. Modes must not redefine artifact meaning.
4. Runtime state must not alter contracts.

...

Separation enables deterministic resolution and controlled growth.

...
