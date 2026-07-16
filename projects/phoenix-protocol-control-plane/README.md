# Phoenix Protocol

Phoenix Protocol is an independently designed instruction architecture for
long-running work with LLM agents.

It is not a Python service, web application, API, or Dockerized runtime. The
project itself is a structured system of Markdown contracts, indexes,
behavioral modes, loading rules, artifact definitions, project overlays, and
controlled persistence policies.

## Why It Exists

An LLM can generate useful output, but long-running engineering work introduces
harder problems:

- context is lost between sessions;
- instructions from unrelated projects become mixed;
- assumptions can silently become "facts";
- execution and discussion are difficult to distinguish;
- generated artifacts require external validation;
- persistence must not happen implicitly;
- a new agent must know what to load without reading everything.

Phoenix Protocol turns these concerns into an explicit protocol layer.

## Repository Scale

The private working repository contains:

- 136 commits at the time of this snapshot;
- constitution, resolver, entry, modes, artifacts, extensions, workflows,
  runtime rules, overlays, knowledge, and migration layers;
- index-based loading instead of uncontrolled repository traversal;
- separate bootstrap paths for filesystem and connector-based environments.

## Architecture

```text
bootstrap
  -> root index
  -> constitution
  -> entry parsing
  -> mode resolution
  -> artifact contracts
  -> project overlay
  -> optional extensions/workflow
  -> explicit permissions
  -> action
```

See [Architecture](docs/architecture.md) for the layer model and repository
structure.

## Bootstrap Models

### Filesystem Bootstrap

[filesystem-bootstrap.md](bootstrap/filesystem-bootstrap.md) is the entry point
used when an agent has direct access to the local filesystem.

The bootstrap file:

- establishes the canonical protocol root;
- defines the Minimal Load;
- requires real file reads;
- forbids claiming activation before required files are loaded;
- keeps optional layers lazy.

### ChatGPT Project / Git Connector Bootstrap

[chatgpt-project-bootstrap.md](bootstrap/chatgpt-project-bootstrap.md) documents
the earlier connector-based activation model.

The ChatGPT project instruction directed the model to:

1. verify that the Git connector was really available;
2. open the Phoenix Protocol repository;
3. follow the repository README;
4. load the Minimal Load through actual external reads;
5. activate the protocol only after completion.

This allowed Phoenix Protocol to be attached to ChatGPT as an external,
versioned instruction system instead of pasting the entire context into every
conversation.

## Minimal Load

The agent does not load the complete repository by default.

```text
_INDEX.md
constitution/_INDEX.md + constitution nodes
resolver/_INDEX.md + resolver nodes
entry/_INDEX.md + entry nodes
```

Extensions, workflows, artifacts, overlays, and project knowledge are loaded
only when required by the active context.

## Core Design Decisions

### Truth Model

Information remains explicitly classified as:

- known;
- assumption;
- missing.

Generation produces a candidate. Validation establishes reliability.

### Modes

Behavior is separated into explicit modes such as discussion, planning,
execution, saving, and agent-driven repository work.

### No Implicit Write

Discussion, planning, execution, validation, and persistence are separate
operations. A validated artifact does not automatically receive permission to
be saved.

### Layer Isolation

Project overlays may specialize behavior but cannot redefine the constitution.
Extensions cannot silently change the active mode or grant write permission.

## Protocol Excerpts

The [`examples`](examples/) directory contains 16 publication-safe excerpts
showing the actual contract style and separation of responsibilities across:

- truth and verification;
- protocol layering;
- resolver order and fallback;
- entry fields and activation;
- ASK, EXEC, SAVE, and AGENT behavior;
- task and report artifacts;
- extension activation;
- patch verification.

Every excerpt is intentionally incomplete and marks omitted content with
`...`. The collection provides enough material to inspect how the protocol is
written without publishing the complete private documents.

Start with the [excerpt index](examples/README.md).

## Public Snapshot Boundary

This portfolio directory explains the architecture, includes bootstrap surfaces
intended to demonstrate activation, and provides bounded excerpts from selected
protocol layers.

It does not publish:

- the complete protocol repository;
- all contracts and validators;
- project knowledge;
- private overlays;
- operational artifacts;
- conversation history.

The full implementation remains the author's intellectual property.

## Portfolio Context

Phoenix Protocol demonstrates:

- context engineering beyond prompt writing;
- LLM instruction architecture;
- deterministic context loading;
- contract and artifact design;
- external verification discipline;
- permission and persistence boundaries;
- preservation of long-running engineering context;
- versioned integration with filesystem and Git-based agent environments.
