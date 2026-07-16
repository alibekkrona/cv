# Loading Order — Publication Excerpt

> Source layer: `resolver`

...

## Canonical Sequence

```text
1. root index
2. constitution
3. extension registry
4. active mode
5. artifact contracts, when required
6. project overlay, when present
7. explicitly activated extensions
8. permission check
9. execution or save decision
```

## Index-Based Loading

When a section contains `_INDEX.md`, the resolver should:

1. open the index first;
2. identify declared nodes;
3. load only nodes relevant to the active context.

The resolver must not traverse complete repository trees by default.

## Missing Layer Rule

If a required layer is missing, resolution stops and reports the missing node.

No silent fallback to invented protocol content is allowed.

...
