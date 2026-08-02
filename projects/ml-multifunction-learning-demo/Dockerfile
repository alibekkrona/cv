FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src/ src/
COPY web/ web/
COPY model/ model/
COPY tests/ tests/

RUN pip install --no-cache-dir "pytest>=8,<9" \
    && pip install --no-cache-dir \
      --index-url https://download.pytorch.org/whl/cpu \
      "torch>=2.2,<3" \
    && pip install --no-cache-dir --no-deps .

EXPOSE 8080

CMD ["python", "-m", "multifunction_demo", "--host", "0.0.0.0", "--port", "8080"]
