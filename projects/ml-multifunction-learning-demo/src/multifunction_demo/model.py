"""Minimal inference runtime for the packaged multi-function checkpoint."""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import torch
from torch import Tensor, nn


EOS_ID = 0
EQUALS_ID = 1
SQUARE_POLYNOMIAL_ID = 4
DIVISION_ID = 10
NUMBER_OFFSET = 22
MODULUS = 97
VOCABULARY_SIZE = 239


@dataclass(frozen=True, slots=True)
class ModelConfig:
    number_of_layers: int = 2
    number_of_heads: int = 4
    model_dimension: int = 128
    feed_forward_multiplier: int = 4
    max_context_length: int = 50


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
        self.attention = MultiHeadAttention(
            dimension,
            config.number_of_heads,
        )
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


class MultiFunctionTransformer(nn.Module):
    def __init__(
        self,
        config: ModelConfig,
        vocabulary_size: int = VOCABULARY_SIZE,
    ) -> None:
        super().__init__()
        self.config = config
        self.embedding = nn.Embedding(vocabulary_size, config.model_dimension)
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
            vocabulary_size,
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


def _number_id(value: int) -> int:
    return NUMBER_OFFSET + value


def _decode_number(token_id: int) -> int | None:
    value = token_id - NUMBER_OFFSET
    return value if 0 <= value < MODULUS else None


def validate_request(task: str, x: object, y: object) -> tuple[str, int, int]:
    if task not in {"square_polynomial", "division"}:
        raise ValueError("task must be square_polynomial or division")
    if isinstance(x, bool) or not isinstance(x, int):
        raise ValueError("x must be an integer")
    if isinstance(y, bool) or not isinstance(y, int):
        raise ValueError("y must be an integer")
    if not 0 <= x < MODULUS or not 0 <= y < MODULUS:
        raise ValueError("x and y must be integers from 0 through 96")
    if task == "division" and y == 0:
        raise ValueError("division requires y from 1 through 96")
    return task, x, y


class MultiFunctionEngine:
    def __init__(self, checkpoint_path: Path) -> None:
        checkpoint = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=True,
        )
        self.config = ModelConfig()
        self.model = MultiFunctionTransformer(self.config)
        self.model.load_state_dict(checkpoint["model"])
        self.model.eval()
        self.step = int(checkpoint["step"])
        self.lock = Lock()

    @torch.inference_mode()
    def predict(self, task: str, x: object, y: object) -> dict[str, object]:
        task, left, right = validate_request(task, x, y)
        task_id = (
            SQUARE_POLYNOMIAL_ID
            if task == "square_polynomial"
            else DIVISION_ID
        )
        tokens = [
            EOS_ID,
            _number_id(left),
            task_id,
            _number_id(right),
            EQUALS_ID,
        ]
        generated: list[int] = []
        confidences: list[float] = []
        with self.lock:
            for _ in range(3):
                token_ids = torch.tensor([tokens + generated], dtype=torch.long)
                logits = self.model(token_ids)[0, -1]
                probabilities = torch.softmax(logits, dim=-1)
                predicted_id = int(logits.argmax().item())
                generated.append(predicted_id)
                confidences.append(float(probabilities[predicted_id].item()))

        intermediate = _decode_number(generated[0])
        result = _decode_number(generated[1])
        completed = generated[2] == EOS_ID
        if intermediate is None or result is None or not completed:
            raise RuntimeError("model emitted an invalid inference trace")
        return {
            "task": task,
            "x": left,
            "y": right,
            "intermediate": intermediate,
            "result": result,
            "completed": completed,
            "confidence": min(confidences),
            "checkpoint_step": self.step,
        }
