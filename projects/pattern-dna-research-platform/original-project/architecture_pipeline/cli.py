"""Command line entry point for architecture pipeline housekeeping."""

from __future__ import annotations

import argparse
import sys

from .inventory import write_inventory
from .manifest import write_manifest
from .paths import PATHS
from .stages import CORE_SCRIPTS, list_core_scripts, run_core_script


def main() -> None:
    parser = argparse.ArgumentParser(prog="architecture-pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("manifest", help="write Step15 artifact manifest")
    sub.add_parser("inventory", help="write Step15 script inventory")
    sub.add_parser("index", help="write both manifest and inventory")
    sub.add_parser("list-core", help="list active-core stage scripts")
    run = sub.add_parser("run-core", help="run an active-core script by key")
    run.add_argument("key", choices=sorted(CORE_SCRIPTS))
    run.add_argument("--dry-run", action="store_true")
    args, unknown = parser.parse_known_args()

    if args.command in {"manifest", "index"}:
        write_manifest(PATHS.step15 / "Reports/manifests/step15_report_manifest.tsv")
    if args.command in {"inventory", "index"}:
        write_inventory(PATHS.step15 / "Reports/manifests/script_inventory.tsv")
    if args.command == "list-core":
        for item in list_core_scripts():
            flag = "writes-data" if item.destructive else "report-only"
            print(f"{item.key}\t{item.stage}\t{flag}\t{item.path}\t{item.description}")
    if args.command == "run-core":
        script_args = list(unknown)
        if script_args and script_args[0] == "--":
            script_args = script_args[1:]
        code = run_core_script(args.key, script_args, dry_run=args.dry_run)
        raise SystemExit(code)


if __name__ == "__main__":
    main()
