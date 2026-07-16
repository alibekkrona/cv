from __future__ import annotations

import os
import time

import psycopg
from psycopg.types.json import Jsonb


DATABASE_URL = os.environ["DATABASE_URL"]


def connect_with_retry() -> psycopg.Connection:
    for attempt in range(1, 31):
        try:
            return psycopg.connect(DATABASE_URL)
        except psycopg.OperationalError:
            if attempt == 30:
                raise
            print(f"database not ready; retrying ({attempt}/30)", flush=True)
            time.sleep(2)
    raise RuntimeError("database connection retry exhausted")


def main() -> None:
    with connect_with_retry() as conn:
        with conn.cursor() as cur:
            cur.execute("select count(*) from runs")
            if cur.fetchone()[0]:
                print("Pattern DNA demonstration data is already present.")
                return

            cur.execute(
                """
                insert into runs (run_name, script_name, parameters, input_paths, notes)
                values (%s, %s, %s, %s, %s)
                returning run_id
                """,
                (
                    "public_demo_seed_v1",
                    "api/bootstrap.py",
                    Jsonb({"dataset": "synthetic", "window_bp": 1_000_000}),
                    Jsonb(["data/synthetic-regulatory-window"]),
                    "Reproducible portfolio dataset; not a biological claim.",
                ),
            )
            run_id = cur.fetchone()[0]

            cur.execute(
                """
                insert into chromosomes (chrom, reference_build, length_bp, features)
                values (%s, %s, %s, %s)
                """,
                (
                    "Demo",
                    "Synthetic GRCh38-shaped sample",
                    1_000_000,
                    Jsonb({"purpose": "portfolio demonstration", "scientific_status": "synthetic"}),
                ),
            )

            regions = [
                ("R-ADDR-1", 70_000, 92_000, "enhancer", "+", 0.91, {
                    "label": "Address platform A",
                    "families": ["AP1/CREB/bZIP", "ETS"],
                    "exact_motifs": ["MA0028.3 ELK1"],
                    "key_factors": ["ELK1", "MED23"],
                }),
                ("R-LOCAL-1", 118_000, 121_500, "promoter", "+", 0.96, {
                    "label": "Local landing platform A",
                    "families": ["GC/ZF", "RUNX"],
                    "key_factors": ["TBP", "TFIID", "POLR2A"],
                }),
                ("R-BOUND-1", 248_000, 252_000, "boundary", ".", 0.82, {
                    "label": "Field boundary A",
                    "families": ["CTCF"],
                }),
                ("R-ADDR-2", 335_000, 362_000, "enhancer", "-", 0.88, {
                    "label": "Address platform B",
                    "families": ["homeobox/FOX", "nuclear_receptor"],
                    "key_factors": ["P300", "MED1"],
                }),
                ("R-LOCAL-2", 388_000, 392_000, "promoter", "-", 0.94, {
                    "label": "Local landing platform B",
                    "families": ["GC/ZF", "ETS"],
                    "key_factors": ["TBP", "TFIIB", "POLII"],
                }),
                ("R-DUAL-1", 510_000, 526_000, "unknown", "+", 0.73, {
                    "label": "Context-dependent platform",
                    "families": ["ETS", "GC/ZF"],
                    "exact_motifs": ["MA0764.4 ETV4"],
                    "key_factors": ["ETV4", "MED25"],
                }),
                ("R-BOUND-2", 684_000, 689_000, "boundary", ".", 0.79, {
                    "label": "Field boundary B",
                    "families": ["CTCF"],
                }),
            ]

            region_ids: dict[str, int] = {}
            for key, start, end, region_type, chain, score, features in regions:
                cur.execute(
                    """
                    insert into regions (
                      region_key, chrom, start_pos, end_pos, region_type, chain,
                      score, source_run_id, features
                    )
                    values (%s, 'Demo', %s, %s, %s, %s, %s, %s, %s)
                    returning region_id
                    """,
                    (key, start, end, region_type, chain, score, run_id, Jsonb(features)),
                )
                region_ids[key] = cur.fetchone()[0]

            modes = [
                ("baseline", "Baseline reading mode", "baseline", "Stable local landing and field access."),
                ("stress-response", "Stress-response mode", "stress", "Context shifts the dual platform toward an address role."),
            ]
            mode_ids: dict[str, int] = {}
            for key, title, state, description in modes:
                cur.execute(
                    """
                    insert into reading_modes (
                      mode_key, title, cell_state, description, parameters, source_run_id
                    )
                    values (%s, %s, %s, %s, %s, %s)
                    returning reading_mode_id
                    """,
                    (key, title, state, description, Jsonb({"synthetic": True}), run_id),
                )
                mode_ids[key] = cur.fetchone()[0]

            role_rows = [
                ("baseline", "R-ADDR-1", "address_like", 0.91),
                ("baseline", "R-LOCAL-1", "promoter_local", 0.96),
                ("baseline", "R-BOUND-1", "field_boundary", 0.82),
                ("baseline", "R-ADDR-2", "address_like", 0.88),
                ("baseline", "R-LOCAL-2", "promoter_local", 0.94),
                ("baseline", "R-DUAL-1", "promoter_support", 0.69),
                ("baseline", "R-BOUND-2", "field_boundary", 0.79),
                ("stress-response", "R-ADDR-1", "address_like", 0.93),
                ("stress-response", "R-LOCAL-1", "promoter_local", 0.92),
                ("stress-response", "R-BOUND-1", "field_boundary", 0.82),
                ("stress-response", "R-ADDR-2", "address_like", 0.90),
                ("stress-response", "R-LOCAL-2", "promoter_local", 0.89),
                ("stress-response", "R-DUAL-1", "address_bridge", 0.87),
                ("stress-response", "R-BOUND-2", "field_boundary", 0.79),
            ]
            for mode_key, region_key, role_type, confidence in role_rows:
                cur.execute(
                    """
                    insert into region_roles (
                      reading_mode_id, region_id, role_type, confidence, evidence
                    )
                    values (%s, %s, %s, %s, %s)
                    """,
                    (
                        mode_ids[mode_key],
                        region_ids[region_key],
                        role_type,
                        confidence,
                        Jsonb({"source": "public_demo_seed", "contextual": True}),
                    ),
                )

            fields = [
                ("FIELD-A", "+", "-", 105_000, 270_000, 0.93, {"label": "Synthetic pre-mRNA field A"}),
                ("FIELD-B", "-", "+", 375_000, 705_000, 0.89, {"label": "Synthetic pre-mRNA field B"}),
            ]
            field_ids: dict[str, int] = {}
            for key, target, poll, start, end, score, features in fields:
                cur.execute(
                    """
                    insert into premrna_fields (
                      field_key, chrom, target_chain, poll_chain, start_pos, end_pos,
                      support_score, source_run_id, features
                    )
                    values (%s, 'Demo', %s, %s, %s, %s, %s, %s, %s)
                    returning field_id
                    """,
                    (key, target, poll, start, end, score, run_id, Jsonb(features)),
                )
                field_ids[key] = cur.fetchone()[0]

            complexes = [
                ("C-BASE-A", "baseline", "FIELD-A", "supported", 0.94, [
                    ("R-ADDR-1", "address_part", 1),
                    ("R-LOCAL-1", "local_landing_part", 2),
                ]),
                ("C-BASE-B", "baseline", "FIELD-B", "supported", 0.88, [
                    ("R-ADDR-2", "address_part", 1),
                    ("R-LOCAL-2", "local_landing_part", 2),
                    ("R-DUAL-1", "promoter_support", 3),
                ]),
                ("C-STRESS-B", "stress-response", "FIELD-B", "supported", 0.91, [
                    ("R-ADDR-2", "address_part", 1),
                    ("R-DUAL-1", "address_bridge", 2),
                    ("R-LOCAL-2", "local_landing_part", 3),
                ]),
            ]
            for key, mode_key, field_key, status, confidence, members in complexes:
                cur.execute(
                    """
                    insert into pol2_landing_complexes (
                      complex_key, reading_mode_id, field_id, status, confidence,
                      evidence, source_run_id
                    )
                    values (%s, %s, %s, %s, %s, %s, %s)
                    returning complex_id
                    """,
                    (
                        key,
                        mode_ids[mode_key],
                        field_ids[field_key],
                        status,
                        confidence,
                        Jsonb({"rule": "address + local landing", "synthetic": True}),
                        run_id,
                    ),
                )
                complex_id = cur.fetchone()[0]
                for region_key, member_role, order in members:
                    cur.execute(
                        """
                        insert into pol2_landing_complex_members (
                          complex_id, region_id, member_role, member_order, evidence
                        )
                        values (%s, %s, %s, %s, %s)
                        """,
                        (
                            complex_id,
                            region_ids[region_key],
                            member_role,
                            order,
                            Jsonb({"mode": mode_key}),
                        ),
                    )

            exams = [
                ("baseline", "field_coverage", "Baseline field coverage", 18, 3, 1, 0.90),
                ("stress-response", "role_resolution", "Contextual role resolution", 19, 1, 0, 0.95),
            ]
            for mode_key, exam_type, label, exact, near, missing, fraction in exams:
                cur.execute(
                    """
                    insert into exam_results (
                      run_id, reading_mode_id, exam_type, label, exact_count,
                      near_count, missing_count, fraction, metrics
                    )
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        run_id,
                        mode_ids[mode_key],
                        exam_type,
                        label,
                        exact,
                        near,
                        missing,
                        fraction,
                        Jsonb({"dataset": "synthetic", "repeatable": True}),
                    ),
                )

            rules = [
                (
                    "object-role-separation",
                    "modeling",
                    "Object and role are separate",
                    "A stable genomic object may receive different roles in different reading modes.",
                ),
                (
                    "field-selects-landing",
                    "assembly",
                    "Field selects its local landing",
                    "A pre-mRNA field resolves a compatible local landing instead of allowing one site to own many fields.",
                ),
                (
                    "evidence-before-claim",
                    "verification",
                    "Evidence before biological claim",
                    "Synthetic and provisional layers remain explicitly labeled until independent evidence is available.",
                ),
            ]
            for key, group, title, statement in rules:
                cur.execute(
                    """
                    insert into model_rules (
                      rule_key, rule_group, title, statement, evidence
                    )
                    values (%s, %s, %s, %s, %s)
                    """,
                    (key, group, title, statement, Jsonb({"run_id": run_id})),
                )

        conn.commit()
    print("Pattern DNA public demonstration data is ready.")


if __name__ == "__main__":
    main()
