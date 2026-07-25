# ML Grokking Reproduction

A standalone, reproducible PyTorch experiment based on OpenAI's published
grokking work. The project reproduces modular addition and then performs a
controlled extension to modular multiplication while keeping the model,
dataset split, optimizer and evaluation contract fixed.

The experiment starts from random weights. It does not use a pretrained
language model, external dataset, LoRA adapter, replay buffer or hidden
deterministic solver inside inference.

## Result

The controlled extension learns:

```text
(a * b) mod 97
```

from 50% of the complete ordered operation table.

| Measurement | Result |
| --- | ---: |
| Complete ordered pairs | `9,409` |
| Training pairs | `4,704` |
| Held-out pairs | `4,705` |
| Accepted checkpoint | step `2,300` |
| Training exact accuracy | `100%` |
| Held-out exact accuracy | `100%` |
| Model parameters | `455,424` |
| Non-embedding parameters | `394,240` |

The held-out pairs were never used for gradient updates. Exact accuracy
requires both the modular result token and the trailing end-of-sequence token
to be correct.

The verified run record is available in
[`results/modular-multiplication-seed-0.json`](results/modular-multiplication-seed-0.json).
Selected points from the original metrics stream are retained in
[`results/selected-metrics.jsonl`](results/selected-metrics.jsonl).

## What Grokking Shows

The model first fits the training table while performing substantially worse
on unseen operand pairs:

```text
step 1,000
train exact:    100.00%
held-out exact: 49.65%
```

Generalization then rises rapidly:

```text
step 1,800
train exact:    100.00%
held-out exact: 90.24%

step 2,000
train exact:    100.00%
held-out exact: 99.51%

step 2,300
train exact:    100.00%
held-out exact: 100.00%
```

This separation between fitting and delayed generalization is the phenomenon
the reference paper calls *grokking*.

The longer run also exposed sharp temporary regressions after successful
checkpoints. The runner therefore keeps two bounded artifacts:

- `latest.pt` — the most recent periodic state;
- `best.pt` — the first state with the highest observed held-out exact
  accuracy.

Checkpoint selection does not change the optimization trajectory. It prevents
a later unstable update from overwriting an already observed result.

## Controlled Experimental Design

The addition baseline and multiplication extension use the same:

- prime modulus `97`;
- complete `97 x 97` ordered-pair space;
- deterministic 50/50 shuffled split;
- vocabulary and sequence format;
- random model seed;
- two-layer decoder-only Transformer;
- optimizer and learning-rate schedule;
- loss mask;
- evaluation cadence;
- maximum optimization budget.

Only one experimental variable changes:

```text
addition:       result = (a + b) mod 97
multiplication: result = (a * b) mod 97
```

This makes the comparison interpretable. Improvement cannot be attributed to a
larger model, a different split, more data, replay or a changed optimizer.

## Architecture

```text
decoder-only causal Transformer
layers:                     2
model width:                128
attention heads:            4
feed-forward width:         512
activation:                 ReLU
normalization:              post-LayerNorm
position encoding:          fixed sinusoidal
dropout:                    0
embedding/output tying:     disabled
total parameters:           455,424
non-embedding parameters:   394,240
```

Each residue `0..96` is one atomic token. An example is represented as:

```text
<eos> 14 * 37 = 33 <eos>
```

The model receives the prefix and predicts the answer plus the final EOS.

## Optimization

```text
optimizer:       AdamW
learning rate:   1e-3
weight decay:    1.0
betas:           (0.9, 0.98)
epsilon:         1e-8
warmup:          10 optimizer updates
batch size:      512
reference budget: 100,000 optimizer updates
```

The accepted multiplication checkpoint appeared at step `2,300`. The bounded
run was stopped after the result had been reproduced repeatedly; the original
requested budget remains available through the included command.

## Method

The project follows a narrow experimental workflow:

1. Freeze the behavior class and deterministic oracle.
2. Generate every ordered input pair.
3. Create a reproducible disjoint train/held-out split.
4. Verify the split, oracle, vocabulary and parameter count with tests.
5. Start a new model from random weights.
6. Update all weights using the published reference-style configuration.
7. Measure exact train and held-out behavior throughout the run.
8. Preserve the best observed checkpoint without changing training.
9. Report the result together with configuration and split digest.

This experiment deliberately avoids manual decomposition into intermediate
arithmetic skills. The complete constructive behavior class is presented
jointly, allowing the network to discover a representation that generalizes.

## Repository Layout

```text
src/grokking_reproduction/
  experiment.py       model, vocabulary, dataset and metrics
  __main__.py          reproducible training CLI

tests/
  test_experiment.py  split, oracle, architecture and loss checks

results/
  modular-multiplication-seed-0.json
  selected-metrics.jsonl

Dockerfile
docker-compose.yml
Makefile
ATTRIBUTION.md
```

Generated checkpoints and full metric streams are written to `artifacts/` and
are intentionally excluded from Git. They are derived outputs; the source,
configuration, exact split digest and accepted measurements are versioned.

## Run Locally

Requirements:

- Python 3.11 or newer;
- a CPU-compatible PyTorch installation.

Install:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -e ".[dev]"
```

Verify:

```bash
python3 -m pytest -q
```

Run a short pipeline smoke test:

```bash
python3 -m grokking_reproduction train \
  --operation multiplication \
  --steps 20 \
  --eval-every 10 \
  --no-checkpoint
```

Run the complete multiplication experiment:

```bash
python3 -m grokking_reproduction train \
  --operation multiplication \
  --steps 100000 \
  --eval-every 100
```

The addition baseline uses the identical command with:

```text
--operation addition
```

## Run with Docker

Build and execute the verification suite:

```bash
docker compose run --rm test
```

The container installs PyTorch from the official CPU wheel index and does not
download CUDA runtime packages.

Run the full multiplication experiment:

```bash
docker compose run --rm experiment
```

Generated artifacts are mounted into the local `artifacts/` directory.

## Verification Contract

The automated suite verifies:

- all `9,409` ordered pairs exist exactly once;
- train and held-out pairs are disjoint;
- the split is deterministic;
- addition and multiplication use identical pair partitions;
- generated multiplication answers match the formal oracle;
- the vocabulary contains `239` tokens;
- the architecture contains exactly `455,424` trainable parameters;
- loss and exact accuracy are computed on the intended output positions.

## Engineering Decisions

### Formal Oracle Instead of Handwritten Labels

Every label is generated by:

```text
(a * b) mod 97
```

This removes natural-language ambiguity and makes dataset correctness directly
testable.

### One Behavior Class Instead of Continual Learning

All multiplication cases participate in one joint training process. There is
no sequence of separately added capabilities and therefore no replay mechanism
for restoring older tasks.

### Fixed Split Instead of Anecdotal Examples

The split covers the complete input space and is identified by SHA-256:

```text
ab9e9ae9552eb41aedd37a7805d768269164fbe03ab5bb9e21e096dd3669a7a7
```

### Exact Accuracy Instead of Approximate Scoring

Modular arithmetic has one correct answer. The project reports exact held-out
behavior rather than a subjective quality score.

## Scope and Claims

This project demonstrates:

- reproduction of a published machine-learning experiment;
- implementation of a Transformer directly in PyTorch;
- deterministic synthetic-data engineering;
- controlled extension from addition to multiplication;
- reproducible experiment metadata and checkpoint discipline;
- diagnosis of memorization, delayed generalization and checkpoint
  instability;
- Docker packaging and automated verification.

It does not claim:

- invention of grokking;
- a new neural-network architecture;
- universal mathematical reasoning;
- production readiness from a single random seed;
- statistical conclusions across multiple seeds.

The honest result is narrower: under the documented seed and configuration, a
randomly initialized 455K-parameter Transformer reached 100% exact accuracy on
4,705 held-out modular-multiplication pairs.

## References

- Power et al.,
  [Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets](https://arxiv.org/abs/2201.02177)
- [OpenAI grok reference implementation](https://github.com/openai/grok)
- Upstream code commit:
  `3d64b1d8c1d595dd8ebdb7771998823f1b14c7b3`
- See [ATTRIBUTION.md](ATTRIBUTION.md) for provenance.
