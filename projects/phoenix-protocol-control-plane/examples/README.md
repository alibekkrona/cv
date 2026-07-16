# Protocol Excerpts

This directory contains publication-safe excerpts from the private Phoenix
Protocol repository.

The files are intentionally incomplete. Every excerpt:

- identifies its source layer;
- preserves representative contract language;
- uses `...` to mark omitted material;
- excludes private project overlays, operational knowledge, complete validators,
  migration internals, and the full protocol graph.

The excerpts are evidence of the protocol's structure and writing style. They
are not sufficient to reconstruct or activate the complete private system.

## Constitution

- [Truth model](01-truth-model.excerpt.md)
- [Verification policy](02-verification-policy.excerpt.md)
- [Layering model](03-layering-model.excerpt.md)

## Resolver And Entry

- [Resolver model](04-resolver-model.excerpt.md)
- [Loading order](05-loading-order.excerpt.md)
- [Fallback policy](06-fallback-policy.excerpt.md)
- [Entry contract](07-entry-contract.excerpt.md)
- [Activation trace](08-activation-flow.excerpt.md)

## Modes

- [ASK behavior](09-ask-mode.excerpt.md)
- [EXEC behavior](10-exec-mode.excerpt.md)
- [SAVE behavior](11-save-mode.excerpt.md)
- [AGENT behavior](12-agent-mode.excerpt.md)

## Artifacts And Extensions

- [Task contract](13-task-contract.excerpt.md)
- [Report contract](14-report-contract.excerpt.md)
- [Extension contract](15-extension-contract.excerpt.md)

## Workflow

- [Patch verification](16-patch-verification.excerpt.md)

## Reading Order

A useful review sequence is:

```text
truth model
-> verification
-> layering
-> resolver
-> entry
-> mode
-> artifact
-> extension/workflow
```

This mirrors how the protocol separates stable meaning from contextual behavior
and optional execution disciplines.
