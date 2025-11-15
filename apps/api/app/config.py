from functools import lru_cache
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from typing import Optional

load_dotenv()


class Settings(BaseModel):
	openai_api_key: str
	database_url: str
	admin_token: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
	return Settings(
		openai_api_key=os.getenv("OPENAI_API_KEY", ""),
		database_url=os.getenv(
			"DATABASE_URL",
			"postgresql+psycopg://postgres:postgres@localhost:5432/spotted",
		),
		admin_token=os.getenv("ADMIN_TOKEN"),
	)


