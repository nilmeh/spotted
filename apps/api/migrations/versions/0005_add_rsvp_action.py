from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0005_add_rsvp_action"
down_revision = "0004_swipe_people_actions"
branch_labels = None
depends_on = None


def upgrade() -> None:
	# Replace action CHECK constraint to allow 'rsvp'
	# Drop our known-named constraint if present
	op.execute("ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_action_check")
	op.execute(
		"""
		DO $$
		DECLARE cname text;
		BEGIN
			SELECT c.conname INTO cname
			FROM pg_constraint c
			JOIN pg_class t ON c.conrelid = t.oid
			WHERE t.relname = 'interactions' AND c.contype = 'c'
			  AND pg_get_constraintdef(c.oid) ILIKE '%CHECK%action%IN%';
			IF cname IS NOT NULL THEN
				EXECUTE format('ALTER TABLE interactions DROP CONSTRAINT %I', cname);
			END IF;
		END $$;
		"""
	)
	op.execute(
		"""
		ALTER TABLE interactions
		ADD CONSTRAINT interactions_action_check
		CHECK (action IN ('save','pass','connect','open','rsvp'));
		"""
	)


def downgrade() -> None:
	# Revert to original action set without 'rsvp'
	op.execute("ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_action_check")
	op.execute(
		"""
		ALTER TABLE interactions
		ADD CONSTRAINT interactions_action_check
		CHECK (action IN ('save','pass','connect','open'));
		"""
	)


