"""Command-line runner for the grokking reproduction."""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import torch

from .experiment import (
    ArithmeticVocabulary,
    ExperimentConfig,
    GrokkingTransformer,
    answer_loss_and_accuracy,
    make_operation_split,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    train = subparsers.add_parser("train")
    train.add_argument(
        "--operation",
        choices=("addition", "multiplication"),
        default="multiplication",
    )
    train.add_argument("--steps", type=int, default=100_000)
    train.add_argument("--seed", type=int, default=0)
    train.add_argument("--train-fraction", type=float, default=0.5)
    train.add_argument("--eval-every", type=int, default=100)
    train.add_argument("--checkpoint-every", type=int, default=5_000)
    train.add_argument("--output", type=Path, default=Path("artifacts"))
    train.add_argument("--no-checkpoint", action="store_true")
    return parser.parse_args()


def batches(rows: torch.Tensor, batch_size: int):
    permutation = torch.randperm(len(rows))
    for start in range(0, len(rows), batch_size):
        yield rows[permutation[start : start + batch_size]]


@torch.no_grad()
def evaluate(
    model: GrokkingTransformer,
    rows: torch.Tensor,
    equals_token_id: int,
    batch_size: int,
) -> tuple[float, float]:
    model.eval()
    weighted_loss = 0.0
    weighted_accuracy = 0.0
    count = 0
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        loss, accuracy = answer_loss_and_accuracy(
            model,
            batch,
            equals_token_id,
        )
        weighted_loss += float(loss) * len(batch)
        weighted_accuracy += float(accuracy) * len(batch)
        count += len(batch)
    model.train()
    return weighted_loss / count, weighted_accuracy / count


def atomic_json_write(path: Path, value: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)


def train(args: argparse.Namespace) -> None:
    if args.steps <= 0:
        raise SystemExit("--steps must be positive")
    if args.eval_every <= 0:
        raise SystemExit("--eval-every must be positive")

    config = ExperimentConfig(
        train_fraction=args.train_fraction,
        model_seed=args.seed,
    )
    torch.manual_seed(config.model_seed)
    vocabulary = ArithmeticVocabulary()
    split = make_operation_split(config, vocabulary, args.operation)
    model = GrokkingTransformer(config, len(vocabulary))
    equals_token_id = vocabulary.token_to_id["="]

    run_directory = args.output / (
        f"mod-{args.operation}-p97-train-{config.train_fraction:g}-seed-"
        f"{config.model_seed}"
    )
    run_directory.mkdir(parents=True, exist_ok=True)
    metrics_path = run_directory / "metrics.jsonl"
    latest_checkpoint = run_directory / "latest.pt"
    best_checkpoint = run_directory / "best.pt"
    manifest_path = run_directory / "manifest.json"

    manifest = {
        "source": {
            "paper": "https://arxiv.org/abs/2201.02177",
            "official_code": "https://github.com/openai/grok",
            "official_code_commit": (
                "3d64b1d8c1d595dd8ebdb7771998823f1b14c7b3"
            ),
        },
        "operation": f"modular_{args.operation}",
        "config": config.to_dict(),
        "steps": args.steps,
        "vocabulary_size": len(vocabulary),
        "sequence_tokens": 7,
        "loss_tokens": ["answer", "trailing_eos"],
        "train_examples": len(split.train),
        "validation_examples": len(split.validation),
        "split_digest": split.digest,
        "parameter_count": model.parameter_count(),
        "non_embedding_parameter_count": model.non_embedding_parameter_count(),
        "device": "cpu",
        "torch_version": str(torch.__version__),
    }
    atomic_json_write(manifest_path, manifest)
    metrics_path.write_text("", encoding="utf-8")

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.learning_rate,
        betas=(config.beta1, config.beta2),
        eps=config.epsilon,
        weight_decay=config.weight_decay,
    )
    batch_iterator = iter(batches(split.train, config.batch_size))
    started = time.monotonic()
    best_validation_accuracy = float("-inf")
    best_step = 0

    def record(step: int) -> None:
        nonlocal best_validation_accuracy, best_step
        train_loss, train_accuracy = evaluate(
            model,
            split.train,
            equals_token_id,
            config.batch_size,
        )
        validation_loss, validation_accuracy = evaluate(
            model,
            split.validation,
            equals_token_id,
            config.batch_size,
        )
        metric = {
            "step": step,
            "train_loss": train_loss,
            "train_accuracy": train_accuracy,
            "validation_loss": validation_loss,
            "validation_accuracy": validation_accuracy,
            "learning_rate": optimizer.param_groups[0]["lr"],
            "elapsed_seconds": time.monotonic() - started,
        }
        with metrics_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(metric, sort_keys=True) + "\n")
        print(json.dumps(metric, sort_keys=True), flush=True)
        if validation_accuracy > best_validation_accuracy:
            best_validation_accuracy = validation_accuracy
            best_step = step
            if not args.no_checkpoint:
                torch.save(
                    {
                        "step": step,
                        "model": model.state_dict(),
                        "optimizer": optimizer.state_dict(),
                        "manifest": manifest,
                        "selection": {
                            "metric": "validation_accuracy",
                            "value": validation_accuracy,
                        },
                    },
                    best_checkpoint,
                )

    record(0)
    model.train()
    for step in range(1, args.steps + 1):
        try:
            batch = next(batch_iterator)
        except StopIteration:
            batch_iterator = iter(batches(split.train, config.batch_size))
            batch = next(batch_iterator)

        warmup_scale = min(step / max(config.warmup_steps, 1), 1.0)
        optimizer.param_groups[0]["lr"] = config.learning_rate * warmup_scale
        optimizer.zero_grad(set_to_none=True)
        loss, _ = answer_loss_and_accuracy(model, batch, equals_token_id)
        loss.backward()
        optimizer.step()

        if step == args.steps or step <= 10 or step % args.eval_every == 0:
            record(step)

        if (
            not args.no_checkpoint
            and (
                step == args.steps
                or step % args.checkpoint_every == 0
            )
        ):
            torch.save(
                {
                    "step": step,
                    "model": model.state_dict(),
                    "optimizer": optimizer.state_dict(),
                    "manifest": manifest,
                },
                latest_checkpoint,
            )

    elapsed = time.monotonic() - started
    atomic_json_write(
        run_directory / "summary.json",
        {
            "completed_steps": args.steps,
            "elapsed_seconds": elapsed,
            "steps_per_second": args.steps / elapsed,
            "best_validation_accuracy": best_validation_accuracy,
            "best_step": best_step,
        },
    )


def main() -> None:
    args = parse_args()
    if args.command == "train":
        train(args)


if __name__ == "__main__":
    main()
