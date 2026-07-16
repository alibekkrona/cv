#!/usr/bin/env python3
"""Analyze passive CAN logger output.

Expected raw lines:
  RX t=12345 id=30B len=8 data=6F00110000000088
"""

from __future__ import annotations

import re
import statistics
import sys
from collections import defaultdict


RX_RE = re.compile(r"RX t=(\d+)\s+id=([0-9A-Fa-f]+)\s+len=(\d+)\s+data=([0-9A-Fa-f]*)")


def ascii_hint(hex_data: str) -> str:
    raw = bytes.fromhex(hex_data) if hex_data else b""
    out = []
    for b in raw:
        out.append(chr(b) if 32 <= b < 127 else ".")
    return "".join(out)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python can_log_analyzer.py capture.txt")
        return 2

    frames: dict[int, list[tuple[int, str]]] = defaultdict(list)
    with open(sys.argv[1], "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            m = RX_RE.search(line)
            if not m:
                continue
            t_ms = int(m.group(1))
            can_id = int(m.group(2), 16)
            data = m.group(4).upper()
            frames[can_id].append((t_ms, data))

    print(f"unique_ids={len(frames)} total_frames={sum(len(v) for v in frames.values())}")
    print()
    print("ID,count,period_ms,last,ascii")

    for can_id, items in sorted(frames.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        times = [t for t, _ in items]
        periods = [b - a for a, b in zip(times, times[1:]) if b >= a]
        if periods:
            period = int(statistics.median(periods))
        else:
            period = 0
        last = items[-1][1]
        print(f"0x{can_id:X},{len(items)},{period},{last},{ascii_hint(last)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
