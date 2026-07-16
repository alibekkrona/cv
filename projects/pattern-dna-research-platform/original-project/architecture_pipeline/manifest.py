"""Build report manifests for Architecture Step folders."""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path

from .paths import PATHS


CHROM_RE = re.compile(r"(?:^|[_/-])chr([0-9XYM]+)(?:[_./-]|$)", re.IGNORECASE)


@dataclass(frozen=True)
class ReportItem:
    source_path: Path
    mirror_path: Path
    origin: str

    @property
    def name(self) -> str:
        return self.source_path.name

    @property
    def suffix(self) -> str:
        return self.source_path.suffix.lstrip(".")

    @property
    def chrom(self) -> str:
        match = CHROM_RE.search(str(self.source_path))
        return match.group(1) if match else ""

    @property
    def stage(self) -> str:
        lower = self.name.lower()
        if "landing" in lower:
            return "landing"
        if "field" in lower:
            return "fields"
        if "cut" in lower:
            return "cut_sites"
        if "slice" in lower:
            return "slice_zones"
        if "exam" in lower or "mrna" in lower:
            return "mrna_exam"
        if "ctcf" in lower or "cohesin" in lower:
            return "discarded_ctcf_cohesin"
        return "general"

    @property
    def status(self) -> str:
        lower = self.name.lower()
        if self.origin == "step15_docs":
            return "canonical"
        if self.origin == "step14_docs":
            return "canonical"
        if "ctcf" in lower or "cohesin" in lower:
            return "discarded"
        if lower.endswith((".tsv", ".fa", ".fasta")):
            return "generated"
        if self.stage in {"fields", "landing", "slice_zones", "mrna_exam"}:
            return "active"
        return "historical"


def iter_reports() -> list[ReportItem]:
    roots = [
        (PATHS.pattern_docs, PATHS.step15 / "Reports/pattern_docs", "pattern_docs"),
        (PATHS.dna_docs, PATHS.step15 / "Reports/dna_docs", "dna_docs"),
        (PATHS.architecture / "Step14", PATHS.step15 / "Reports/step14_docs", "step14_docs"),
        (PATHS.step15, PATHS.step15, "step15_docs"),
    ]
    out: list[ReportItem] = []
    for source_root, mirror_root, origin in roots:
        if not source_root.exists():
            continue
        for path in sorted(source_root.rglob("*")):
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".md", ".tsv", ".fa", ".fasta"}:
                continue
            if "Reports" in path.parts and origin == "step15_docs":
                continue
            mirror_path = mirror_root / path.relative_to(source_root)
            out.append(ReportItem(path, mirror_path, origin))
    return out


def write_manifest(path: Path) -> None:
    rows = iter_reports()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["origin", "chrom", "stage", "status", "type", "name", "source_path", "mirror_path"],
            delimiter="\t",
        )
        writer.writeheader()
        for item in rows:
            writer.writerow(
                {
                    "origin": item.origin,
                    "chrom": item.chrom,
                    "stage": item.stage,
                    "status": item.status,
                    "type": item.suffix,
                    "name": item.name,
                    "source_path": str(item.source_path),
                    "mirror_path": str(item.mirror_path),
                }
            )


if __name__ == "__main__":
    write_manifest(PATHS.step15 / "Reports/manifests/step15_report_manifest.tsv")
