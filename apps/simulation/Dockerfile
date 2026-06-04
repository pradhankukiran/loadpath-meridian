FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY pyproject.toml README.md ./
COPY src ./src

RUN pip install --no-cache-dir .

EXPOSE 5001

CMD ["gunicorn", "meridian_simulation.wsgi:app", "--bind", "0.0.0.0:5001", "--workers", "2"]
