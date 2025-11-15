from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0004_swipe_people_actions"
down_revision = "0003_embedding_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
	# Extend interactions to support person targets and explicit actions
	op.execute("ALTER TABLE interactions ADD COLUMN IF NOT EXISTS target_type TEXT CHECK (target_type IN ('event','person'))")
	op.execute("ALTER TABLE interactions ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('save','pass','connect','open'))")
	op.execute("ALTER TABLE interactions ADD COLUMN IF NOT EXISTS target_user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE")
	op.execute("ALTER TABLE interactions ADD COLUMN IF NOT EXISTS dwell_ms INTEGER NULL")
	# Backfill existing rows as event interactions
	op.execute("UPDATE interactions SET target_type = 'event' WHERE target_type IS NULL")
	# Helper index for person connections lookups
	op.execute("CREATE INDEX IF NOT EXISTS idx_interactions_target_user ON interactions (target_user_id)")

	# Create matches table if missing (idempotent)
	op.execute(
		"""
		CREATE TABLE IF NOT EXISTS matches (
			id SERIAL PRIMARY KEY,
			user_id_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			user_id_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			CONSTRAINT uq_matches_pair UNIQUE (user_id_a, user_id_b),
			CONSTRAINT chk_matches_order CHECK (user_id_a <> user_id_b)
		)
		"""
	)


def downgrade() -> None:
	op.execute("DROP INDEX IF EXISTS idx_interactions_target_user")
	op.execute("ALTER TABLE interactions DROP COLUMN IF EXISTS dwell_ms")
	op.execute("ALTER TABLE interactions DROP COLUMN IF EXISTS target_user_id")
	op.execute("ALTER TABLE interactions DROP COLUMN IF EXISTS action")
	op.execute("ALTER TABLE interactions DROP COLUMN IF EXISTS target_type")


