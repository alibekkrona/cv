"""Contextual role resolver for landing platforms."""

from __future__ import annotations

import re

from .models import (
    ComplexAssessment,
    LandingPlatformProfile,
    MissingRequirement,
    ReadingContext,
    RoleAssessment,
)
from .signatures import (
    ADDRESS_FAMILY_WEIGHTS,
    ADDRESS_REQUIRED_FAMILIES,
    BRIDGE_FACTORS,
    BRIDGE_FAMILY_WEIGHTS,
    JASPAR_MOTIF_TO_MEDIATOR_ROUTE,
    MEDIATOR_ORIENTATION_ROUTES,
    PAUSE_RELEASE_FACTORS,
    POL2_LANDING_MACHINE,
    PROMOTER_COMPETENCE_FAMILIES,
    PROMOTER_FAMILY_WEIGHTS,
)


def resolve_role(
    platform: LandingPlatformProfile,
    context: ReadingContext | None = None,
) -> RoleAssessment:
    del context
    families = _platform_families(platform)
    factors = _platform_key_factors(platform)
    pol2_factors = _platform_pol2_factors(platform)
    bridge_factors = _platform_bridge_factors(platform)
    pause_factors = _platform_pause_factors(platform)
    orientation_routes = _platform_mediator_orientation_routes(platform, factors)

    address_score = round(_score_families(families, ADDRESS_FAMILY_WEIGHTS), 3)
    promoter_score = round(_score_families(families, PROMOTER_FAMILY_WEIGHTS), 3)
    bridge_score = round(
        _score_families(families, BRIDGE_FAMILY_WEIGHTS)
        + _score_factor_hits(bridge_factors | factors, BRIDGE_FACTORS, 0.75),
        3,
    )
    orientation_score = round(_score_orientation_routes(orientation_routes), 3)
    address_score = round(address_score + orientation_score, 3)
    bridge_score = round(bridge_score + orientation_score, 3)
    pic_score = round(_score_factor_hits(pol2_factors | factors, POL2_LANDING_MACHINE, 1.0), 3)
    pause_score = round(_score_factor_hits(pause_factors | factors | bridge_factors, PAUSE_RELEASE_FACTORS, 1.0), 3)

    evidence = _evidence(platform, families, factors, pol2_factors, bridge_factors, pause_factors, orientation_routes)
    caveats = _caveats(platform, families, pic_score, orientation_routes)
    missing_address = explain_requirements(platform, "address")
    missing_promoter = explain_requirements(platform, "promoter")

    dominant_role, confidence = _dominant_role(
        address_score=address_score,
        promoter_score=promoter_score,
        pic_score=pic_score,
        bridge_score=bridge_score,
    )

    return RoleAssessment(
        landing_id=platform.landing_id,
        dominant_role=dominant_role,
        role_confidence=confidence,
        address_score=address_score,
        promoter_score=promoter_score,
        pic_machine_score=pic_score,
        bridge_score=bridge_score,
        pause_release_score=pause_score,
        evidence=tuple(evidence),
        caveats=tuple(caveats),
        missing_for_address=tuple(missing_address),
        missing_for_promoter=tuple(missing_promoter),
    )


def explain_requirements(
    platform: LandingPlatformProfile,
    target_role: str,
    context: ReadingContext | None = None,
) -> list[MissingRequirement]:
    del context
    target = target_role.strip().lower()
    families = _platform_families(platform)
    factors = _platform_key_factors(platform)
    pol2_factors = _platform_pol2_factors(platform)
    bridge_factors = _platform_bridge_factors(platform)
    orientation_routes = _platform_mediator_orientation_routes(platform, factors)
    missing: list[MissingRequirement] = []

    if target in {"address", "address-side", "enhancer"}:
        if not families.intersection(ADDRESS_REQUIRED_FAMILIES):
            missing.append(
                MissingRequirement(
                    requirement="regulatory_address_family",
                    why_it_matters="address-side needs regulatory keys that define mode/address and can recruit coactivator context",
                    what_would_satisfy=ADDRESS_REQUIRED_FAMILIES,
                )
            )
        if (
            not orientation_routes
            and not families.intersection(BRIDGE_FAMILY_WEIGHTS)
            and not (bridge_factors | factors).intersection(BRIDGE_FACTORS)
        ):
            missing.append(
                MissingRequirement(
                    requirement="bridge_or_coactivator_potential",
                    why_it_matters="address-side must be able to communicate with promoter/local side through bridge/coactivator machinery",
                    what_would_satisfy=("Mediator", "CBP/p300", "LDB1/LMO2", "AP1/CREB/bZIP", "ETS"),
                )
            )
        return missing

    if target in {"promoter", "promoter-local", "landing", "pol2_landing"}:
        if not families.intersection(PROMOTER_COMPETENCE_FAMILIES):
            missing.append(
                MissingRequirement(
                    requirement="promoter_competence_family",
                    why_it_matters="promoter/local side needs scaffold/core-proximal grammar before PIC can be oriented there",
                    what_would_satisfy=PROMOTER_COMPETENCE_FAMILIES,
                )
            )
        if not (pol2_factors | factors).intersection(POL2_LANDING_MACHINE):
            missing.append(
                MissingRequirement(
                    requirement="pol2_landing_machine",
                    why_it_matters="direct Pol II loading needs basal/general transcription machinery, not only regulatory TF families",
                    what_would_satisfy=tuple(sorted(POL2_LANDING_MACHINE)),
                )
            )
        return missing

    if target in {"bridge", "orientation"}:
        if (
            not orientation_routes
            and not (bridge_factors | factors).intersection(BRIDGE_FACTORS)
            and not families.intersection(BRIDGE_FAMILY_WEIGHTS)
        ):
            missing.append(
                MissingRequirement(
                    requirement="bridge_signal",
                    why_it_matters="complex orientation needs a plausible bridge surface between address and promoter sides",
                    what_would_satisfy=("Mediator", "CBP/p300", "LDB1/LMO2", "shared ETS/RUNX/GC-ZF grammar"),
                )
            )
        return missing

    return [
        MissingRequirement(
            requirement="unknown_target_role",
            why_it_matters=f"target role `{target_role}` is not supported by this resolver",
            what_would_satisfy=("address", "promoter", "bridge"),
        )
    ]


def assess_complex(
    platform_a: LandingPlatformProfile,
    platform_b: LandingPlatformProfile,
    context: ReadingContext | None = None,
) -> ComplexAssessment:
    ctx = context or ReadingContext()
    role_a = resolve_role(platform_a, ctx)
    role_b = resolve_role(platform_b, ctx)

    address, promoter = _choose_sides(platform_a, platform_b, role_a, role_b)
    shared_families = tuple(sorted(set(platform_a.families).intersection(platform_b.families)))
    bridge_rationale = _bridge_rationale(platform_a, platform_b, role_a, role_b, shared_families)
    missing = _complex_missing(address, promoter, shared_families, bridge_rationale)
    verdict, confidence = _complex_verdict(address, promoter, bridge_rationale, missing)

    return ComplexAssessment(
        context_id=ctx.context_id,
        platform_a=platform_a.landing_id,
        platform_b=platform_b.landing_id,
        verdict=verdict,
        confidence=confidence,
        address_candidate=address[0].landing_id if address else None,
        promoter_candidate=promoter[0].landing_id if promoter else None,
        shared_families=shared_families,
        bridge_rationale=tuple(bridge_rationale),
        missing_requirements=tuple(missing),
        platform_roles=(role_a, role_b),
    )


def _score_families(families: set[str], weights: dict[str, float]) -> float:
    return sum(weights.get(family, 0.0) for family in families)


def _score_factor_hits(factors: set[str], accepted: set[str], weight: float) -> float:
    return sum(weight for factor in factors if factor in accepted or any(factor.startswith(prefix) for prefix in accepted))


def _score_orientation_routes(routes: tuple[dict[str, str], ...]) -> float:
    route_ids = {route["route_id"] for route in routes}
    return 0.9 * len(route_ids)


def _platform_families(platform: LandingPlatformProfile) -> set[str]:
    # Window-level family marks are more specific than summary families.
    return set(platform.family_windows or platform.families)


def _platform_key_factors(platform: LandingPlatformProfile) -> set[str]:
    return {_norm_factor(f) for f in platform.key_factors}


def _platform_pol2_factors(platform: LandingPlatformProfile) -> set[str]:
    return {_norm_factor(f) for f in platform.pol2_landing_machine}


def _platform_bridge_factors(platform: LandingPlatformProfile) -> set[str]:
    return {_norm_factor(f) for f in platform.bridge_factors}


def _platform_pause_factors(platform: LandingPlatformProfile) -> set[str]:
    return {_norm_factor(f) for f in platform.pause_release_factors}


def _norm_factor(factor: str) -> str:
    normalized = factor.strip().upper().replace(" ", "_").replace("-", "")
    aliases = {
        "POL_II": "POLII",
        "RNA_POLII": "RNA_POL_II",
        "PTEFB": "PTEFB",
        "PTEF_B": "PTEFB",
        "P300": "P300",
    }
    return aliases.get(normalized, normalized)


def _platform_mediator_orientation_routes(
    platform: LandingPlatformProfile,
    factors: set[str],
) -> tuple[dict[str, str], ...]:
    """Resolve exact TF/motif evidence into TF-tail -> Mediator routes.

    This is the strict chain:
    family window -> exact motif or exact TF -> TF tail -> Mediator route.
    Broad family marks such as ``ETS`` alone are intentionally ignored here.
    """
    tf_symbols: set[str] = set()

    for factor in factors:
        if factor in MEDIATOR_ORIENTATION_ROUTES:
            tf_symbols.add(factor)

    for hit in platform.exact_motif_hits:
        motif_id = _extract_jaspar_motif_id(hit)
        if not motif_id:
            continue
        tf_symbol = JASPAR_MOTIF_TO_MEDIATOR_ROUTE.get(motif_id)
        if tf_symbol:
            tf_symbols.add(tf_symbol)

    routes = [MEDIATOR_ORIENTATION_ROUTES[tf] for tf in sorted(tf_symbols)]
    return tuple(routes)


def _extract_jaspar_motif_id(value: str) -> str | None:
    match = re.search(r"\bMA\d+\.\d+\b", value)
    return match.group(0) if match else None


def _evidence(
    platform: LandingPlatformProfile,
    families: set[str],
    factors: set[str],
    pol2_factors: set[str],
    bridge_factors: set[str],
    pause_factors: set[str],
    orientation_routes: tuple[dict[str, str], ...],
) -> list[str]:
    evidence: list[str] = []
    if families:
        source = "family_windows" if platform.family_windows else "summary_families"
        evidence.append(f"{source}={','.join(sorted(families))}")
    if (pol2_factors | factors).intersection(POL2_LANDING_MACHINE):
        evidence.append("has Pol II landing-machine factor")
    if (factors | bridge_factors).intersection(BRIDGE_FACTORS):
        evidence.append("has explicit bridge/coactivator factor")
    if (pause_factors | factors | bridge_factors).intersection(PAUSE_RELEASE_FACTORS):
        evidence.append("has pause-release factor")
    if platform.tail_classes:
        evidence.append(f"tail_classes={','.join(platform.tail_classes)}")
    if platform.exact_motif_hits:
        evidence.append(f"exact_motif_hits={';'.join(platform.exact_motif_hits)}")
    for route in orientation_routes:
        evidence.append(
            "mediator_orientation_route="
            f"{route['tf_symbol']}->{route['tf_tail']}->{route['mediator_subunit']}"
        )
    return evidence


def _caveats(
    platform: LandingPlatformProfile,
    families: set[str],
    pic_score: float,
    orientation_routes: tuple[dict[str, str], ...],
) -> list[str]:
    caveats: list[str] = []
    if not families:
        caveats.append("no family windows supplied")
    if "GC/ZF" in families:
        caveats.append("GC/ZF is broad: SP/KLF/GATA-like identity is unresolved")
    if "ETS" in families and not orientation_routes:
        caveats.append("ETS is broad: exact ELK1/ETV1/ETV4/ETV5 motif or TF identity is unresolved")
    if pic_score == 0:
        caveats.append("no direct Pol II landing-machine factor supplied")
    if platform.side_hint:
        caveats.append(f"side_hint={platform.side_hint} is external context, not proof")
    return caveats


def _dominant_role(
    address_score: float,
    promoter_score: float,
    pic_score: float,
    bridge_score: float,
) -> tuple[str, str]:
    if pic_score > 0 and promoter_score >= 0.5:
        return "promoter_local_with_pol2_landing_machine", "high"
    if promoter_score >= 1.8 and promoter_score > address_score:
        return "promoter_local_candidate", "medium_high"
    if address_score >= 1.2 and promoter_score < 1.4:
        return "address_candidate", "medium"
    if address_score >= 0.8 and bridge_score >= 0.5:
        return "address_or_bridge_candidate", "medium_low"
    if promoter_score >= 0.8:
        return "weak_promoter_local_candidate", "low_medium"
    return "unresolved", "low"


def _choose_sides(
    platform_a: LandingPlatformProfile,
    platform_b: LandingPlatformProfile,
    role_a: RoleAssessment,
    role_b: RoleAssessment,
) -> tuple[
    tuple[LandingPlatformProfile, RoleAssessment] | None,
    tuple[LandingPlatformProfile, RoleAssessment] | None,
]:
    if role_a.promoter_score + role_a.pic_machine_score > role_b.promoter_score + role_b.pic_machine_score:
        return (platform_b, role_b), (platform_a, role_a)
    if role_b.promoter_score + role_b.pic_machine_score > role_a.promoter_score + role_a.pic_machine_score:
        return (platform_a, role_a), (platform_b, role_b)
    if role_a.address_score > role_b.address_score:
        return (platform_a, role_a), (platform_b, role_b)
    if role_b.address_score > role_a.address_score:
        return (platform_b, role_b), (platform_a, role_a)
    return None, None


def _bridge_rationale(
    platform_a: LandingPlatformProfile,
    platform_b: LandingPlatformProfile,
    role_a: RoleAssessment,
    role_b: RoleAssessment,
    shared_families: tuple[str, ...],
) -> list[str]:
    rationale: list[str] = []
    if shared_families:
        rationale.append(f"shared family grammar: {','.join(shared_families)}")
    factors = _platform_bridge_factors(platform_a).union(_platform_bridge_factors(platform_b))
    explicit = sorted(factors.intersection(BRIDGE_FACTORS))
    orientation_routes = _platform_mediator_orientation_routes(
        platform_a,
        _platform_key_factors(platform_a),
    ) + _platform_mediator_orientation_routes(
        platform_b,
        _platform_key_factors(platform_b),
    )
    route_labels = sorted(
        {
            f"{route['tf_symbol']}->{route['mediator_subunit']}"
            for route in orientation_routes
        }
    )
    if explicit:
        rationale.append(f"explicit bridge factors: {','.join(explicit)}")
    if route_labels:
        rationale.append(f"exact mediator-orientation routes: {','.join(route_labels)}")
    elif role_a.bridge_score > 0 or role_b.bridge_score > 0:
        rationale.append("internal bridge potential only; no explicit pair bridge factor")
    return rationale


def _complex_missing(
    address: tuple[LandingPlatformProfile, RoleAssessment] | None,
    promoter: tuple[LandingPlatformProfile, RoleAssessment] | None,
    shared_families: tuple[str, ...],
    bridge_rationale: list[str],
) -> list[MissingRequirement]:
    missing: list[MissingRequirement] = []
    if not address or not promoter:
        missing.append(
            MissingRequirement(
                requirement="asymmetric_roles",
                why_it_matters="address-landing complex needs one side to look more address-like and the other more promoter/local-like",
                what_would_satisfy=("address regulatory side", "promoter/PIC-compatible side"),
            )
        )
    has_pair_bridge = bool(shared_families) or any(
        item.startswith("explicit bridge factors") for item in bridge_rationale
    )
    if not has_pair_bridge:
        missing.append(
            MissingRequirement(
                requirement="bridge_or_shared_grammar",
                why_it_matters="pair needs shared family grammar or explicit bridge/coactivator support",
                what_would_satisfy=("shared ETS/RUNX/GC-ZF/AP1 grammar", "Mediator", "CBP/p300", "LDB1/LMO2"),
            )
        )
    if promoter and promoter[1].pic_machine_score == 0:
        missing.append(
            MissingRequirement(
                requirement="pol2_landing_machine_on_promoter_side",
                why_it_matters="candidate can be promoter-competent, but direct Pol II loading needs basal/general transcription machinery",
                what_would_satisfy=tuple(sorted(POL2_LANDING_MACHINE)),
            )
        )
    return missing


def _complex_verdict(
    address: tuple[LandingPlatformProfile, RoleAssessment] | None,
    promoter: tuple[LandingPlatformProfile, RoleAssessment] | None,
    bridge_rationale: list[str],
    missing: list[MissingRequirement],
) -> tuple[str, str]:
    missing_names = {m.requirement for m in missing}
    has_pair_bridge = bool(bridge_rationale) and not all(
        item.startswith("internal bridge potential") for item in bridge_rationale
    )
    if address and promoter and has_pair_bridge and "pol2_landing_machine_on_promoter_side" not in missing_names:
        return "assembles_address_landing_complex", "high"
    if address and promoter and has_pair_bridge:
        return "partial_address_landing_complex_missing_pol2_machine", "medium"
    if address and promoter:
        return "role_asymmetry_without_bridge", "low_medium"
    if "bridge_or_shared_grammar" in missing_names:
        return "does_not_assemble_without_context", "low"
    return "unresolved_complex", "low"
