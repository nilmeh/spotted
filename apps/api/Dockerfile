FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /workspace/apps/api

# System deps (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /workspace/apps/api/requirements.txt
RUN pip install --upgrade pip && pip install -r /workspace/apps/api/requirements.txt

# App source mounted at runtime via compose volumes; copy minimal to satisfy module import if needed
COPY apps/api/app /workspace/apps/api/app
COPY apps/api/alembic.ini /workspace/apps/api/alembic.ini
COPY apps/api/migrations /workspace/apps/api/migrations

EXPOSE 8000


