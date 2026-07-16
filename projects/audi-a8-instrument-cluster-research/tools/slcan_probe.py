#!/usr/bin/env python3
"""
Probe a CANable-style SLCAN serial adapter.

This checks whether the USB device answers basic SLCAN commands and can open
500 kbit/s listen-only mode. It does not transmit CAN frames.

Usage:
  python3 tools/slcan_probe.py /dev/ttyACM0
"""

from __future__ import annotations

import os
import select
import sys
import termios
import time
import tty


def read_available(fd: int, seconds: float = 0.25) -> bytes:
    deadline = time.monotonic() + seconds
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        readable, _, _ = select.select([fd], [], [], 0.05)
        if readable:
            try:
                chunks.append(os.read(fd, 4096))
            except BlockingIOError:
                pass
    return b"".join(chunks)


def send(fd: int, command: str, wait: float = 0.25) -> bytes:
    os.write(fd, command.encode("ascii") + b"\r")
    time.sleep(wait)
    return read_available(fd, 0.15)


def show(label: str, data: bytes) -> None:
    printable = data.decode("ascii", errors="replace").replace("\r", "\\r").replace("\n", "\\n")
    print(f"{label:<10} bytes={len(data):<3} raw={data.hex(' ').upper()} text={printable}")


def main() -> int:
    device = sys.argv[1] if len(sys.argv) > 1 else "/dev/ttyACM0"
    print(f"Opening {device} for SLCAN probe")
    fd = os.open(device, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    old_attrs = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        show("initial", read_available(fd, 0.5))
        show("CR", send(fd, "\r"))
        show("close", send(fd, "C"))
        show("version", send(fd, "V"))
        show("serial", send(fd, "N"))
        show("status", send(fd, "F"))
        show("set500k", send(fd, "S6"))
        show("listen", send(fd, "L"))
        print("Listening for 5 seconds. Now generate CAN traffic from Arduino if needed.")
        show("rx5s", read_available(fd, 5.0))
        show("close", send(fd, "C"))
    finally:
        termios.tcsetattr(fd, termios.TCSANOW, old_attrs)
        os.close(fd)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
