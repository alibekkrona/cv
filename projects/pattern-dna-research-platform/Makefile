.PHONY: up down reset logs smoke

up:
	docker compose up --build -d

down:
	docker compose down

reset:
	docker compose down -v
	docker compose up --build -d

logs:
	docker compose logs -f --tail=200 app

smoke:
	APP_BASE_URL=http://localhost:3200 python3 api/smoke.py
