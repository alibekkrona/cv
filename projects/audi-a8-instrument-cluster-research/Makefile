.PHONY: up down verify analyze

up:
	docker compose up --build -d

down:
	docker compose down

verify:
	python3 api/smoke.py

analyze:
	python3 api/analyze_capture.py evidence/demo_capture.log

