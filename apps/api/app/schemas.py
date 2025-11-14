from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class UserCreate(BaseModel):
	name: str
	email: str
	preferences: str = Field(..., min_length=5, max_length=300).strip()

class User(BaseModel):
	id: int
	name: str
	email: str
	created_at: datetime
	
class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    preferences: str | None = Field(None, max_length=300)

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

class SwipeCreate(BaseModel):
    user_id: int
    event_id: int
    direction: str  # "left" or "right"

class EventEmbedding(BaseModel):
	event_id: int
	embedding: List[float]