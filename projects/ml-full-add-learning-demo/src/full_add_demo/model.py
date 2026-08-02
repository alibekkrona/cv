"""Minimal opaque inference runtime for the packaged addition checkpoint."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import torch
from torch import Tensor, nn


MAX_OPERAND = 9_999_999
VOCABULARY_SIZE = 18
DIGIT_COUNT = 10
FIELD_TOKEN_ID = 10
STATE_TOKEN_ID = 11
HEADER_IDS = (12, 13, 14, 15, 16, STATE_TOKEN_ID)
INTERNAL_FIXED_LENGTH = 34
MAX_RESULT_DIGITS = 8


@dataclass(frozen=True, slots=True)
class ModelConfig:
    number_of_layers: int = 2
    number_of_heads: int = 4
    model_dimension: int = 128
    feed_forward_multiplier: int = 4
    max_context_length: int = 64


class AttentionHead(nn.Module):
    def __init__(self, model_dimension: int, head_dimension: int) -> None:
        super().__init__()
        self.head_dimension = head_dimension
        self.query = nn.Linear(model_dimension, head_dimension, bias=False)
        self.key = nn.Linear(model_dimension, head_dimension, bias=False)
        self.value = nn.Linear(model_dimension, head_dimension, bias=False)

    def forward(self, hidden: Tensor, mask: Tensor) -> Tensor:
        queries = self.query(hidden)
        keys = self.key(hidden)
        values = self.value(hidden)
        scores = queries @ keys.transpose(-2, -1)
        scores = scores / math.sqrt(self.head_dimension)
        scores = scores.masked_fill(~mask, float("-inf"))
        return torch.softmax(scores, dim=-1) @ values


class MultiHeadAttention(nn.Module):
    def __init__(self, model_dimension: int, number_of_heads: int) -> None:
        super().__init__()
        head_dimension = model_dimension // number_of_heads
        self.heads = nn.ModuleList(
            AttentionHead(model_dimension, head_dimension)
            for _ in range(number_of_heads)
        )
        self.output = nn.Linear(model_dimension, model_dimension, bias=False)

    def forward(self, hidden: Tensor, mask: Tensor) -> Tensor:
        attended = torch.cat(
            [head(hidden, mask) for head in self.heads],
            dim=-1,
        )
        return self.output(attended)


class DecoderBlock(nn.Module):
    def __init__(self, config: ModelConfig) -> None:
        super().__init__()
        dimension = config.model_dimension
        hidden_dimension = dimension * config.feed_forward_multiplier
        self.attention = MultiHeadAttention(dimension, config.number_of_heads)
        self.attention_norm = nn.LayerNorm(dimension)
        self.feed_forward = nn.Sequential(
            nn.Linear(dimension, hidden_dimension, bias=False),
            nn.ReLU(),
            nn.Linear(hidden_dimension, dimension, bias=False),
        )
        self.feed_forward_norm = nn.LayerNorm(dimension)

    def forward(self, hidden: Tensor, mask: Tensor) -> Tensor:
        hidden = self.attention_norm(hidden + self.attention(hidden, mask))
        return self.feed_forward_norm(hidden + self.feed_forward(hidden))


class FullAddTransformer(nn.Module):
    def __init__(self, config: ModelConfig) -> None:
        super().__init__()
        self.config = config
        self.embedding = nn.Embedding(VOCABULARY_SIZE, config.model_dimension)
        self.register_buffer(
            "position_encoding",
            self._position_encoding(
                config.max_context_length,
                config.model_dimension,
            ),
        )
        self.register_buffer(
            "causal_mask",
            torch.ones(
                config.max_context_length,
                config.max_context_length,
                dtype=torch.bool,
            ).tril(),
        )
        self.blocks = nn.ModuleList(
            DecoderBlock(config) for _ in range(config.number_of_layers)
        )
        self.output = nn.Linear(
            config.model_dimension,
            VOCABULARY_SIZE,
            bias=False,
        )

    @staticmethod
    def _position_encoding(context_length: int, dimension: int) -> Tensor:
        positions = torch.arange(context_length, dtype=torch.float32).unsqueeze(1)
        dimensions = torch.arange(0, dimension, 2, dtype=torch.float32)
        frequencies = torch.exp(-math.log(10_000.0) * dimensions / dimension)
        encoding = torch.zeros(context_length, dimension)
        encoding[:, 0::2] = torch.sin(positions * frequencies)
        encoding[:, 1::2] = torch.cos(positions * frequencies)
        return encoding

    def forward(self, token_ids: Tensor) -> Tensor:
        sequence_length = token_ids.size(1)
        hidden = (
            self.embedding(token_ids)
            + self.position_encoding[:sequence_length].to(token_ids.device)
        )
        mask = self.causal_mask[:sequence_length, :sequence_length]
        for block in self.blocks:
            hidden = block(hidden, mask)
        return self.output(hidden)

    def parameter_count(self) -> int:
        return sum(parameter.numel() for parameter in self.parameters())


def validate_operands(left: object, right: object) -> tuple[int, int]:
    for name, value in (("left", left), ("right", right)):
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(f"{name} must be an integer")
        if not 0 <= value <= MAX_OPERAND:
            raise ValueError(f"{name} must be between 0 and {MAX_OPERAND}")
    return left, right


def _decimal_ids(value: int) -> list[int]:
    return [int(digit) for digit in str(value)]


def _is_digits(token_ids: list[int]) -> bool:
    return bool(token_ids) and all(0 <= token_id < DIGIT_COUNT for token_id in token_ids)


class FullAddEngine:
    def __init__(self, checkpoint_path: Path) -> None:
        checkpoint = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=True,
        )
        self.config = ModelConfig()
        self.model = FullAddTransformer(self.config)
        self.model.load_state_dict(checkpoint["model"])
        self.model.eval()
        self.step = int(checkpoint["step"])
        self.model_id = str(checkpoint["model_id"])
        self.lock = Lock()
        if self.model.parameter_count() != 398_848:
            raise ValueError("checkpoint architecture mismatch")

    @torch.inference_mode()
    def predict(self, left: object, right: object) -> dict[str, object]:
        left, right = validate_operands(left, right)
        prompt = [
            *HEADER_IDS,
            *_decimal_ids(left),
            FIELD_TOKEN_ID,
            *_decimal_ids(right),
            STATE_TOKEN_ID,
        ]
        current = torch.tensor([prompt], dtype=torch.long)
        generated: list[int] = []
        confidences: list[float] = []

        def generate_one() -> None:
            logits = self.model(current)[0, -1]
            probabilities = torch.softmax(logits, dim=-1)
            token_id = int(logits.argmax().item())
            generated.append(token_id)
            confidences.append(float(probabilities[token_id].item()))

        with self.lock:
            for _ in range(INTERNAL_FIXED_LENGTH):
                generate_one()
                current = torch.cat(
                    [current, torch.tensor([[generated[-1]]])],
                    dim=1,
                )

            fixed_result = generated[25:33]
            if not _is_digits(fixed_result):
                raise RuntimeError("model emitted an invalid internal state")
            result_length = len("".join(map(str, fixed_result)).lstrip("0") or "0")

            for _ in range(result_length):
                generate_one()
                current = torch.cat(
                    [current, torch.tensor([[generated[-1]]])],
                    dim=1,
                )

        result_ids = generated[INTERNAL_FIXED_LENGTH:]
        structure_valid = (
            generated[15] == STATE_TOKEN_ID
            and generated[24] == STATE_TOKEN_ID
            and generated[33] == STATE_TOKEN_ID
            and _is_digits(generated[:7])
            and generated[7] == FIELD_TOKEN_ID
            and _is_digits(generated[8:15])
            and _is_digits(generated[16:24])
            and _is_digits(generated[25:33])
            and _is_digits(result_ids)
        )
        if not structure_valid:
            raise RuntimeError("model emitted an invalid inference sequence")

        result_text = "".join(map(str, result_ids))
        result = int(result_text)
        expected = left + right
        final_confidences = confidences[INTERNAL_FIXED_LENGTH:]
        confidence = math.exp(
            sum(math.log(max(value, 1e-12)) for value in final_confidences)
            / len(final_confidences)
        )
        return {
            "left": left,
            "right": right,
            "model_result": result,
            "verifier_result": expected,
            "exact": result == expected,
            "confidence": confidence,
            "checkpoint_step": self.step,
            "model": self.model_id,
        }
