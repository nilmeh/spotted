"""
Direct database seeding for events - much faster than HTTP API calls.
Batches OpenAI embedding calls and uses bulk inserts.
"""
from pathlib import Path
import json
import os
import sys
from datetime import datetime

# Add parent dir to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.embeddings import embed_texts

# Load events
BASE_DIR = Path(__file__).parent
with (BASE_DIR / "seed_events.json").open() as f:
    events = json.load(f)

# Get DB URL from env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set. Run:")
    print('  export DATABASE_URL="postgresql://spotted:spotted@localhost:5433/spotted"')
    sys.exit(1)

engine = create_engine(DATABASE_URL)

print(f"📦 Seeding {len(events)} events...")

# Step 1: Insert all events in one transaction
with engine.begin() as conn:
    for i, event in enumerate(events):
        result = conn.execute(
            text("""
                INSERT INTO events (title, description, community, event_time, lat, lng, location_name, status)
                VALUES (:title, :description, :community, :event_time, :lat, :lng, :location_name, :status)
                RETURNING id
            """),
            event
        )
        event_id = result.scalar()
        events[i]["id"] = event_id  # Store ID for embedding step
        
        if (i + 1) % 20 == 0:
            print(f"  ✓ Inserted {i + 1}/{len(events)} events")

print(f"✅ Inserted all {len(events)} events")

# Step 2: Batch generate embeddings (much faster than one-by-one)
print("🤖 Generating embeddings in batches...")

texts = [f"{e['title']}. {e.get('description', '')}".strip() for e in events]

# OpenAI embedding API can handle up to 2048 texts per call, but we'll batch smaller for safety
BATCH_SIZE = 50
all_vectors = []

for i in range(0, len(texts), BATCH_SIZE):
    batch = texts[i:i + BATCH_SIZE]
    vectors = embed_texts(batch)
    all_vectors.extend(vectors)
    print(f"  ✓ Embedded {min(i + BATCH_SIZE, len(texts))}/{len(texts)} events")

print(f"✅ Generated all embeddings")

# Step 3: Bulk insert embeddings
print("💾 Inserting embeddings...")

with engine.begin() as conn:
    for i, event in enumerate(events):
        conn.execute(
            text("""
                INSERT INTO event_embeddings (event_id, embedding)
                VALUES (:event_id, :embedding)
            """),
            {"event_id": event["id"], "embedding": all_vectors[i]}
        )
        
        if (i + 1) % 20 == 0:
            print(f"  ✓ Inserted {i + 1}/{len(events)} embeddings")

print(f"✅ Seeded {len(events)} events with embeddings")
print("🎉 Done!")

