# Entry Contract — Publication Excerpt

> Source layer: `entry`

...

## Entry Fields

### `mode` — required

Allowed values:

- `ask`;
- `plan`;
- `exec`;
- `save`;
- `agent`.

### `project` — optional

Selects a project context and its overlay.

### `artifact` — optional

Selects an artifact contract such as `task` or `report`.

### `scope` — optional

Narrows the active work area without granting permissions.

### `extension_request` — optional

Requests one or more attachable protocol extensions.

### `intent` — optional

Refines behavior inside the selected mode.

## Minimal Entry

```yaml
mode: ask
```

Entry configures the resolver.  
Entry does not itself execute work or imply persistence.

...
