from sqlalchemy import create_engine, text, event
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from pgvector.psycopg import register_vector

# Load settings
settings = get_settings()

# Create global engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def init_db_extension():
    # Ensure pg vector connection exists
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))


@event.listens_for(engine, "connect")
def _register_vector(dbapi_connection, connection_record):
	# Ensure psycopg knows how to adapt vector[] to/from Python lists
	try:
		register_vector(dbapi_connection)
	except Exception:
		# Safe to ignore if already registered for this connection
		pass
