from sqlalchemy import text
from sqlalchemy.orm import Session


def enqueue_user_embed(db: Session, user_id: int) -> None:
	db.execute(
		text(
			"""
			INSERT INTO embedding_jobs (kind, target_id, status)
			VALUES ('user', :tid, 'pending')
			"""
		),
		{"tid": user_id},
	)


def enqueue_event_embed(db: Session, event_id: int) -> None:
	db.execute(
		text(
			"""
			INSERT INTO embedding_jobs (kind, target_id, status)
			VALUES ('event', :tid, 'pending')
			"""
		),
		{"tid": event_id},
	)


