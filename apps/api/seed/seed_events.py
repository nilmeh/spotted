import json
from pathlib import Path

import requests


BASE_DIR = Path(__file__).parent

with (BASE_DIR / "seed_events.json").open() as f:
    events = json.load(f)

for e in events:
    r = requests.post("http://localhost:8000/events", json=e)
    print(r.status_code, r.json())