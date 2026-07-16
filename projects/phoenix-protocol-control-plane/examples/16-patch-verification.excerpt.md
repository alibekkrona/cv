# Patch Verification — Publication Excerpt

> Source layer: `workflow/patching`

...

## Principle

Patch generation is not patch validation.

Validation must be grounded in the actual target file.

## Correction Loop

```text
read target file
-> generate candidate patch
-> validate anchor and structure
-> failure: correct candidate
-> repeat until pass or abort
```

## Anchor Rules

1. Anchor text must come from a real file read.
2. Whitespace and indentation must be preserved.
3. The anchor must match verbatim.
4. Reconstructed or partial anchors are forbidden.

## Hard Constraints

```text
NO FILE READ -> NO PATCH
NO VERIFIED ANCHOR -> NO PATCH
NO VALIDATION PASS -> NO PATCH
```

The model must not self-approve a patch without verifying it against repository
state.

...
