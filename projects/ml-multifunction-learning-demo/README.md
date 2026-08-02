# ML Multi-Function Learning Demo

An inference-ready PyTorch demonstration of one compact Transformer performing
two independently selectable mathematical functions:

```text
SQUARE POLYNOMIAL:  (x² + y) mod 97
MODULAR DIVISION:   x / y mod 97
```

Both capabilities live in one shared model. The requested operation and its
operands are supplied together, and the model returns an intermediate state
followed by the final result.

This repository contains the trained inference checkpoint and a browser
playground. It intentionally excludes training examples, dataset construction,
training scripts, optimizer state and internal research notes.

## Result

The selected checkpoint was evaluated on a deterministic held-out partition
that was excluded from gradient updates.

| Measurement | Result |
| --- | ---: |
| Model parameters | `455,424` |
| Shared vocabulary | `239` tokens |
| Joint training exact accuracy | `100%` |
| Joint held-out exact accuracy | `99.9039%` |
| Square-polynomial held-out exact accuracy | `99.8087%` |
| Modular-division held-out exact accuracy | `100%` |
| Intermediate-state held-out accuracy | `100%` |
| Selected checkpoint | step `16,600` |

Exact evaluation requires the intermediate token, final-result token and
end-of-sequence token to all match.

## What It Demonstrates

The project demonstrates that one shared parameter space can retain two
different finite behaviors when the requested capability is included in the
input contract.

The same operands can therefore produce different valid outputs:

```text
14 **2+ 7  -> intermediate 2,  result 9
14 / 7     -> intermediate 14, result 2
```

The browser application performs direct greedy inference from the packaged
checkpoint. It does not call an external model or a hidden arithmetic solver.

## Architecture

```text
decoder-only causal Transformer
layers:                    2
model width:               128
attention heads:           4
feed-forward width:        512
activation:                ReLU
normalization:             post-LayerNorm
position encoding:         fixed sinusoidal
total parameters:          455,424
```

## Repository Layout

```text
model/model.pt                 inference-only checkpoint
src/multifunction_demo/        model and HTTP inference runtime
web/index.html                 interactive browser playground
tests/                         parser and checkpoint smoke tests
Dockerfile
docker-compose.yml
Makefile
```

No training dataset is included.

## Run with Docker

```bash
docker compose up --build
```

Open:

```text
http://localhost:8090
```

Stop:

```bash
docker compose down
```

## Run Locally

Requirements:

- Python 3.11 or newer;
- CPU-compatible PyTorch.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -e ".[dev]"
python3 -m multifunction_demo
```

Then open `http://localhost:8080`. The local Python command uses port `8080`;
Docker Compose publishes the container at `http://localhost:8090`.

Run verification:

```bash
python3 -m pytest -q
```

## API

Health:

```bash
curl http://localhost:8090/health
```

Prediction:

```bash
curl -X POST http://localhost:8090/api/predict \
  -H "Content-Type: application/json" \
  -d '{"task":"square_polynomial","x":14,"y":7}'
```

Available task values:

```text
square_polynomial
division
```

Operands must be integers from `0` through `96`. Division requires `y != 0`.
