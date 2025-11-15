import time
from contextlib import contextmanager
from sqlalchemy import text
from app.db import SessionLocal
from app.embeddings import embed_texts


@contextmanager
def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def claim_job(db):
	# Claim a single pending job using SKIP LOCKED to avoid contention
	job = db.execute(
		text(
			"""
			SELECT id, kind, target_id, attempts
			FROM embedding_jobs
			WHERE status = 'pending'
			ORDER BY created_at
			FOR UPDATE SKIP LOCKED
			LIMIT 1
			"""
		)
	).mappings().first()
	if not job:
		return None
	db.execute(
		text(
			"""
			UPDATE embedding_jobs
			SET status='processing', attempts = attempts + 1, updated_at = now()
			WHERE id = :id
			"""
		),
		{"id": job["id"]},
	)
	return job


def process_job(db, job):
	kind = job["kind"]
	tid = job["target_id"]
	try:
		if kind == "user":
			row = db.execute(
				text("SELECT preferences FROM users WHERE id = :id"),
				{"id": tid},
			).mappings().first()
			if not row:
				raise RuntimeError("user not found")
			vec = embed_texts([row["preferences"]])[0]
			db.execute(
				text(
					"""
					INSERT INTO user_embeddings (user_id, embedding)
					VALUES (:id, :emb)
					ON CONFLICT (user_id) DO UPDATE SET embedding = EXCLUDED.embedding
					"""
				),
				{"id": tid, "emb": vec},
			)
		elif kind == "event":
			row = db.execute(
				text("SELECT title, description FROM events WHERE id = :id"),
				{"id": tid},
			).mappings().first()
			if not row:
				raise RuntimeError("event not found")
			txt = f"{row['title']}. {row['description'] or ''}".strip()
			vec = embed_texts([txt])[0]
			db.execute(
				text(
					"""
					INSERT INTO event_embeddings (event_id, embedding)
					VALUES (:id, :emb)
					ON CONFLICT (event_id) DO UPDATE SET embedding = EXCLUDED.embedding
					"""
				),
				{"id": tid, "emb": vec},
			)
		else:
			raise RuntimeError(f"unknown kind {kind}")

		db.execute(
			text(
				"""
				UPDATE embedding_jobs
				SET status = 'done', updated_at = now()
				WHERE id = :id
				"""
			),
			{"id": job["id"]},
		)
	except Exception as e:
		db.execute(
			text(
				"""
				UPDATE embedding_jobs
				SET status = 'error', last_error = :err, updated_at = now()
				WHERE id = :id
				"""
			),
			{"id": job["id"], "err": str(e)},
		)
		raise


def main():
	poll_seconds = 2
	while True:
		with get_db() as db:
			tx = db.begin()
			try:
				job = claim_job(db)
				if not job:
					tx.commit()
					time.sleep(poll_seconds)
					continue
				db.flush()
				tx.commit()

				# process outside of claim transaction
				tx2 = db.begin()
				try:
					process_job(db, job)
					tx2.commit()
				except Exception:
					tx2.rollback()
			except Exception:
				tx.rollback()
				time.sleep(poll_seconds)


if __name__ == "__main__":
	main()


