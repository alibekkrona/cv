# Extension Contract — Publication Excerpt

> Source layer: `extensions`

...

## Purpose

Extensions are optional attachable capability layers.

They may:

- add specialized routing;
- expose an optional structured domain;
- refine local interpretation;
- provide additional command patterns.

They must not:

- redefine the constitution;
- redefine active mode semantics;
- replace active project identity;
- grant implicit write permission;
- activate save or execution by themselves.

## Activation

An extension may be activated through:

- explicit user request;
- explicit `extension_request`;
- explicit project binding;
- deterministic resolver rule.

## Operational Example

An operations extension may resolve task/run/report paths and package
launchability, while still remaining read-oriented by default.

Extension activation changes available context, not the user's permissions.

...
