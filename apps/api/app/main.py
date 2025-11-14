from fastapi import FastAPI
from sqlalchemy import text
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import init_db_extension, SessionLocal
from .schemas import (
    UserCreate,
    User,
    EmbeddingRequest,
    EmbeddingResponse,
    EventCreate,
    Event,
    SwipeCreate,
    UserUpdate
)
from .embeddings import embed_texts

app = FastAPI(title="Spotted API", version="0.1.0")


def normalize_vector(v: list[float]) -> list[float]:
    norm = sum(x * x for x in v) ** 0.5
    if norm == 0:
        return v
    return [x / norm for x in v]


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


@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: int):
    db = next(get_db())
    row = db.execute(
        text("SELECT id, name, email, preferences, created_at FROM users WHERE id = :id"),
        {"id": user_id}
    ).mappings().first()
    return row

@app.post("/users", response_model=User)
def create_user(user: UserCreate):
    db = next(get_db())

    row = db.execute(
        text("""
            INSERT INTO users (name, email, preferences)
            VALUES (:name, :email, :preferences)
            RETURNING id, name, email, preferences, created_at
        """),
        user.model_dump()
    ).mappings().first()

    vector = embed_texts([user.preferences])[0]

    db.execute(
        text("""
            INSERT INTO user_embeddings (user_id, embedding)
            VALUES (:uid, :embedding)
        """),
        {"uid": row["id"], "embedding": vector}
    )

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
    
    event_id = row["id"]
    
    text_to_embed = f"{row['title']}. {row['description'] or ''}".strip()    
    vector = embed_texts([text_to_embed])[0]

    db.execute(
        text("""
            INSERT INTO event_embeddings (event_id, embedding)
            VALUES (:event_id, :embedding)
        """),
        {"event_id": event_id, "embedding": vector}
    )

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

    event_vec = db.execute(
        text("SELECT embedding FROM event_embeddings WHERE event_id = :eid"),
        {"eid": swipe.event_id}
    ).scalar()

    user_vec = db.execute(
        text("SELECT embedding FROM user_embeddings WHERE user_id = :uid"),
        {"uid": swipe.user_id}
    ).scalar()

    # simple update rule
    sign = 1.0 if swipe.direction == "right" else -0.25
    updated = normalize_vector([u + sign * e for u, e in zip(user_vec, event_vec)])

    db.execute(
        text("""
            UPDATE user_embeddings
            SET embedding = :embedding
            WHERE user_id = :uid
        """),
        {"uid": swipe.user_id, "embedding": updated}
    )

    db.commit()
    return row

@app.get("/recommendations")
def get_recommendations(user_id: int, limit: int = 20):
    db = next(get_db())

    user_vec = db.execute(
        text("SELECT embedding FROM user_embeddings WHERE user_id = :uid"),
        {"uid": user_id}
    ).scalar()

    if user_vec is None:
        return []

    rows = db.execute(
        text("""
            SELECT e.id, e.title, e.description, e.community, e.event_time,
                   1 - (ee.embedding <=> :user_vec) AS score
            FROM event_embeddings ee
            JOIN events e ON e.id = ee.event_id
            ORDER BY ee.embedding <=> :user_vec
            LIMIT :limit
        """),
        {"user_vec": user_vec, "limit": limit}
    ).mappings().all()

    return rows

@app.put("/users/{user_id}", response_model=User)
def update_user(user_id: int, payload: UserUpdate):
    db = next(get_db())

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}

    if not updates:
        return {"error": "No fields to update"}

    set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
    updates["id"] = user_id

    row = db.execute(
        text(f"""
            UPDATE users
            SET {set_clause}
            WHERE id = :id
            RETURNING id, name, email, preferences, created_at
        """),
        updates
    ).mappings().first()

    if payload.preferences is not None:
        vector = embed_texts([payload.preferences])[0]

        db.execute(
            text("""
                INSERT INTO user_embeddings (user_id, embedding)
                VALUES (:uid, :embedding)
                ON CONFLICT (user_id) DO UPDATE
                SET embedding = EXCLUDED.embedding
            """),
            {"uid": user_id, "embedding": vector}
        )

    db.commit()
    return row

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)