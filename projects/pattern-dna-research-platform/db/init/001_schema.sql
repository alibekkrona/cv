create extension if not exists btree_gist;

create table if not exists runs (
  run_id bigserial primary key,
  run_name text not null,
  script_name text,
  parameters jsonb not null default '{}'::jsonb,
  input_paths jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists chromosomes (
  chrom text primary key,
  reference_build text not null,
  length_bp bigint not null,
  features jsonb not null default '{}'::jsonb
);

create table if not exists regions (
  region_id bigserial primary key,
  region_key text not null unique,
  chrom text not null references chromosomes(chrom),
  start_pos bigint not null,
  end_pos bigint not null,
  region_type text not null,
  chain text,
  score double precision,
  source_run_id bigint references runs(run_id),
  features jsonb not null default '{}'::jsonb,
  constraint regions_interval_check check (start_pos > 0 and end_pos >= start_pos),
  constraint regions_chain_check check (chain in ('+', '-', '.', null))
);

create index if not exists regions_coord_idx
  on regions using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));

create table if not exists reading_modes (
  reading_mode_id bigserial primary key,
  mode_key text not null unique,
  title text not null,
  cell_state text,
  description text,
  parameters jsonb not null default '{}'::jsonb,
  source_run_id bigint references runs(run_id)
);

create table if not exists region_roles (
  region_role_id bigserial primary key,
  reading_mode_id bigint not null references reading_modes(reading_mode_id) on delete cascade,
  region_id bigint not null references regions(region_id) on delete cascade,
  role_type text not null,
  confidence double precision,
  evidence jsonb not null default '{}'::jsonb,
  unique (reading_mode_id, region_id, role_type)
);

create table if not exists premrna_fields (
  field_id bigserial primary key,
  field_key text not null unique,
  chrom text not null references chromosomes(chrom),
  target_chain text not null,
  poll_chain text not null,
  start_pos bigint not null,
  end_pos bigint not null,
  support_score double precision,
  source_run_id bigint references runs(run_id),
  features jsonb not null default '{}'::jsonb,
  constraint fields_interval_check check (start_pos > 0 and end_pos >= start_pos),
  constraint fields_target_chain_check check (target_chain in ('+', '-')),
  constraint fields_poll_chain_check check (poll_chain in ('+', '-')),
  constraint fields_opposite_chains check (target_chain <> poll_chain)
);

create index if not exists premrna_fields_coord_idx
  on premrna_fields using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));

create table if not exists pol2_landing_complexes (
  complex_id bigserial primary key,
  complex_key text not null unique,
  reading_mode_id bigint not null references reading_modes(reading_mode_id) on delete cascade,
  field_id bigint not null references premrna_fields(field_id) on delete cascade,
  status text not null,
  confidence double precision,
  evidence jsonb not null default '{}'::jsonb,
  source_run_id bigint references runs(run_id)
);

create table if not exists pol2_landing_complex_members (
  complex_id bigint not null references pol2_landing_complexes(complex_id) on delete cascade,
  region_id bigint not null references regions(region_id) on delete cascade,
  member_role text not null,
  member_order integer,
  evidence jsonb not null default '{}'::jsonb,
  primary key (complex_id, region_id, member_role)
);

create table if not exists exam_results (
  exam_id bigserial primary key,
  run_id bigint references runs(run_id),
  reading_mode_id bigint references reading_modes(reading_mode_id),
  exam_type text not null,
  label text not null,
  exact_count integer not null default 0,
  near_count integer not null default 0,
  missing_count integer not null default 0,
  fraction double precision,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists model_rules (
  rule_id bigserial primary key,
  rule_key text not null unique,
  rule_group text not null,
  title text not null,
  statement text not null,
  status text not null default 'active',
  evidence jsonb not null default '{}'::jsonb
);
