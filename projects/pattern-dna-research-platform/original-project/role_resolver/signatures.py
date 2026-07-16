"""Explainable signatures for address/promoter role assignment."""

ADDRESS_FAMILY_WEIGHTS: dict[str, float] = {
    "ETS": 0.8,
    "AP1/CREB/bZIP": 1.0,
    "nuclear_receptor": 1.0,
    "homeobox/FOX": 0.8,
    "bHLH/helix": 0.8,
    "IRF": 0.9,
    "HMG": 0.6,
    "T-box": 0.7,
    "GC/ZF": 0.35,
}

PROMOTER_FAMILY_WEIGHTS: dict[str, float] = {
    "GC/ZF": 1.0,
    "RUNX": 0.9,
    "ETS": 0.55,
    "AP1/CREB/bZIP": 0.35,
    "core_promoter_machinery": 1.5,
}

BRIDGE_FAMILY_WEIGHTS: dict[str, float] = {
    "ETS": 0.35,
    "RUNX": 0.35,
    "GC/ZF": 0.25,
    "AP1/CREB/bZIP": 0.5,
    "nuclear_receptor": 0.5,
    "bHLH/helix": 0.4,
    "homeobox/FOX": 0.35,
}

POL2_LANDING_MACHINE: set[str] = {
    "TFIID",
    "TBP",
    "TAF",
    "TAFS",
    "TFIIA",
    "TFIIB",
    "TFIIF",
    "TFIIE",
    "TFIIH",
    "PIC",
    "RNA_POL_II",
    "POLR2A",
    "POLII",
}

BRIDGE_FACTORS: set[str] = {
    "MEDIATOR",
    "MED",
    "MED1",
    "MED12",
    "MED23",
    "CBP",
    "CREBBP",
    "P300",
    "EP300",
    "LDB1",
    "LMO2",
    "SWI/SNF",
    "BAF",
}

MEDIATOR_ORIENTATION_ROUTES: dict[str, dict[str, str]] = {
    "ELK1": {
        "route_id": "ETS_ELK_MED23",
        "key_family": "ETS",
        "tf_symbol": "ELK1",
        "tf_tail": "phosphorylated_transactivation_domain",
        "mediator_subunit": "MED23",
        "mediator_region": "MED23_tail_module",
        "route_role": "address_side_mediator_tail_hook",
    },
    "ETV1": {
        "route_id": "ETS_PEA3_MED25",
        "key_family": "ETS",
        "tf_symbol": "ETV1",
        "tf_tail": "acidic_aromatic_activation_domain",
        "mediator_subunit": "MED25",
        "mediator_region": "MED25_ACID_PTOV_domain",
        "route_role": "address_side_mediator_tail_hook",
    },
    "ETV4": {
        "route_id": "ETS_PEA3_MED25",
        "key_family": "ETS",
        "tf_symbol": "ETV4",
        "tf_tail": "acidic_aromatic_activation_domain",
        "mediator_subunit": "MED25",
        "mediator_region": "MED25_ACID_PTOV_domain",
        "route_role": "address_side_mediator_tail_hook",
    },
    "ETV5": {
        "route_id": "ETS_PEA3_MED25",
        "key_family": "ETS",
        "tf_symbol": "ETV5",
        "tf_tail": "acidic_aromatic_activation_domain",
        "mediator_subunit": "MED25",
        "mediator_region": "MED25_ACID_PTOV_domain",
        "route_role": "address_side_mediator_tail_hook",
    },
}

JASPAR_MOTIF_TO_MEDIATOR_ROUTE: dict[str, str] = {
    "MA0028.3": "ELK1",
    "MA0761.3": "ETV1",
    "MA0764.4": "ETV4",
    "MA0765.4": "ETV5",
}

PAUSE_RELEASE_FACTORS: set[str] = {
    "BRD4",
    "P-TEFB",
    "PTEFB",
    "CDK9",
    "CCNT1",
}

ADDRESS_REQUIRED_FAMILIES: tuple[str, ...] = (
    "ETS",
    "AP1/CREB/bZIP",
    "nuclear_receptor",
    "homeobox/FOX",
    "bHLH/helix",
    "IRF",
)

PROMOTER_COMPETENCE_FAMILIES: tuple[str, ...] = (
    "GC/ZF",
    "RUNX",
    "ETS",
    "core_promoter_machinery",
)
