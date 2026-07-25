import torch

from grokking_reproduction.experiment import (
    ArithmeticVocabulary,
    ExperimentConfig,
    GrokkingTransformer,
    answer_loss_and_accuracy,
    make_operation_split,
)


def test_complete_deterministic_disjoint_split() -> None:
    config = ExperimentConfig()
    vocabulary = ArithmeticVocabulary()
    first = make_operation_split(config, vocabulary, "multiplication")
    second = make_operation_split(config, vocabulary, "multiplication")

    assert len(first.train) == 4704
    assert len(first.validation) == 4705
    assert set(first.train_pairs).isdisjoint(first.validation_pairs)
    assert len(set(first.train_pairs) | set(first.validation_pairs)) == 97 * 97
    assert first.digest == second.digest
    assert torch.equal(first.train, second.train)
    assert torch.equal(first.validation, second.validation)


def test_multiplication_oracle_covers_rows() -> None:
    config = ExperimentConfig()
    vocabulary = ArithmeticVocabulary()
    split = make_operation_split(config, vocabulary, "multiplication")

    for row in torch.cat([split.train[:128], split.validation[:128]]):
        tokens = [vocabulary.tokens[int(token_id)] for token_id in row]
        left = int(tokens[1])
        right = int(tokens[3])
        assert tokens[2] == "*"
        assert tokens[4] == "="
        assert int(tokens[5]) == (left * right) % 97


def test_addition_and_multiplication_use_identical_pairs() -> None:
    config = ExperimentConfig()
    vocabulary = ArithmeticVocabulary()
    addition = make_operation_split(config, vocabulary, "addition")
    multiplication = make_operation_split(
        config,
        vocabulary,
        "multiplication",
    )

    assert addition.train_pairs == multiplication.train_pairs
    assert addition.validation_pairs == multiplication.validation_pairs
    assert addition.digest == multiplication.digest


def test_reference_vocabulary_and_parameter_count() -> None:
    config = ExperimentConfig()
    vocabulary = ArithmeticVocabulary()
    model = GrokkingTransformer(config, len(vocabulary))

    assert len(vocabulary) == 239
    assert model.non_embedding_parameter_count() == 394_240
    assert model.parameter_count() == 455_424


def test_loss_is_scalar_and_accuracy_is_bounded() -> None:
    config = ExperimentConfig()
    vocabulary = ArithmeticVocabulary()
    split = make_operation_split(config, vocabulary, "multiplication")
    model = GrokkingTransformer(config, len(vocabulary))

    loss, accuracy = answer_loss_and_accuracy(
        model,
        split.train[:4],
        vocabulary.token_to_id["="],
    )

    assert loss.ndim == 0
    assert 0.0 <= float(accuracy) <= 100.0
