"""Reference-style grokking model and modular-arithmetic dataset.

The architecture follows the public OpenAI grokking baseline described by
Power et al. The implementation is dependency-light and written directly in
PyTorch so the complete experiment remains inspectable.
"""

from __future__ import annotations

import hashlib
import itertools
import math
from dataclasses import asdict, dataclass
from typing import Callable

import numpy as np
import torch
from torch import Tensor, nn
from torch.nn import functional as F


EOS_TOKEN = "<|eos|>"
EQUALS_TOKEN = "="
MODULUS = 97
OPERATORS = (
    "+",
    "-",
    "*",
    "/",
    "**2+",
    "**3+",
    "x**2+y**2_mod_97",
    "x**2+y**2+x*y_mod_97",
    "x**2+y**2+x*y+x_mod_97",
    "x**3+x*y_mod_97",
    "x**3+x*y**2+y_mod_97",
    "(x._value//y)if(y._value%2==1)else(x-y)_mod_97",
    "s5",
    "s5conj",
    "s5aba",
    "+*",
    "+-",
    "sort",
    "reverse",
    "copy",
)


@dataclass(frozen=True, slots=True)
class ExperimentConfig:
    modulus: int = MODULUS
    train_fraction: float = 0.5
    split_seed: int = 0
    model_seed: int = 0
    number_of_layers: int = 2
    number_of_heads: int = 4
    model_dimension: int = 128
    feed_forward_multiplier: int = 4
    max_context_length: int = 50
    learning_rate: float = 1e-3
    weight_decay: float = 1.0
    beta1: float = 0.9
    beta2: float = 0.98
    epsilon: float = 1e-8
    warmup_steps: int = 10
    batch_size: int = 512

    def __post_init__(self) -> None:
        if self.modulus != MODULUS:
            raise ValueError("the reference experiment fixes modulus at 97")
        if not 0.0 < self.train_fraction < 1.0:
            raise ValueError("train_fraction must be between zero and one")
        if self.model_dimension != 128:
            raise ValueError("the reference experiment fixes width at 128")
        if self.number_of_layers != 2:
            raise ValueError("the reference experiment fixes two layers")
        if self.number_of_heads != 4:
            raise ValueError("the reference experiment fixes four heads")
        if self.model_dimension % self.number_of_heads:
            raise ValueError("model dimension must divide evenly across heads")

    def to_dict(self) -> dict[str, int | float]:
        return asdict(self)


class ArithmeticVocabulary:
    """The shared 239-token inventory used by the reference implementation."""

    def __init__(self) -> None:
        permutations = [
            "".join(map(str, permutation))
            for permutation in itertools.permutations(range(5))
        ]
        self.tokens = (
            [EOS_TOKEN, EQUALS_TOKEN]
            + sorted(OPERATORS)
            + [str(value) for value in range(MODULUS)]
            + permutations
        )
        self.token_to_id = {
            token: token_id for token_id, token in enumerate(self.tokens)
        }

    def __len__(self) -> int:
        return len(self.tokens)

    def encode(self, tokens: list[str]) -> Tensor:
        return torch.tensor(
            [self.token_to_id[token] for token in tokens],
            dtype=torch.long,
        )


@dataclass(frozen=True, slots=True)
class ArithmeticSplit:
    train: Tensor
    validation: Tensor
    train_pairs: tuple[tuple[int, int], ...]
    validation_pairs: tuple[tuple[int, int], ...]
    digest: str


def make_operation_split(
    config: ExperimentConfig,
    vocabulary: ArithmeticVocabulary,
    operation_name: str,
) -> ArithmeticSplit:
    """Generate and split the complete 97 x 97 operation table."""

    operations: dict[str, tuple[str, Callable[[int, int], int]]] = {
        "addition": ("+", lambda left, right: (left + right) % config.modulus),
        "multiplication": (
            "*",
            lambda left, right: (left * right) % config.modulus,
        ),
    }
    if operation_name not in operations:
        raise ValueError(f"unsupported operation: {operation_name!r}")
    operator, operation = operations[operation_name]

    equations: list[tuple[tuple[int, int], Tensor]] = []
    for left in range(config.modulus):
        for right in range(config.modulus):
            result = operation(left, right)
            tokens = [
                EOS_TOKEN,
                str(left),
                operator,
                str(right),
                EQUALS_TOKEN,
                str(result),
                EOS_TOKEN,
            ]
            equations.append(((left, right), vocabulary.encode(tokens)))

    permutation = np.random.RandomState(config.split_seed).permutation(
        len(equations)
    )
    shuffled = [equations[int(index)] for index in permutation]
    train_size = round(len(shuffled) * config.train_fraction)
    train_rows = shuffled[:train_size]
    validation_rows = shuffled[train_size:]
    digest_source = "\n".join(
        f"{left},{right}" for (left, right), _ in shuffled
    ).encode("ascii")
    return ArithmeticSplit(
        train=torch.stack([row for _, row in train_rows]),
        validation=torch.stack([row for _, row in validation_rows]),
        train_pairs=tuple(pair for pair, _ in train_rows),
        validation_pairs=tuple(pair for pair, _ in validation_rows),
        digest=hashlib.sha256(digest_source).hexdigest(),
    )


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
    def __init__(self, config: ExperimentConfig) -> None:
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


class GrokkingTransformer(nn.Module):
    """Two-layer decoder-only Transformer used by the reproduction."""

    def __init__(
        self,
        config: ExperimentConfig,
        vocabulary_size: int,
    ) -> None:
        super().__init__()
        self.config = config
        self.embedding = nn.Embedding(
            vocabulary_size,
            config.model_dimension,
        )
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

    def non_embedding_parameter_count(self) -> int:
        excluded = self.embedding.weight.numel() + self.output.weight.numel()
        return self.parameter_count() - excluded


def answer_loss_and_accuracy(
    model: GrokkingTransformer,
    equations: Tensor,
    equals_token_id: int,
) -> tuple[Tensor, Tensor]:
    """Measure only the answer token and trailing EOS token."""

    inputs = equations[:, :-1]
    targets = equations[:, 1:]
    logits = model(inputs)
    equals_positions = torch.nonzero(
        targets[0] == equals_token_id,
        as_tuple=False,
    )
    if equals_positions.numel() != 1:
        raise ValueError("each equation must contain exactly one equals token")
    equals_position = int(equals_positions.item())
    answer_targets = targets[:, equals_position + 1 :]
    answer_logits = logits[:, equals_position + 1 :, :]
    loss = F.cross_entropy(
        answer_logits.reshape(-1, answer_logits.size(-1)),
        answer_targets.reshape(-1),
    )
    predictions = answer_logits.argmax(dim=-1)
    accuracy = (
        (predictions == answer_targets).all(dim=-1).float().mean() * 100.0
    )
    return loss, accuracy
