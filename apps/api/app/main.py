from fastapi import FastAPI, Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import math
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import init_db_extension, SessionLocal
from .schemas import (
	UserCreate,
	User,
	EmbeddingRequest,
	EmbeddingResponse,
	EventCreate,
	Event,
	SwipeCreate,
	UserUpdate,
	SwipeDirection,
	EventSwipeCreate,
	PersonSwipeCreate,
)
from .embeddings import embed_texts
from .jobs import enqueue_user_embed, enqueue_event_embed

app = FastAPI(title="Spotted API", version="0.1.0")


def normalize_vector(v: list[float]) -> list[float]:
    norm = sum(x * x for x in v) ** 0.5
    if norm == 0:
        return v
    return [x / norm for x in v]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    init_db_extension()  # creates pgvector extension if missing


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/embed", response_model=EmbeddingResponse)
def create_embeddings(
	payload: EmbeddingRequest,
	x_admin_token: str | None = Header(default=None, convert_underscores=False),
) -> EmbeddingResponse:
	settings = get_settings()
	if not settings.admin_token or x_admin_token != settings.admin_token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
	vectors = embed_texts(payload.texts, model=payload.model)
	return EmbeddingResponse(vectors=vectors, count=len(vectors))


@app.get("/users/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
	row = db.execute(
		text("SELECT id, name, email, preferences, lat, lng, radius_km, created_at FROM users WHERE id = :id"),
		{"id": user_id}
	).mappings().first()
	return row

@app.post("/users", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
	payload = user.model_dump()
	row = db.execute(
		text("""
			INSERT INTO users (name, email, preferences, lat, lng, radius_km)
			VALUES (:name, :email, :preferences, :lat, :lng, :radius_km)
			RETURNING id, name, email, preferences, lat, lng, radius_km, created_at
		"""),
		payload
	).mappings().first()

	vector = embed_texts([user.preferences])[0]

	db.execute(
		text("""
			INSERT INTO user_embeddings (user_id, embedding)
			VALUES (:uid, :embedding)
		"""),
		{"uid": row["id"], "embedding": vector}
	)
	# also enqueue a background refresh
	enqueue_user_embed(db, row["id"])

	db.commit()
	return row


@app.post("/events", response_model=Event)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
	payload = event.model_dump()
	if not payload.get("status"):
		payload["status"] = "approved"
	row = db.execute(
		text("""
			INSERT INTO events (title, description, community, event_time, lat, lng, location_name, status)
			VALUES (:title, :description, :community, :event_time, :lat, :lng, :location_name, :status)
			RETURNING id, title, description, community, event_time, lat, lng, location_name, status, created_at
		"""),
		payload
	).mappings().first()
	
	event_id = row["id"]
	
	text_to_embed = f"{row['title']}. {row['description'] or ''}".strip()	
	vector = embed_texts([text_to_embed])[0]

	db.execute(
		text("""
			INSERT INTO event_embeddings (event_id, embedding)
			VALUES (:event_id, :embedding)
		"""),
		{"event_id": event_id, "embedding": vector}
	)
	# also enqueue a background refresh
	enqueue_event_embed(db, event_id)

	db.commit()
	return row


@app.post("/swipe")
def create_swipe(swipe: SwipeCreate, db: Session = Depends(get_db)):
	row = db.execute(
		text("""
			INSERT INTO interactions (user_id, event_id, direction)
			VALUES (:user_id, :event_id, :direction)
			RETURNING id, user_id, event_id, direction, created_at
		"""),
		{"user_id": swipe.user_id, "event_id": swipe.event_id, "direction": swipe.direction.value}
	).mappings().first()

	event_vec = db.execute(
		text("SELECT embedding FROM event_embeddings WHERE event_id = :eid"),
		{"eid": swipe.event_id}
	).scalar()

	user_vec = db.execute(
		text("SELECT embedding FROM user_embeddings WHERE user_id = :uid"),
		{"uid": swipe.user_id}
	).scalar()

	# simple update rule
	sign = 1.0 if swipe.direction == SwipeDirection.right else -0.25
	updated = normalize_vector([u + sign * e for u, e in zip(user_vec, event_vec)])

	db.execute(
		text("""
			UPDATE user_embeddings
			SET embedding = :embedding
			WHERE user_id = :uid
		"""),
		{"uid": swipe.user_id, "embedding": updated}
	)

	db.commit()
	return row


@app.post("/swipe/event")
def swipe_event(payload: EventSwipeCreate, db: Session = Depends(get_db)):
	# Log interaction with explicit action and target_type='event'
	row = db.execute(
		text("""
			INSERT INTO interactions (user_id, event_id, target_type, action, dwell_ms, direction)
			VALUES (:uid, :eid, 'event', :action, :dwell, :direction)
			RETURNING id, user_id, event_id, action, target_type, created_at
		"""),
		{
			"uid": payload.user_id,
			"eid": payload.event_id,
			"action": ("rsvp" if payload.action.value == "rsvp" else ("save" if payload.action.value == "save" else "pass")),
			"dwell": payload.dwell_ms,
			"direction": "right" if payload.action.value in ("save", "rsvp") else "left",
		}
	).mappings().first()

	# Update user embedding signal
	event_vec = db.execute(
		text("SELECT embedding FROM event_embeddings WHERE event_id = :eid"),
		{"eid": payload.event_id}
	).scalar()
	user_vec = db.execute(
		text("SELECT embedding FROM user_embeddings WHERE user_id = :uid"),
		{"uid": payload.user_id}
	).scalar()
	if event_vec and user_vec:
		# Stronger positive signal for RSVP than Save
		sign = 2.0 if payload.action.value == "rsvp" else (1.0 if payload.action.value == "save" else -0.25)
		updated = normalize_vector([u + sign * e for u, e in zip(user_vec, event_vec)])
		db.execute(
			text("""
				UPDATE user_embeddings SET embedding = :embedding WHERE user_id = :uid
			"""),
			{"uid": payload.user_id, "embedding": updated}
		)

	db.commit()
	return row


@app.post("/swipe/person")
def swipe_person(payload: PersonSwipeCreate, db: Session = Depends(get_db)):
	# Log interaction for person
	row = db.execute(
		text("""
			INSERT INTO interactions (user_id, target_user_id, target_type, action, direction)
			VALUES (:uid, :tid, 'person', :action, :direction)
			RETURNING id, user_id, target_user_id, action, target_type, created_at
		"""),
		{
			"uid": payload.user_id,
			"tid": payload.target_user_id,
			"action": "connect" if payload.action.value == "connect" else "pass",
			"direction": "right" if payload.action.value == "connect" else "left",
		}
	).mappings().first()

	match_created = False
	if payload.action.value == "connect":
		# Check reciprocal connect
		other = db.execute(
			text("""
				SELECT 1 FROM interactions
				WHERE user_id = :tid AND target_user_id = :uid
				  AND target_type = 'person' AND action = 'connect'
				LIMIT 1
			"""),
			{"uid": payload.user_id, "tid": payload.target_user_id}
		).scalar()
		if other:
			# Create match in canonical order
			a = min(payload.user_id, payload.target_user_id)
			b = max(payload.user_id, payload.target_user_id)
			db.execute(
				text("""
					INSERT INTO matches (user_id_a, user_id_b)
					VALUES (:a, :b)
					ON CONFLICT (user_id_a, user_id_b) DO NOTHING
				"""),
				{"a": a, "b": b}
			)
			match_created = True

	db.commit()
	return {"interaction": row, "match_created": match_created}

@app.get("/recommendations")
def get_recommendations(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
	user_vec = db.execute(
		text("SELECT embedding FROM user_embeddings WHERE user_id = :uid"),
		{"uid": user_id}
	).scalar()

	if user_vec is None:
		return []

	user_row = db.execute(
		text("SELECT lat, lng, COALESCE(radius_km, 5) AS radius_km FROM users WHERE id = :uid"),
		{"uid": user_id}
	).mappings().first()

	candidate_limit = max(limit * 5, 100)
	rows = db.execute(
		text("""
			WITH pop AS (
				SELECT
					event_id,
					COALESCE(SUM(
						CASE
							WHEN action = 'rsvp' THEN 2
							WHEN action = 'save' OR direction = 'right' THEN 1
							ELSE 0
						END
					), 0)::int AS popularity_7d
				FROM interactions
				WHERE created_at >= now() - interval '7 days'
				GROUP BY event_id
			)
			SELECT e.id, e.title, e.description, e.community, e.event_time, e.lat, e.lng, e.status,
			       COALESCE(p.popularity_7d, 0) AS pop7,
			       1 - (ee.embedding <=> :user_vec) AS sim
			FROM event_embeddings ee
			JOIN events e ON e.id = ee.event_id
			LEFT JOIN pop p ON p.event_id = e.id
			WHERE (e.event_time IS NULL OR e.event_time >= now())
			  AND e.status = 'approved'
			  AND NOT EXISTS (
				  SELECT 1 FROM interactions i
				  WHERE i.user_id = :uid AND i.event_id = e.id AND i.direction = 'left'
			  )
			ORDER BY ee.embedding <=> :user_vec
			LIMIT :limit
		"""),
		{"user_vec": user_vec, "limit": candidate_limit, "uid": user_id}
	).mappings().all()

	# Python-side re-rank
	now = datetime.now(timezone.utc)
	ux_lat = user_row["lat"] if user_row else None
	ux_lng = user_row["lng"] if user_row else None

	def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
		r = 6371.0
		phi1 = math.radians(lat1)
		phi2 = math.radians(lat2)
		dphi = math.radians(lat2 - lat1)
		dlam = math.radians(lon2 - lon1)
		a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
		c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
		return r * c

	def distance_decay_km(dist_km: float | None) -> float:
		if dist_km is None:
			return 1.0
		return math.exp(-(dist_km / 5.0))

	def time_decay_hours(dt: datetime | None) -> float:
		if dt is None:
			return 1.0
		diff_h = (dt - now).total_seconds() / 3600.0
		return math.exp(-max(diff_h, 0.0) / 72.0)

	ranked = []
	for r in rows:
		dist_km = None
		if ux_lat is not None and ux_lng is not None and r["lat"] is not None and r["lng"] is not None:
			dist_km = haversine_km(ux_lat, ux_lng, r["lat"], r["lng"])
		pop_prior = math.log1p(r.get("pop7", 0)) if "pop7" in r else 0.0
		pop_factor = 1.0 + (pop_prior * 0.1)  # gentle boost
		community_boost = 1.1 if (r.get("community") or "").lower() == "ucla" else 1.0
		final_score = r["sim"] * distance_decay_km(dist_km) * time_decay_hours(r["event_time"]) * pop_factor * community_boost
		ranked.append({**r, "distance_km": dist_km, "score": final_score})

	ranked.sort(key=lambda x: x["score"], reverse=True)
	return ranked[:limit]

@app.put("/users/{user_id}", response_model=User)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
	updates = {k: v for k, v in payload.model_dump().items() if v is not None}

	if not updates:
		raise HTTPException(status_code=400, detail="No fields to update")

	set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
	updates["id"] = user_id

	row = db.execute(
		text(f"""
			UPDATE users
			SET {set_clause}
			WHERE id = :id
			RETURNING id, name, email, preferences, lat, lng, radius_km, created_at
		"""),
		updates
	).mappings().first()

	if payload.preferences is not None:
		vector = embed_texts([payload.preferences])[0]

		db.execute(
			text("""
				INSERT INTO user_embeddings (user_id, embedding)
				VALUES (:uid, :embedding)
				ON CONFLICT (user_id) DO UPDATE
				SET embedding = EXCLUDED.embedding
			"""),
			{"uid": user_id, "embedding": vector}
		)

	db.commit()
	return row


@app.patch("/admin/events/{event_id}/status", response_model=Event)
def update_event_status(
	event_id: int,
	status_value: str,
	x_admin_token: str | None = Header(default=None, convert_underscores=False),
	db: Session = Depends(get_db),
):
	settings = get_settings()
	if not settings.admin_token or x_admin_token != settings.admin_token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
	row = db.execute(
		text("""
			UPDATE events
			SET status = :status
			WHERE id = :id
			RETURNING id, title, description, community, event_time, lat, lng, location_name, status, created_at
		"""),
		{"status": status_value, "id": event_id}
	).mappings().first()
	if not row:
		raise HTTPException(status_code=404, detail="Event not found")
	return row

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)