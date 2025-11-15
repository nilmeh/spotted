from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum


class UserCreate(BaseModel):
    name: str
    email: str
    preferences: str = Field(..., min_length=5, max_length=300)
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = 5.0

    @field_validator("preferences")
    def clean_preferences(cls, v):
        return v.strip()


class User(BaseModel):
    id: int
    name: str
    email: str
    preferences: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = None
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    preferences: Optional[str] = Field(None, min_length=5, max_length=300)
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = None

    @field_validator("preferences")
    def clean_preferences(cls, v):
        return v.strip() if v is not None else v


class EmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = "text-embedding-3-small"


class EmbeddingResponse(BaseModel):
    vectors: List[List[float]]
    count: int


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    community: Optional[str] = None
    event_time: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_name: Optional[str] = None
    status: Optional[str] = None  # default 'approved' if admin; else 'pending'


class Event(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    community: Optional[str] = None
    event_time: Optional[datetime] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_name: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime

class EventEmbedding(BaseModel):
    event_id: int
    embedding: List[float]


# New swipe models (explicit actions)
class EventSwipeAction(str, Enum):
    save = "save"
    pass_ = "pass"
    rsvp = "rsvp"


class PersonSwipeAction(str, Enum):
    connect = "connect"
    pass_ = "pass"


class EventSwipeCreate(BaseModel):
    user_id: int
    event_id: int
    action: EventSwipeAction
    dwell_ms: Optional[int] = None


class PersonSwipeCreate(BaseModel):
    user_id: int
    target_user_id: int
    action: PersonSwipeAction


class MapEventPoint(BaseModel):
    id: int
    title: str
    lat: float
    lng: float
    weight: float

