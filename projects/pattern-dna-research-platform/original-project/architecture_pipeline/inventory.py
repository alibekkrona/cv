"""Inventory and classify project scripts."""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path

from .paths import PATHS


CHROM_RE = re.compile(r"(?:^|_)chr([0-9XYM]+)(?:_|$)", re.IGNORECASE)

ACTIVE_CORE = {
    "build_chrom_de_novo_premrna_fields_v2.py",
    "build_chrom_premrna_slice_zones_v2.py",
    "import_chrom_slice_zones_v2.py",
    "merge_chrom_overlapping_fields.py",
    "apply_chrom_manual_field_merges.py",
    "sync_chrom_current_fields.py",
    "build_chrom_premrna_cut_sites_v1_stream.py",
    "audit_chrom_landing_end_signal.py",
    "report_chrom_all_known_mrna_architecture_exam.py",
    "build_chr2_cleaned_problem_transcripts.py",
    "analyze_chr2_scn3a_architecture_variants.py",
    "assign_landing_boundary_chain.py",
    "import_chrom_landing_boundary_v2_chain.py",
}

STAGE_OVERRIDES = {
    "analyze_chr2_scn3a_architecture_variants.py": "error_audit",
    "build_chr2_cleaned_problem_transcripts.py": "error_audit",
    "build_chrom_de_novo_premrna_fields_v2.py": "fields",
    "build_chrom_premrna_cut_sites_v1.py": "cut_sites",
    "build_chrom_premrna_cut_sites_v1_stream.py": "cut_sites",
    "build_chrom_premrna_slice_zones_v2.py": "slice_zones",
    "import_chrom_slice_zones_v2.py": "slice_zones",
    "report_chrom_all_known_mrna_architecture_exam.py": "mrna_exam",
    "audit_chrom_landing_end_signal.py": "landing",
    "assign_landing_boundary_chain.py": "chain_assignment",
    "import_chrom_landing_boundary_v2_chain.py": "chain_assignment",
    "merge_chrom_overlapping_fields.py": "fields",
    "apply_chrom_manual_field_merges.py": "fields",
    "sync_chrom_current_fields.py": "fields",
}


@dataclass(frozen=True)
class ScriptItem:
    path: Path

    @property
    def name(self) -> str:
        return self.path.name

    @property
    def origin(self) -> str:
        if self.path.is_relative_to(PATHS.pattern):
            return "pattern_scripts"
        if self.path.is_relative_to(PATHS.dna):
            return "dna_scripts"
        return "other"

    @property
    def chrom(self) -> str:
        match = CHROM_RE.search(self.name)
        return match.group(1) if match else ""

    @property
    def stage(self) -> str:
        if self.name in STAGE_OVERRIDES:
            return STAGE_OVERRIDES[self.name]
        lower = self.name.lower()
        if "ctcf" in lower or "cohesin" in lower:
            return "discarded_ctcf_cohesin"
        if "chain" in lower or "strand" in lower:
            return "chain_assignment"
        if "cut_site" in lower or "cut_sites" in lower:
            return "cut_sites"
        if "slice" in lower:
            return "slice_zones"
        if "field" in lower or "premrna" in lower:
            return "fields"
        if "landing" in lower or "promoter" in lower or "enhancer" in lower:
            return "landing"
        if "exam" in lower or "known_mrna" in lower or "mrna" in lower:
            return "mrna_exam"
        if any(word in lower for word in ("audit", "diagnose", "problem", "error", "miss", "cleanup", "cleaned")):
            return "error_audit"
        if lower.startswith(("import_", "build_")):
            return "builder"
        if lower.startswith(("report_", "analyze_", "compare_", "measure_", "evaluate_", "test_")):
            return "analysis"
        return "general"

    @property
    def status(self) -> str:
        lower = self.name.lower()
        if self.name in ACTIVE_CORE:
            return "active_core"
        if "ctcf" in lower or "cohesin" in lower:
            return "discarded"
        if self.origin == "dna_scripts" and re.search(r"_v[0-9]+_|_v[0-9]+\\.", lower):
            return "historical"
        if self.stage in {"landing", "chain_assignment", "fields", "cut_sites", "slice_zones", "mrna_exam", "error_audit"}:
            return "active_support"
        return "historical"

    @property
    def migration_target(self) -> str:
        stage = self.stage
        if stage == "discarded_ctcf_cohesin":
            return "archive/discarded_ctcf_cohesin"
        if stage in {"landing", "chain_assignment", "fields", "cut_sites", "slice_zones", "mrna_exam", "error_audit"}:
            return f"architecture_pipeline/stages/{stage}.py"
        return "archive/historical_or_general"


def iter_scripts() -> list[ScriptItem]:
    roots = [PATHS.pattern / "scripts", PATHS.dna / "scripts"]
    out: list[ScriptItem] = []
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.glob("*.py")):
            out.append(ScriptItem(path))
    return out


def write_inventory(path: Path) -> None:
    rows = iter_scripts()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "origin",
                "chrom",
                "stage",
                "status",
                "name",
                "path",
                "migration_target",
            ],
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
                    "name": item.name,
                    "path": str(item.path),
                    "migration_target": item.migration_target,
                }
            )


if __name__ == "__main__":
    write_inventory(PATHS.step15 / "Reports/manifests/script_inventory.tsv")
