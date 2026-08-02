from pathlib import Path
import random

import pytest

from full_add_demo.model import FullAddEngine, MAX_OPERAND, validate_operands


ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = ROOT / "model/model.pt"


def test_validate_operands() -> None:
    assert validate_operands(0, MAX_OPERAND) == (0, MAX_OPERAND)


@pytest.mark.parametrize(
    ("left", "right"),
    [(-1, 0), (MAX_OPERAND + 1, 0), (True, 0), (0, "1")],
)
def test_validate_operands_rejects_invalid_values(
    left: object,
    right: object,
) -> None:
    with pytest.raises(ValueError):
        validate_operands(left, right)


@pytest.fixture(scope="module")
def engine() -> FullAddEngine:
    return FullAddEngine(CHECKPOINT)


def test_packaged_checkpoint_runs_greedy_inference(
    engine: FullAddEngine,
) -> None:
    generator = random.Random(20260802)
    for _ in range(8):
        left = generator.randrange(MAX_OPERAND + 1)
        right = generator.randrange(MAX_OPERAND + 1)
        prediction = engine.predict(left, right)
        assert prediction["model_result"] == left + right
        assert prediction["exact"] is True
        assert prediction["checkpoint_step"] == 126_000
