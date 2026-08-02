"""Standard-library HTTP server for the multi-function model demo."""

from __future__ import annotations

import argparse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .model import MultiFunctionEngine


class DemoApplication:
    def __init__(self, engine: MultiFunctionEngine, index_path: Path) -> None:
        self.engine = engine
        self.index_html = index_path.read_bytes()

    def handler_class(self) -> type[BaseHTTPRequestHandler]:
        application = self

        class DemoHandler(BaseHTTPRequestHandler):
            server_version = "MultiFunctionDemo/1.0"

            def _send_json(self, status: int, payload: object) -> None:
                body = json.dumps(payload).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)

            def _read_json(self) -> dict[str, Any]:
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                except ValueError as error:
                    raise ValueError("invalid Content-Length") from error
                if length <= 0 or length > 10_000:
                    raise ValueError("JSON body must be between 1 byte and 10 KB")
                try:
                    payload = json.loads(self.rfile.read(length))
                except json.JSONDecodeError as error:
                    raise ValueError("invalid JSON body") from error
                if not isinstance(payload, dict):
                    raise ValueError("JSON body must be an object")
                return payload

            def do_GET(self) -> None:  # noqa: N802
                path = urlparse(self.path).path
                if path == "/":
                    self.send_response(HTTPStatus.OK)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header(
                        "Content-Length",
                        str(len(application.index_html)),
                    )
                    self.send_header("Cache-Control", "no-store")
                    self.end_headers()
                    self.wfile.write(application.index_html)
                    return
                if path == "/health":
                    self._send_json(
                        HTTPStatus.OK,
                        {
                            "status": "ok",
                            "model": "ml-multifunction-learning-demo",
                            "checkpoint_step": application.engine.step,
                        },
                    )
                    return
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

            def do_POST(self) -> None:  # noqa: N802
                if urlparse(self.path).path != "/api/predict":
                    self._send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
                    return
                try:
                    payload = self._read_json()
                    result = application.engine.predict(
                        str(payload.get("task", "")),
                        payload.get("x"),
                        payload.get("y"),
                    )
                except ValueError as error:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
                    return
                except RuntimeError as error:
                    self._send_json(
                        HTTPStatus.UNPROCESSABLE_ENTITY,
                        {"error": str(error)},
                    )
                    return
                self._send_json(HTTPStatus.OK, result)

            def log_message(self, format: str, *args: object) -> None:
                return

        return DemoHandler


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    arguments = parser.parse_args()
    project_directory = Path.cwd()
    engine = MultiFunctionEngine(project_directory / "model/model.pt")
    application = DemoApplication(
        engine,
        project_directory / "web/index.html",
    )
    server = ThreadingHTTPServer(
        (arguments.host, arguments.port),
        application.handler_class(),
    )
    print(
        f"ML Multi-Function Learning Demo: "
        f"http://{arguments.host}:{arguments.port}",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
