from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class UserCreate(BaseModel):
	name: str
	email: str

class User(BaseModel):
	id: int
	name: str
	email: str
	created_at: datetime

class EmbeddingRequest(BaseModel):
	texts: List[str]
	model: Optional[str] = "text-embedding-3-small"


class EmbeddingResponse(BaseModel):
	vectors: List[List[float]]
	count: int

class EventCreate(BaseModel):
	title: str
	description: str | None = None
	community: str | None = None
	event_time: datetime | None = None

class Event(BaseModel):
    id: int
    title: str
    description: str | None = None
    community: str | None = None
    event_time: datetime | None = None
    created_at: datetime
