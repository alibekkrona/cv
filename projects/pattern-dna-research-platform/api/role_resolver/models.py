"""Data models for contextual landing role assignment."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class LandingPlatformProfile:
    landing_id: str
    families: tuple[str, ...] = ()
    family_windows: tuple[str, ...] = ()
    exact_motif_hits: tuple[str, ...] = ()
    key_factors: tuple[str, ...] = ()
    pol2_landing_machine: tuple[str, ...] = ()
    bridge_factors: tuple[str, ...] = ()
    pause_release_factors: tuple[str, ...] = ()
    tail_classes: tuple[str, ...] = ()
    side_hint: str | None = None
    notes: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "LandingPlatformProfile":
        return cls(
            landing_id=str(data["landing_id"]),
            families=_tuple(data.get("families", ())),
            family_windows=_tuple(data.get("family_windows", ())),
            exact_motif_hits=_tuple(data.get("exact_motif_hits", data.get("exact_motifs", ()))),
            key_factors=_tuple(data.get("key_factors", ())),
            pol2_landing_machine=_tuple(data.get("pol2_landing_machine", ())),
            bridge_factors=_tuple(data.get("bridge_factors", ())),
            pause_release_factors=_tuple(data.get("pause_release_factors", ())),
            tail_classes=_tuple(data.get("tail_classes", ())),
            side_hint=data.get("side_hint"),
            notes=str(data.get("notes", "")),
        )


@dataclass(frozen=True)
class ReadingContext:
    context_id: str = "manual_context"
    cell_state: str | None = None
    pol_direction: str | None = None
    required_role: str | None = None
    notes: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "ReadingContext":
        if not data:
            return cls()
        return cls(
            context_id=str(data.get("context_id", "manual_context")),
            cell_state=data.get("cell_state"),
            pol_direction=data.get("pol_direction"),
            required_role=data.get("required_role"),
            notes=str(data.get("notes", "")),
        )


@dataclass(frozen=True)
class MissingRequirement:
    requirement: str
    why_it_matters: str
    what_would_satisfy: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "requirement": self.requirement,
            "why_it_matters": self.why_it_matters,
            "what_would_satisfy": list(self.what_would_satisfy),
        }


@dataclass(frozen=True)
class RoleAssessment:
    landing_id: str
    dominant_role: str
    role_confidence: str
    address_score: float
    promoter_score: float
    pic_machine_score: float
    bridge_score: float
    pause_release_score: float
    evidence: tuple[str, ...]
    caveats: tuple[str, ...]
    missing_for_address: tuple[MissingRequirement, ...] = ()
    missing_for_promoter: tuple[MissingRequirement, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "landing_id": self.landing_id,
            "dominant_role": self.dominant_role,
            "role_confidence": self.role_confidence,
            "scores": {
                "address": self.address_score,
                "promoter": self.promoter_score,
                "pic_machine": self.pic_machine_score,
                "bridge": self.bridge_score,
                "pause_release": self.pause_release_score,
            },
            "evidence": list(self.evidence),
            "caveats": list(self.caveats),
            "missing_for_address": [m.to_dict() for m in self.missing_for_address],
            "missing_for_promoter": [m.to_dict() for m in self.missing_for_promoter],
        }


@dataclass(frozen=True)
class ComplexAssessment:
    context_id: str
    platform_a: str
    platform_b: str
    verdict: str
    confidence: str
    address_candidate: str | None
    promoter_candidate: str | None
    shared_families: tuple[str, ...]
    bridge_rationale: tuple[str, ...]
    missing_requirements: tuple[MissingRequirement, ...] = ()
    platform_roles: tuple[RoleAssessment, RoleAssessment] | None = field(default=None)

    def to_dict(self) -> dict[str, Any]:
        return {
            "context_id": self.context_id,
            "platform_a": self.platform_a,
            "platform_b": self.platform_b,
            "verdict": self.verdict,
            "confidence": self.confidence,
            "address_candidate": self.address_candidate,
            "promoter_candidate": self.promoter_candidate,
            "shared_families": list(self.shared_families),
            "bridge_rationale": list(self.bridge_rationale),
            "missing_requirements": [m.to_dict() for m in self.missing_requirements],
            "platform_roles": [r.to_dict() for r in self.platform_roles or ()],
        }


def _tuple(value: Any) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        if not value:
            return ()
        return tuple(part.strip() for part in value.split(";") if part.strip())
    return tuple(str(part).strip() for part in value if str(part).strip())
