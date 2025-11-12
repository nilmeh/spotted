from fastapi import FastAPI
from .config import Settings, get_settings
from .db import init_db_extension

app = FastAPI(title="CampusLink API", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
	settings = get_settings()
	init_db_extension(settings.database_url)


@app.get("/health")
def health() -> dict:
	return {"status": "ok"}


