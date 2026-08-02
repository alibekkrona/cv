.PHONY: install test run docker-up docker-down docker-test

install:
	python3 -m pip install -e ".[dev]"

test:
	python3 -m pytest -q

run:
	python3 -m full_add_demo

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-test:
	docker compose --profile test run --rm test
