"""Shared project paths for the chromosome architecture pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectPaths:
    root: Path = Path("/home/arsen/projects/bearingknowledge")

    @property
    def dna(self) -> Path:
        return self.root / "DNA"

    @property
    def pattern(self) -> Path:
        return self.root / "pattern"

    @property
    def architecture(self) -> Path:
        return self.root / "phoenix_ops/DNA/LiveArchitecture/Docs/Architecture"

    @property
    def step15(self) -> Path:
        return self.architecture / "Step15"

    @property
    def pattern_docs(self) -> Path:
        return self.pattern / "docs"

    @property
    def dna_docs(self) -> Path:
        return self.dna / "docs"

    @property
    def derived_grammar(self) -> Path:
        return self.dna / "data/derived/rna_processing_grammar"

    def fields_path(self, chrom: str) -> Path:
        if chrom == "1":
            dirname = "chr1_de_novo_merged_gene_fields_v2_gap10000_cap2000000"
        else:
            dirname = f"chr{chrom}_de_novo_merged_premrna_fields_v2_gap10000_cap2000000"
        return self.derived_grammar / dirname / f"{dirname}.tsv"

    def slice_zones_path(self, chrom: str) -> Path:
        dirname = f"chr{chrom}_premrna_slice_zones_v2"
        return self.derived_grammar / dirname / f"{dirname}.tsv"

    def cut_sites_path(self, chrom: str) -> Path:
        dirname = f"chr{chrom}_premrna_cut_sites_v1"
        return self.derived_grammar / dirname / f"{dirname}.tsv"


PATHS = ProjectPaths()
