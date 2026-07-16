#!/usr/bin/env python3
"""
Simple serial logger for Arduino Nano on Windows/Linux.

Usage:
  python serial_logger.py COM3 115200
  python serial_logger.py /dev/ttyUSB0 115200

Install dependency:
  python -m pip install pyserial
"""

import sys
import time

try:
    import serial
except ImportError:
    print("pyserial is missing. Install it with: python -m pip install pyserial")
    raise SystemExit(1)


def main() -> int:
    port = sys.argv[1] if len(sys.argv) > 1 else "COM3"
    baud = int(sys.argv[2]) if len(sys.argv) > 2 else 115200

    print(f"Opening {port} at {baud} baud...")
    print("Close Arduino IDE, XLoader, Serial Monitor, PuTTY before running this.")

    try:
        with serial.Serial(port, baudrate=baud, timeout=0.2) as ser:
            time.sleep(2.0)
            ser.reset_input_buffer()
            print("Serial opened. Reading lines. Ctrl+C to stop.")
            while True:
                raw = ser.readline()
                if raw:
                    text = raw.decode("utf-8", errors="replace").rstrip()
                    print(text)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    except serial.SerialException as exc:
        print(f"Serial error: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
