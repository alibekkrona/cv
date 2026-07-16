FROM node:20-bookworm-slim AS viewer-build

WORKDIR /viewer
COPY viewer/package.json viewer/package-lock.json ./
RUN npm ci
COPY viewer/ ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/api

WORKDIR /app

COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY api/ ./api/
COPY --from=viewer-build /viewer/dist ./api/viewer_dist/

RUN chmod +x ./api/start.sh

EXPOSE 8000

CMD ["sh", "./api/start.sh"]
