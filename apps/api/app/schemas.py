from typing import List, Optional
from pydantic import BaseModel

class UserCreate(BaseModel):
	name: str
	email: str

class User(BaseModel):
	id: int
	name: str
	email: str
	created_at: str

class EmbeddingRequest(BaseModel):
	texts: List[str]
	model: Optional[str] = "text-embedding-3-small"


class EmbeddingResponse(BaseModel):
	vectors: List[List[float]]
	count: int


