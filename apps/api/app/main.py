from fastapi import FastAPI
from sqlalchemy import text
from datetime import datetime

from .config import get_settings
from .db import init_db_extension, SessionLocal
from .schemas import (
    UserCreate,
    User,
    EmbeddingRequest,
    EmbeddingResponse,
    EventCreate,
    Event,
    SwipeCreate
)
from .embeddings import embed_texts


app = FastAPI(title="Spotted API", version="0.1.0")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    init_db_extension()  # creates pgvector extension if missing


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/embed", response_model=EmbeddingResponse)
def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
    vectors = embed_texts(payload.texts, model=payload.model)
    return EmbeddingResponse(vectors=vectors, count=len(vectors))


@app.post("/users", response_model=User)
def create_user(user: UserCreate):
    db = next(get_db())

    row = db.execute(
        text("""
            INSERT INTO users (name, email)
            VALUES (:name, :email)
            RETURNING id, name, email, created_at
        """),
        user.model_dump()
    ).mappings().first()

    db.commit()
    return row


@app.post("/events", response_model=Event)
def create_event(event: EventCreate):
    db = next(get_db())

    row = db.execute(
        text("""
            INSERT INTO events (title, description, community, event_time)
            VALUES (:title, :description, :community, :event_time)
            RETURNING id, title, description, community, event_time, created_at
        """),
        event.model_dump()
    ).mappings().first()

    db.commit()
    return row

@app.post("/swipe")
def create_swipe(swipe: SwipeCreate):
    db = next(get_db())

    row = db.execute(
        text("""
            INSERT INTO interactions (user_id, event_id, direction)
            VALUES (:user_id, :event_id, :direction)
            RETURNING id, user_id, event_id, direction, created_at
        """),
        swipe.model_dump()
    ).mappings().first()

    db.commit()
    return row