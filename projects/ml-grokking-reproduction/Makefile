.PHONY: install test smoke train-add train-multiply docker-test

install:
	python3 -m pip install -e ".[dev]"

test:
	python3 -m pytest -q

smoke:
	python3 -m grokking_reproduction train --operation multiplication --steps 20 --eval-every 10 --no-checkpoint

train-add:
	python3 -m grokking_reproduction train --operation addition --steps 100000 --eval-every 100

train-multiply:
	python3 -m grokking_reproduction train --operation multiplication --steps 100000 --eval-every 100

docker-test:
	docker compose run --rm test
