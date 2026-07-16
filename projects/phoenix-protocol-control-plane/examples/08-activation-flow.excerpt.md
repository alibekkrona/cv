# Activation Flow — Publication Excerpt

> Source surfaces: filesystem bootstrap, root index, resolver, and entry.

...

## Trigger

```text
activate Phoenix Protocol
```

## Staged Trace

```yaml
stage_1:
  read: bootstrap-filesystem.md
  protocol_active: false

stage_2:
  read:
    - BOOTSTRAP.md
    - _INDEX.md
  protocol_active: false

stage_3:
  read:
    - constitution/_INDEX.md
    - constitution/truth-model.md
    - constitution/verification-policy.md
    - constitution/layering-model.md
  protocol_active: false

stage_4:
  read:
    - resolver/_INDEX.md
    - declared resolver nodes
    - entry/_INDEX.md
    - declared entry nodes
  minimal_load_complete: true
```

## Completion Gate

Before `minimal_load_complete = true`:

- do not claim protocol activation;
- do not announce a final mode;
- do not treat unread layers as active.

After completion:

```yaml
protocol_active: true
mode: ask
execution: false
save: false
implicit_extensions: false
```

Optional project, artifact, workflow, and extension layers remain unloaded until
explicitly resolved.

...
