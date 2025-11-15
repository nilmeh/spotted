from typing import List
from openai import OpenAI
from openai import APIError, RateLimitError, APITimeoutError
from .config import get_settings


def get_openai_client() -> OpenAI:
	settings = get_settings()
	return OpenAI(api_key=settings.openai_api_key)


def embed_texts(texts: List[str], model: str = "text-embedding-3-small") -> List[List[float]]:
	client = get_openai_client()
	try:
		response = client.embeddings.create(model=model, input=texts)
		return [data.embedding for data in response.data]
	except (RateLimitError, APITimeoutError, APIError) as e:
		# Let FastAPI handler return 503 or appropriate error upstream
		raise


