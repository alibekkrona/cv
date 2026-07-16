#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from urllib.request import urlopen


BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3300"


def get(path: str):
    with urlopen(f"{BASE_URL}{path}", timeout=5) as response:
        return json.load(response)


health = get("/api/health")
overview = get("/api/overview")
evidence = get("/api/evidence")
artifacts = get("/api/artifacts")

assert health["status"] == "ok"
assert overview["part_number"] == "4H0920840F"
assert overview["network"]["uds_request"] == "0x714"
assert overview["network"]["uds_response"] == "0x77E"
assert any(dtc["code"] == "EA6100" for dtc in evidence["dtcs"])
assert evidence["summary"]["txFail"] == 0
assert evidence["summary"]["EFLG"] == "0x00"
assert len(artifacts) >= 6

print(
    "smoke_ok "
    f"events={evidence['event_count']} "
    f"dtcs={len(evidence['dtcs'])} "
    f"artifacts={len(artifacts)}"
)

