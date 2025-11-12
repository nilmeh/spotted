from sqlalchemy import create_engine, text


def init_db_extension(database_url: str) -> None:
	engine = create_engine(database_url, pool_pre_ping=True)
	with engine.begin() as connection:
		# Ensure pgvector extension exists
		connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))


