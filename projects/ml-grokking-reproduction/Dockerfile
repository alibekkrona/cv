FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml README.md ./
COPY src/ src/
COPY tests/ tests/
COPY results/ results/

RUN pip install --no-cache-dir "numpy>=1.26,<3" "pytest>=8,<9" \
    && pip install --no-cache-dir \
      --index-url https://download.pytorch.org/whl/cpu \
      "torch>=2.2,<3" \
    && pip install --no-cache-dir --no-deps .

CMD ["python", "-m", "pytest", "-q"]
