from fastapi import FastAPI, Depends
from sqlalchemy import text
from .config import Settings, get_settings
from .db import init_db_extension, SessionLocal
from .schemas import EmbeddingRequest, EmbeddingResponse, UserCreate, User
from .embeddings import embed_texts

app = FastAPI(title="CampusLink API", version="0.1.0")

def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()

@app.on_event("startup")
def on_startup() -> None:
	settings = get_settings()
	init_db_extension()

@app.get("/health")
def health() -> dict:
	return {"status": "ok"}

@app.post("/embed", response_model=EmbeddingResponse)
def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
	vectors = embed_texts(payload.texts, model=payload.model)
	return EmbeddingResponse(vectors=vectors, count=len(vectors))

@app.post("/users", response_model=User)
def create_user(payload: UserCreate, db=Depends(get_db)):
    result = db.execute(
        text("""
            INSERT INTO users (name, email)
            VALUES (:name, :email)
            RETURNING id, name, email, created_at
        """),
        {"name": payload.name, "email": payload.email},
    )
    row = result.fetchone()
    return dict(row._mapping)