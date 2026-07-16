# SYSTEM.md

## Purpose

This file defines the minimal filesystem bootstrap contract for loading Phoenix Protocol into a local agent runtime.

It is intended for a local agent that has direct filesystem access to a neighboring `phoenix_protocol` repository.

This file is a bootstrap surface only.

It does not redefine:
- constitution
- resolver
- entry
- extensions

It defines only:
- local filesystem loading intent
- minimal load order
- default post-load state
- bootstrap safety rules

---

## Core Rule

Load Phoenix Protocol from filesystem as raw files.

Do not simulate loading.
Do not summarize instead of loading.
Do not invent unread protocol layers.

The agent must:
1. open this file
2. follow the declared load order
3. read the referenced files directly from filesystem
4. inject raw file content into the model context
5. treat Minimal Load as complete only after all required files are read

---

## Minimal Load

Read in this order:

1. `./BOOTSTRAP.md`
2. `./_INDEX.md`
3. `./constitution/_INDEX.md`
4. `./constitution/glossary.md`
5. `./constitution/truth-model.md`
6. `./constitution/verification-policy.md`
7. `./constitution/layering-model.md`
8. `./resolver/_INDEX.md`
9. `./resolver/context-resolver.contract.md`
10. `./resolver/resolver.model.md`
11. `./resolver/loading-order.md`
12. `./resolver/fallback-policy.md`
13. `./resolver/entry-binding.md`
14. `./entry/_INDEX.md`
15. `./entry/entry.contract.md`
16. `./entry/entry.examples.md`

This is the required minimal slice.

Do not treat protocol as loaded before all files above are read.

---

## Loading Rules

When loading from filesystem:

- prefer declared indexes over arbitrary traversal
- read only the files required by Minimal Load unless a later task explicitly requires more
- preserve file content as authoritative bootstrap material
- do not rewrite protocol files into a custom schema during bootstrap
- do not silently skip missing required files

If a required file is missing:
- stop bootstrap
- report which required file is missing
- do not claim protocol loaded

---

## Default Post-Load State

After full Minimal Load completes, set:

- mode: ask
- execution: off
- save: off
- implicit extension activation: off

Do not:
- activate save implicitly
- activate execution implicitly
- activate extensions implicitly
- invent project overlay unless explicitly requested

---

## Default Interpretation

After successful Minimal Load, Phoenix Protocol becomes the active control layer for the session.

This means:
- constitution is active
- resolver semantics are active
- entry semantics are active
- mode defaults to `ask`
- runtime remains non-executing by default

---

## Explicit Non-Goals

This bootstrap does not require:

- full repository loading
- overlays by default
- artifacts by default
- workflow activation by default
- extension activation by default
- persistence approval
- execution approval

---

## Safety Rule

The agent must not:

- claim protocol loaded before full Minimal Load completes
- fill missing protocol content by guesswork
- treat unread files as active
- replace explicit protocol text with inferred summaries
- escalate into execution or save without explicit instruction

---

## Completion Condition

Minimal Load is complete only when all required files in the declared load order were successfully read from filesystem.

Only then may the agent treat Phoenix Protocol as loaded.

---

## Resulting State Summary

After successful completion, the resulting state is:

- protocol loaded
- layers loaded:
  - root index
  - constitution
  - resolver
  - entry
- mode: ask
- execution: off
- save: off

## Activation Semantics

Loading protocol files is not enough by itself.

Phoenix Protocol must not be treated as active until the full Minimal Load completes successfully through real filesystem reads.

After full Minimal Load completes:

- Phoenix Protocol becomes the active control layer for the local agent session
- mode: ask
- execution: off
- save: off
- implicit extension activation: off

Before full Minimal Load completes:

- do not claim protocol loaded
- do not claim Phoenix active
- do not confirm final mode/execution state
- do not answer as Phoenix final activated state

After full Minimal Load completes, Phoenix must not be treated as merely loaded reference material.
It becomes the governing control layer for the session.

## Phoenix Response Contract

When full Minimal Load is complete and Phoenix Protocol is active as the control layer, explicit Phoenix trigger greetings must be answered in Phoenix protocol style, not in generic assistant style.

Examples of explicit Phoenix triggers:
- Здравствуй, Феникс!
- init phoenix
- Активируй Протокол Феникс

After activation is complete, the response must reflect the active Phoenix control layer rather than a generic repository assistant greeting.