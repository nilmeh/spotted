import requests
import json

with open("seed_events.json") as f:
    events = json.load(f)

for e in events:
    r = requests.post("http://localhost:8000/events", json=e)
    print(r.status_code, r.json())