Spotted Monorepo
===================

Stack (MVP)
-----------
- Backend: FastAPI (Python), Postgres + pgvector for vector search
- Embeddings: OpenAI `text-embedding-3-small` (swappable later)
- Infra: Docker Compose (Postgres + pgvector)
- Frontend: Next.js (to be bootstrapped under `apps/web`)

Structure
---------
- `apps/api`: FastAPI service and recommendation logic
- `apps/web`: Next.js web app (PWA-ready)
- `infra`: Docker compose and ops
- `.env.example`: environment template

Quickstart
----------
1) Copy envs
   - Create `.env` from `.env.example` and fill values (OpenAI key, DB URL).

2) Start database (Postgres + pgvector)
   - `docker compose -f infra/docker-compose.yml up -d`

3) Backend (FastAPI)
   - `cd apps/api`
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload`

4) Frontend (Next.js)
   - Bootstrap later: `npx create-next-app@latest apps/web`
   - Then run `npm run dev` inside `apps/web`

Recommendation Stack (MVP)
--------------------------
- Compute embeddings with OpenAI `text-embedding-3-small` (1536 dims) for users and items.
- Store vectors in Postgres using `pgvector` (`vector(1536)` column).
- Retrieve candidates with ANN index (`ivfflat` or `hnsw`) and re-rank in Python by:
  - cosine similarity × distance_decay × time_decay (for events) × community_boost × popularity_prior.
- Log swipes (`save/pass` for events, `connect/pass` for people) to improve weights.

Notes
-----
- UCLA-first: seed event ingestion with campus calendars + 1–2 city sources.
- Keep embeddings behind a thin interface to swap to local models later.


