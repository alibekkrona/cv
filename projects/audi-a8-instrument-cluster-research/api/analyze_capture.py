#!/usr/bin/env python3
"""Parse the compact, public-safe J285 bench evidence capture."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


EVENT_RE = re.compile(
    r"^T\+(?P<time>\d+)\s+"
    r"(?P<transport>CAN|UDS)\s+"
    r"(?P<direction>TX|RX|STATE)\s+"
    r"(?P<identifier>[0-9A-F]+)"
    r"(?:#(?P<payload>[0-9A-F]+))?"
    r"(?:\s+(?P<details>.*))?$"
)
SUMMARY_RE = re.compile(r"^SUMMARY\s+(?P<values>.*)$")


def parse_values(text: str) -> dict[str, str | int]:
    values: dict[str, str | int] = {}
    for item in text.split():
        if "=" not in item:
            continue
        key, value = item.split("=", 1)
        values[key] = int(value) if value.isdigit() else value
    return values


def parse_capture(path: str | Path) -> dict:
    events: list[dict] = []
    summary: dict[str, str | int] = {}

    for raw_line in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        event_match = EVENT_RE.match(line)
        if event_match:
            event = event_match.groupdict()
            event["time_ms"] = int(event.pop("time"))
            event["details"] = parse_values(event.get("details") or "")
            events.append(event)
            continue
        summary_match = SUMMARY_RE.match(line)
        if summary_match:
            summary = parse_values(summary_match.group("values"))

    dtcs = []
    seen_dtcs = set()
    for event in events:
        dtc = event["details"].get("dtc")
        if dtc and dtc not in seen_dtcs:
            seen_dtcs.add(dtc)
            dtcs.append(
                {
                    "code": dtc,
                    "status": event["details"].get("status", "unknown"),
                    "label": str(event["details"].get("label", "")).replace("_", " "),
                }
            )

    identifiers = sorted({event["identifier"] for event in events})
    return {
        "events": events,
        "summary": summary,
        "dtcs": dtcs,
        "identifiers": identifiers,
        "event_count": len(events),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python api/analyze_capture.py evidence/demo_capture.log")
        return 2
    print(json.dumps(parse_capture(sys.argv[1]), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

