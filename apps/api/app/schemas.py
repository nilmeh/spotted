from typing import List, Optional
from pydantic import BaseModel


class EmbeddingRequest(BaseModel):
	texts: List[str]
	model: Optional[str] = "text-embedding-3-small"


class EmbeddingResponse(BaseModel):
	vectors: List[List[float]]
	count: int


