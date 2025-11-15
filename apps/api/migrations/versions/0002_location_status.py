from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_location_status"
down_revision = "0001_init_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
	# users: location + radius
	op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION")
	op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION")
	op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5")
	op.execute("CREATE INDEX IF NOT EXISTS idx_users_lat_lng ON users (lat, lng)")
	# events: location, name, status
	op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION")
	op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION")
	op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS location_name TEXT")
	op.execute("ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved'")
	# helpful partial index for upcoming approved
	op.execute("CREATE INDEX IF NOT EXISTS idx_events_upcoming_approved ON events (event_time) WHERE status = 'approved'")


def downgrade() -> None:
	op.execute("DROP INDEX IF EXISTS idx_events_upcoming_approved")
	op.execute("ALTER TABLE events DROP COLUMN IF EXISTS status")
	op.execute("ALTER TABLE events DROP COLUMN IF EXISTS location_name")
	op.execute("ALTER TABLE events DROP COLUMN IF EXISTS lng")
	op.execute("ALTER TABLE events DROP COLUMN IF EXISTS lat")
	op.execute("DROP INDEX IF EXISTS idx_users_lat_lng")
	op.execute("ALTER TABLE users DROP COLUMN IF EXISTS radius_km")
	op.execute("ALTER TABLE users DROP COLUMN IF EXISTS lng")
	op.execute("ALTER TABLE users DROP COLUMN IF EXISTS lat")


