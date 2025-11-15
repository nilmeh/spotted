from typing import List
from fastapi import FastAPI
from .config import Settings, get_settings
from .db import init_db_extension
from .schemas import EmbeddingRequest, EmbeddingResponse, MapEventPoint
from .embeddings import embed_texts

app = FastAPI(title="CampusLink API", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
	settings = get_settings()
	init_db_extension(settings.database_url)


@app.get("/health")
def health() -> dict:
	return {"status": "ok"}


@app.post("/embed", response_model=EmbeddingResponse)
def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
	vectors = embed_texts(payload.texts, model=payload.model)
	return EmbeddingResponse(vectors=vectors, count=len(vectors))


@app.get("/map/events", response_model=List[MapEventPoint])
def get_map_events(
	lat: float = 34.0689,
	lng: float = -118.4452,
	radius_km: float = 5.0,
) -> List[MapEventPoint]:
	# TODO: replace with real query once events/interactions are stored.
	# For now return static sample points near UCLA with different weights.
	sample = [
		MapEventPoint(
			id=1,
			title="UCLA Hack Night",
			lat=34.069,
			lng=-118.443,
			weight=5.0,
		),
		MapEventPoint(
			id=2,
			title="Coffee Chats @ Kerckhoff",
			lat=34.0702,
			lng=-118.4435,
			weight=3.0,
		),
		MapEventPoint(
			id=3,
			title="Sunset Run",
			lat=34.071,
			lng=-118.446,
			weight=1.5,
		),
	]
	return sample

