# Architecture

## Layer Model

| Layer | Responsibility |
| --- | --- |
| Constitution | Stable terminology, truth model, verification and layering rules |
| Entry | Minimal interaction contract used to initialize context |
| Modes | Discussion, planning, execution, save and agent behavior |
| Artifacts | Structured task, report and execution objects |
| Resolver | Deterministic selection of active protocol nodes |
| Overlays | Project-specific specialization |
| Extensions | Optional capabilities such as library and operations access |
| Workflow | Optional delivery disciplines |
| Runtime | Write, lifecycle and execution rules |
| Knowledge | Shared and project-specific context |
| Migration | Controlled evolution from earlier registry structures |

## Repository Shape

```text
phoenix_protocol/
├── constitution/
├── entry/
├── modes/
├── artifacts/
├── resolver/
├── overlays/
├── extensions/
├── workflow/
├── runtime/
├── knowledge/
└── migration/
```

Indexes define supported traversal. Agents start from `_INDEX.md` files rather
than scanning every directory.

## Resolution Formula

```text
Resolved Context =
  Constitution
  + Active Mode
  + Relevant Artifact Contracts
  + Project Overlay
  + Explicit Extensions
  + Explicit Workflow
  + Explicit Permissions
```

The same entry should resolve to the same active protocol context unless the
versioned protocol files change.

## Publication Map

The public [protocol excerpt set](../examples/) follows the same layer order:

```text
constitution
-> resolver
-> entry
-> modes
-> artifacts
-> extensions
-> workflow
```

Each file is a bounded excerpt with explicit omission markers. Project
overlays, complete validators, runtime internals, migration details, and
knowledge nodes remain outside the public snapshot.
