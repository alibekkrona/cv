FROM node:22-alpine AS web-build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt
COPY api/ api/
COPY evidence/ evidence/
COPY firmware/ firmware/
COPY tools/ tools/
COPY --from=web-build /app/web/dist web/dist
EXPOSE 8000
CMD ["gunicorn", "--chdir", "api", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-", "app:app"]

