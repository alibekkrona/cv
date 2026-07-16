from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from analyze_capture import parse_capture


ROOT = Path(__file__).resolve().parents[1]
WEB_DIST = ROOT / "web" / "dist"
CAPTURE = ROOT / "evidence" / "demo_capture.log"

app = Flask(__name__, static_folder=str(WEB_DIST), static_url_path="")


OVERVIEW = {
    "project": "Audi A8 D4 Instrument Cluster Bench Research",
    "module": "J285",
    "part_number": "4H0920840F",
    "network": {
        "bitrate": "500 kbps",
        "frame_format": "Standard 11-bit CAN",
        "controller": "MCP2515, 8 MHz",
        "uds_request": "0x714",
        "uds_response": "0x77E",
    },
    "wiring": [
        {"signal": "CAN-L", "pin": "3"},
        {"signal": "CAN-H", "pin": "4"},
        {"signal": "Ground / Terminal 31", "pin": "29, 30"},
        {"signal": "+12 V / Terminal 30", "pin": "31, 32"},
    ],
    "state_packets": [
        {
            "id": "0x3C0",
            "payload": "00 00 FF FF",
            "result": "Engine-running-like wake state",
            "confidence": "Bench verified",
        },
        {
            "id": "0x3C0",
            "payload": "FF FF 00 00",
            "result": "Standby / ignition-on-like state",
            "confidence": "Bench verified",
        },
        {
            "id": "0x6C0",
            "payload": "01 00 FF <counter> 00 00 00 00",
            "result": "Backlight hold",
            "confidence": "Bench verified",
        },
    ],
    "dids": [
        {"did": "F187", "meaning": "Spare part number", "value": "4H0920840F"},
        {"did": "F189", "meaning": "Software version", "value": "0803"},
        {"did": "F18C", "meaning": "ECU serial", "value": "6580311155920470"},
        {"did": "F19E", "meaning": "Dataset / ASAM name", "value": "EV_RBD4K"},
        {"did": "F1AA", "meaning": "Module role", "value": "J285"},
        {"did": "2203", "meaning": "Odometer candidate", "value": "01 EB 3A"},
    ],
    "boundary": {
        "included": [
            "Read-only UDS identification and DTC evidence",
            "Reversible CAN state and backlight experiments",
            "Passive CANable / SLCAN capture tooling",
            "Legitimate ODIS adaptation preparation",
        ],
        "excluded": [
            "Immobilizer or Component Protection bypass",
            "Secret extraction or cloning",
            "EEPROM modification for access-control removal",
            "Claims not supported by bench evidence",
        ],
    },
}

ARTIFACTS = [
    {
        "name": "0x3C0 State Matrix",
        "path": "firmware/audia8_cluster_3c0_key_matrix.ino",
        "kind": "Arduino firmware",
        "purpose": "Maps reversible virtual-key payloads to observable cluster states.",
    },
    {
        "name": "Delayed Diagnostic Timeline v7",
        "path": "firmware/audia8_cluster_safe_timeline_context_hold_v7.ino",
        "kind": "Arduino firmware",
        "purpose": "Keeps the first 60 seconds free of UDS traffic before one diagnostic snapshot.",
    },
    {
        "name": "DTC Forensics",
        "path": "firmware/audia8_cluster_dtc_forensics.ino",
        "kind": "Arduino firmware",
        "purpose": "Uses filtered, read-only UDS requests to capture stable DTC extended data.",
    },
    {
        "name": "System Emulator Probe",
        "path": "firmware/audia8_cluster_system_emulator_probe.ino",
        "kind": "Arduino firmware",
        "purpose": "Provides controlled, reversible context profiles and health instrumentation.",
    },
    {
        "name": "Passive CAN Log Analyzer",
        "path": "tools/can_log_analyzer.py",
        "kind": "Python tool",
        "purpose": "Summarizes observed identifiers, frame counts, periods, and payload hints.",
    },
    {
        "name": "SLCAN Adapter Probe",
        "path": "tools/slcan_probe.py",
        "kind": "Python tool",
        "purpose": "Checks CANable-style adapters in listen-only 500 kbit/s mode.",
    },
]


@app.get("/api/health")
def health():
    parsed = parse_capture(CAPTURE)
    return jsonify({"status": "ok", "events": parsed["event_count"]})


@app.get("/api/overview")
def overview():
    return jsonify(OVERVIEW)


@app.get("/api/evidence")
def evidence():
    return jsonify(parse_capture(CAPTURE))


@app.get("/api/artifacts")
def artifacts():
    return jsonify(ARTIFACTS)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def frontend(path: str):
    if path and (WEB_DIST / path).is_file():
        return send_from_directory(WEB_DIST, path)
    return send_from_directory(WEB_DIST, "index.html")

