from __future__ import annotations

import json
import os
import urllib.request


BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3200")


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE_URL}{path}") as response:
        if response.status != 200:
            raise RuntimeError(f"{path}: HTTP {response.status}")
        return json.load(response)


def post(path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        if response.status != 200:
            raise RuntimeError(f"{path}: HTTP {response.status}")
        return json.load(response)


health = get("/api/health")
overview = get("/api/overview")
viewport = get("/api/chromosomes/Demo/viewport?mode=baseline")
resolved = post(
    "/api/resolve",
    {
        "context": {"context_id": "smoke"},
        "platform_a": {
            "landing_id": "address-demo",
            "families": ["AP1/CREB/bZIP", "ETS"],
            "exact_motif_hits": ["MA0028.3 ELK1"],
            "key_factors": ["ELK1", "MED23"],
        },
        "platform_b": {
            "landing_id": "promoter-demo",
            "families": ["GC/ZF", "RUNX"],
            "key_factors": ["TBP", "TFIID", "POLR2A"],
        },
    },
)

assert health["status"] == "ok"
assert overview["counts"]["regions"] == 7
assert len(viewport["fields"]) == 2
assert len(viewport["complexes"]) == 2
assert resolved["complex"]["verdict"] != "unresolved"

print("Pattern DNA smoke-check passed.")
