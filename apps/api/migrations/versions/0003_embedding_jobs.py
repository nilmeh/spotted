from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003_embedding_jobs"
down_revision = "0002_location_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS embedding_jobs (
			id SERIAL PRIMARY KEY,
			kind TEXT NOT NULL CHECK (kind IN ('user','event')),
			target_id INTEGER NOT NULL,
			status TEXT NOT NULL CHECK (status IN ('pending','processing','done','error')) DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			last_error TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
		"""
	)
	op.execute("CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status_created ON embedding_jobs (status, created_at)")


def downgrade() -> None:
	op.execute("DROP INDEX IF EXISTS idx_embedding_jobs_status_created")
	op.execute("DROP TABLE IF EXISTS embedding_jobs")


