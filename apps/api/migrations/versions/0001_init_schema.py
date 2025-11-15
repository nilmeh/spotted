from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_init_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
	# Extensions
	op.execute("CREATE EXTENSION IF NOT EXISTS vector")
	op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")  # for gen_random_uuid if needed

	# users
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT UNIQUE,
			preferences TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
		"""
	)

	# events
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS events (
			id SERIAL PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			community TEXT,
			event_time TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
		"""
	)
	op.execute("CREATE INDEX IF NOT EXISTS idx_events_event_time ON events (event_time)")

	# interactions
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS interactions (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
			direction TEXT NOT NULL CHECK (direction IN ('left','right')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
		"""
	)
	op.execute(
		"CREATE INDEX IF NOT EXISTS idx_interactions_user_created ON interactions (user_id, created_at)"
	)

	# embeddings
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS user_embeddings (
			user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			embedding vector(1536) NOT NULL
		)
		"""
	)
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS event_embeddings (
			event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
			embedding vector(1536) NOT NULL
		)
		"""
	)

	# ANN indexes (ivfflat)
	op.execute(
		"CREATE INDEX IF NOT EXISTS idx_user_embeddings_vector ON user_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
	)
	op.execute(
		"CREATE INDEX IF NOT EXISTS idx_event_embeddings_vector ON event_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
	)


def downgrade() -> None:
	op.execute("DROP INDEX IF EXISTS idx_event_embeddings_vector")
	op.execute("DROP INDEX IF EXISTS idx_user_embeddings_vector")
	op.execute("DROP TABLE IF EXISTS event_embeddings")
	op.execute("DROP TABLE IF EXISTS user_embeddings")
	op.execute("DROP INDEX IF EXISTS idx_interactions_user_created")
	op.execute("DROP TABLE IF EXISTS interactions")
	op.execute("DROP INDEX IF EXISTS idx_events_event_time")
	op.execute("DROP TABLE IF EXISTS events")
	op.execute("DROP TABLE IF EXISTS users")


