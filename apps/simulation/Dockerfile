FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5001
ENV GUNICORN_WORKERS=2
ENV GUNICORN_TIMEOUT=120

COPY pyproject.toml README.md ./
COPY src ./src

RUN pip install --no-cache-dir .

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import os, urllib.request; port = os.getenv('PORT', '5001'); urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=3).read()"

CMD ["sh", "-c", "gunicorn meridian_simulation.wsgi:app --bind 0.0.0.0:${PORT:-5001} --workers ${GUNICORN_WORKERS:-2} --timeout ${GUNICORN_TIMEOUT:-120}"]
