from pathlib import Path

import pytest

from multifunction_demo.model import MultiFunctionEngine, validate_request


ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = ROOT / "model/model.pt"


def test_validate_request() -> None:
    assert validate_request("square_polynomial", 14, 7) == (
        "square_polynomial",
        14,
        7,
    )
    assert validate_request("division", 14, 7) == ("division", 14, 7)


@pytest.mark.parametrize(
    ("task", "x", "y"),
    [
        ("unknown", 14, 7),
        ("division", 14, 0),
        ("division", 97, 7),
        ("division", 14, True),
    ],
)
def test_validate_request_rejects_invalid_input(
    task: str,
    x: object,
    y: object,
) -> None:
    with pytest.raises(ValueError):
        validate_request(task, x, y)


@pytest.fixture(scope="module")
def engine() -> MultiFunctionEngine:
    return MultiFunctionEngine(CHECKPOINT)


def test_checkpoint_answers_square_polynomial(
    engine: MultiFunctionEngine,
) -> None:
    prediction = engine.predict("square_polynomial", 14, 7)
    assert prediction["intermediate"] == 2
    assert prediction["result"] == 9
    assert prediction["checkpoint_step"] == 16_600


def test_checkpoint_answers_modular_division(
    engine: MultiFunctionEngine,
) -> None:
    prediction = engine.predict("division", 14, 7)
    assert prediction["intermediate"] == 14
    assert prediction["result"] == 2
    assert prediction["checkpoint_step"] == 16_600
