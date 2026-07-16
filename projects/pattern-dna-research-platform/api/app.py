from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import psycopg
from flask import Flask, jsonify, request, send_from_directory
from psycopg.rows import dict_row

from role_resolver.models import LandingPlatformProfile, ReadingContext
from role_resolver.resolver import assess_complex, resolve_role


DIST = Path(__file__).resolve().parent / "viewer_dist"
app = Flask(__name__, static_folder=None)


def connection() -> psycopg.Connection:
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


def fetch_all(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())


def fetch_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


@app.get("/api/health")
def health():
    row = fetch_one("select current_database() as database, now() as at")
    return jsonify({"status": "ok", **(row or {})})


@app.get("/api/overview")
def overview():
    counts = fetch_one(
        """
        select
          (select count(*) from runs) as runs,
          (select count(*) from regions) as regions,
          (select count(*) from reading_modes) as reading_modes,
          (select count(*) from region_roles) as region_roles,
          (select count(*) from premrna_fields) as fields,
          (select count(*) from pol2_landing_complexes) as complexes,
          (select count(*) from exam_results) as exams,
          (select count(*) from model_rules) as rules
        """
    )
    modes = fetch_all(
        """
        select mode_key, title, cell_state, description
        from reading_modes
        order by reading_mode_id
        """
    )
    exams = fetch_all(
        """
        select rm.mode_key, e.exam_type, e.label, e.exact_count, e.near_count,
               e.missing_count, e.fraction, e.metrics
        from exam_results e
        join reading_modes rm on rm.reading_mode_id = e.reading_mode_id
        order by e.exam_id
        """
    )
    rules = fetch_all(
        """
        select rule_key, rule_group, title, statement, status
        from model_rules
        order by rule_id
        """
    )
    run = fetch_one(
        """
        select run_name, script_name, parameters, input_paths, notes, created_at
        from runs
        order by run_id desc
        limit 1
        """
    )
    return jsonify({"counts": counts, "modes": modes, "exams": exams, "rules": rules, "run": run})


@app.get("/api/chromosomes")
def chromosomes():
    rows = fetch_all(
        """
        select c.chrom, c.reference_build, c.length_bp, c.features,
               count(distinct r.region_id) as regions,
               count(distinct f.field_id) as fields
        from chromosomes c
        left join regions r on r.chrom = c.chrom
        left join premrna_fields f on f.chrom = c.chrom
        group by c.chrom
        order by c.chrom
        """
    )
    return jsonify({"chromosomes": rows})


@app.get("/api/chromosomes/<chrom>/viewport")
def viewport(chrom: str):
    start = max(1, int(request.args.get("start", "1")))
    chromosome = fetch_one(
        "select chrom, reference_build, length_bp, features from chromosomes where chrom = %s",
        (chrom,),
    )
    if not chromosome:
        return jsonify({"error": "chromosome not found"}), 404

    end = min(int(chromosome["length_bp"]), int(request.args.get("end", chromosome["length_bp"])))
    mode_key = request.args.get("mode", "baseline")
    regions = fetch_all(
        """
        select r.region_key, r.start_pos, r.end_pos, r.region_type, r.chain,
               r.score, r.features, rr.role_type, rr.confidence
        from regions r
        join region_roles rr on rr.region_id = r.region_id
        join reading_modes rm on rm.reading_mode_id = rr.reading_mode_id
        where r.chrom = %s
          and rm.mode_key = %s
          and r.start_pos <= %s
          and r.end_pos >= %s
        order by r.start_pos
        """,
        (chrom, mode_key, end, start),
    )
    fields = fetch_all(
        """
        select field_key, start_pos, end_pos, target_chain, poll_chain,
               support_score, features
        from premrna_fields
        where chrom = %s and start_pos <= %s and end_pos >= %s
        order by start_pos
        """,
        (chrom, end, start),
    )
    complexes = fetch_all(
        """
        select c.complex_key, c.status, c.confidence, f.field_key,
               json_agg(
                 json_build_object(
                   'region_key', r.region_key,
                   'member_role', m.member_role,
                   'member_order', m.member_order
                 )
                 order by m.member_order
               ) as members
        from pol2_landing_complexes c
        join reading_modes rm on rm.reading_mode_id = c.reading_mode_id
        join premrna_fields f on f.field_id = c.field_id
        join pol2_landing_complex_members m on m.complex_id = c.complex_id
        join regions r on r.region_id = m.region_id
        where rm.mode_key = %s and f.chrom = %s
        group by c.complex_id, f.field_key
        order by c.complex_id
        """,
        (mode_key, chrom),
    )
    return jsonify({
        "chromosome": chromosome,
        "start": start,
        "end": end,
        "mode": mode_key,
        "regions": regions,
        "fields": fields,
        "complexes": complexes,
    })


@app.post("/api/resolve")
def resolve():
    payload = request.get_json(force=True)
    context = ReadingContext.from_dict(payload.get("context"))
    platform_a = LandingPlatformProfile.from_dict(payload["platform_a"])
    platform_b = LandingPlatformProfile.from_dict(payload["platform_b"])
    return jsonify({
        "platform_a": resolve_role(platform_a, context).to_dict(),
        "platform_b": resolve_role(platform_b, context).to_dict(),
        "complex": assess_complex(platform_a, platform_b, context).to_dict(),
    })


@app.get("/")
def index():
    return send_from_directory(DIST, "index.html")


@app.get("/<path:asset_path>")
def assets(asset_path: str):
    path = DIST / asset_path
    if path.exists() and path.is_file():
        return send_from_directory(DIST, asset_path)
    return send_from_directory(DIST, "index.html")
