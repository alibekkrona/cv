create extension if not exists pg_trgm;
create extension if not exists btree_gist;

create table if not exists runs (
  run_id bigserial primary key,
  run_name text not null,
  script_name text,
  script_version text,
  parameters jsonb not null default '{}'::jsonb,
  input_paths jsonb not null default '[]'::jsonb,
  output_paths jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists chromosomes (
  chrom text primary key,
  reference_build text not null default 'GRCh38',
  length_bp bigint,
  fasta_path text,
  features jsonb not null default '{}'::jsonb
);

create table if not exists model_rules (
  rule_id bigserial primary key,
  rule_key text not null unique,
  rule_group text not null,
  title text not null,
  statement text not null,
  status text not null default 'active',
  version text not null default 'v1',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists mechanics (
  mechanic_id bigserial primary key,
  mechanic_key text not null unique,
  mechanic_type text not null,
  title text not null,
  description text,
  parameters jsonb not null default '{}'::jsonb,
  status text not null default 'experimental',
  created_at timestamptz not null default now()
);

create table if not exists regions (
  region_id bigserial primary key,
  chrom text not null references chromosomes(chrom),
  start_pos bigint not null,
  end_pos bigint not null,
  region_type text not null,
  chain text,
  score double precision,
  source_run_id bigint references runs(run_id),
  source_id text,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint regions_valid_interval check (start_pos > 0 and end_pos >= start_pos),
  constraint regions_chain_check check (chain in ('+', '-', '.', null)),
  constraint regions_type_check check (region_type in ('promoter', 'enhancer', 'boundary', 'motif_cluster', 'unknown'))
);

create index if not exists regions_coord_idx on regions using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));
create index if not exists regions_type_idx on regions(region_type);
create index if not exists regions_source_idx on regions(source_run_id, source_id);

create table if not exists motif_models (
  motif_model_id bigserial primary key,
  motif_key text not null unique,
  motif_name text,
  motif_family text,
  motif_kind text not null default 'sequence',
  consensus text,
  model jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists keys (
  key_id bigserial primary key,
  key_name text not null,
  key_type text not null,
  family text,
  binding_domain text,
  description text,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint keys_type_check check (key_type in ('TF', 'PF', 'unknown'))
);

create unique index if not exists keys_name_type_uidx on keys(key_name, key_type);

create table if not exists key_motif_models (
  key_id bigint not null references keys(key_id) on delete cascade,
  motif_model_id bigint not null references motif_models(motif_model_id) on delete cascade,
  relation_type text not null default 'binds',
  evidence jsonb not null default '{}'::jsonb,
  primary key (key_id, motif_model_id, relation_type)
);

create table if not exists motif_hits (
  motif_hit_id bigserial primary key,
  chrom text not null references chromosomes(chrom),
  start_pos bigint not null,
  end_pos bigint not null,
  strand text,
  motif_model_id bigint references motif_models(motif_model_id),
  sequence text,
  score double precision,
  region_id bigint references regions(region_id),
  source_run_id bigint references runs(run_id),
  features jsonb not null default '{}'::jsonb,
  constraint motif_hits_valid_interval check (start_pos > 0 and end_pos >= start_pos),
  constraint motif_hits_strand_check check (strand in ('+', '-', '.', null))
);

create index if not exists motif_hits_coord_idx on motif_hits using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));
create index if not exists motif_hits_region_idx on motif_hits(region_id);
create index if not exists motif_hits_model_idx on motif_hits(motif_model_id);

create table if not exists region_key_hits (
  region_key_hit_id bigserial primary key,
  region_id bigint references regions(region_id),
  motif_hit_id bigint references motif_hits(motif_hit_id),
  key_id bigint references keys(key_id),
  score double precision,
  evidence jsonb not null default '{}'::jsonb,
  source_run_id bigint references runs(run_id),
  constraint region_key_hits_has_anchor check (region_id is not null or motif_hit_id is not null)
);

create index if not exists region_key_hits_region_idx on region_key_hits(region_id);
create index if not exists region_key_hits_key_idx on region_key_hits(key_id);
create index if not exists region_key_hits_motif_hit_idx on region_key_hits(motif_hit_id);

create table if not exists regulatory_links (
  regulatory_link_id bigserial primary key,
  source_region_id bigint references regions(region_id),
  target_region_id bigint references regions(region_id),
  link_type text not null,
  distance_bp bigint,
  orientation text,
  score double precision,
  evidence jsonb not null default '{}'::jsonb,
  source_run_id bigint references runs(run_id),
  created_at timestamptz not null default now(),
  constraint regulatory_links_type_check check (link_type in ('enhancer_promoter', 'promoter_field', 'candidate', 'unknown'))
);

create index if not exists regulatory_links_source_idx on regulatory_links(source_region_id);
create index if not exists regulatory_links_target_idx on regulatory_links(target_region_id);

create table if not exists premrna_fields (
  field_id bigserial primary key,
  field_key text unique,
  chrom text not null references chromosomes(chrom),
  target_chain text not null,
  poll_chain text not null,
  start_pos bigint not null,
  end_pos bigint not null,
  promoter_region_id bigint references regions(region_id),
  end_signal_pos bigint,
  end_signal_sequence text,
  support_score double precision,
  source_run_id bigint references runs(run_id),
  source_id text,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint premrna_fields_valid_interval check (start_pos > 0 and end_pos >= start_pos),
  constraint premrna_fields_target_chain_check check (target_chain in ('+', '-')),
  constraint premrna_fields_poll_chain_check check (poll_chain in ('+', '-')),
  constraint premrna_fields_opposite_chains check (target_chain <> poll_chain)
);

create index if not exists premrna_fields_coord_idx on premrna_fields using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));
create index if not exists premrna_fields_promoter_idx on premrna_fields(promoter_region_id);
create index if not exists premrna_fields_source_idx on premrna_fields(source_run_id, source_id);

create table if not exists merged_premrna_fields (
  merged_field_id bigserial primary key,
  merged_field_key text unique,
  chrom text not null references chromosomes(chrom),
  target_chain text not null,
  poll_chain text not null,
  start_pos bigint not null,
  end_pos bigint not null,
  input_field_count integer,
  support_score double precision,
  merge_rule_id bigint references mechanics(mechanic_id),
  source_run_id bigint references runs(run_id),
  source_id text,
  features jsonb not null default '{}'::jsonb,
  constraint merged_fields_valid_interval check (start_pos > 0 and end_pos >= start_pos),
  constraint merged_fields_target_chain_check check (target_chain in ('+', '-')),
  constraint merged_fields_poll_chain_check check (poll_chain in ('+', '-')),
  constraint merged_fields_opposite_chains check (target_chain <> poll_chain)
);

create index if not exists merged_premrna_fields_coord_idx on merged_premrna_fields using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));
create index if not exists merged_premrna_fields_source_idx on merged_premrna_fields(source_run_id, source_id);

create table if not exists merged_field_members (
  merged_field_id bigint not null references merged_premrna_fields(merged_field_id) on delete cascade,
  field_id bigint not null references premrna_fields(field_id) on delete cascade,
  member_order integer,
  primary key (merged_field_id, field_id)
);

create table if not exists pattern_part_candidates (
  part_id bigserial primary key,
  chrom text not null references chromosomes(chrom),
  target_chain text not null,
  start_pos bigint not null,
  end_pos bigint not null,
  score double precision,
  boundary_score double precision,
  source_rule text,
  source_run_id bigint references runs(run_id),
  source_id text,
  features jsonb not null default '{}'::jsonb,
  constraint pattern_parts_valid_interval check (start_pos > 0 and end_pos >= start_pos),
  constraint pattern_parts_target_chain_check check (target_chain in ('+', '-'))
);

create index if not exists pattern_part_candidates_coord_idx on pattern_part_candidates using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));
create index if not exists pattern_part_candidates_source_idx on pattern_part_candidates(source_run_id, source_id);

create table if not exists slice_sites (
  slice_site_id bigserial primary key,
  chrom text not null references chromosomes(chrom),
  target_chain text not null,
  field_id bigint references merged_premrna_fields(merged_field_id),
  genomic_pos bigint not null,
  oriented_pos bigint,
  slice_kind text not null,
  support_part_count integer not null default 0,
  start_support_count integer not null default 0,
  end_support_count integer not null default 0,
  max_score double precision,
  source_run_id bigint references runs(run_id),
  features jsonb not null default '{}'::jsonb,
  constraint slice_sites_pos_check check (genomic_pos > 0),
  constraint slice_sites_target_chain_check check (target_chain in ('+', '-')),
  constraint slice_sites_kind_check check (slice_kind in ('possible_part_start', 'possible_part_end', 'possible_start_and_end', 'unknown'))
);

create index if not exists slice_sites_pos_idx on slice_sites(chrom, target_chain, genomic_pos);
create index if not exists slice_sites_field_idx on slice_sites(field_id);

create table if not exists slice_zones (
  slice_zone_id bigserial primary key,
  chrom text not null references chromosomes(chrom),
  target_chain text not null,
  field_id bigint references merged_premrna_fields(merged_field_id),
  start_pos bigint not null,
  end_pos bigint not null,
  center_pos bigint,
  zone_type text not null default 'possible_cut_zone',
  support_count integer,
  source_run_id bigint references runs(run_id),
  features jsonb not null default '{}'::jsonb,
  constraint slice_zones_valid_interval check (start_pos > 0 and end_pos >= start_pos),
  constraint slice_zones_target_chain_check check (target_chain in ('+', '-'))
);

create index if not exists slice_zones_coord_idx on slice_zones using gist (chrom, int8range(start_pos, end_pos + 1, '[]'));
create index if not exists slice_zones_field_idx on slice_zones(field_id);

create table if not exists field_addresses (
  address_id bigserial primary key,
  field_id bigint references merged_premrna_fields(merged_field_id),
  promoter_region_id bigint references regions(region_id),
  enhancer_set jsonb not null default '[]'::jsonb,
  tf_key_signature jsonb not null default '[]'::jsonb,
  pf_key_signature jsonb not null default '[]'::jsonb,
  cell_state text,
  confidence double precision,
  evidence jsonb not null default '{}'::jsonb,
  source_run_id bigint references runs(run_id),
  created_at timestamptz not null default now()
);

create index if not exists field_addresses_field_idx on field_addresses(field_id);
create index if not exists field_addresses_promoter_idx on field_addresses(promoter_region_id);

create table if not exists assembly_routes (
  route_id bigserial primary key,
  field_id bigint references merged_premrna_fields(merged_field_id),
  address_id bigint references field_addresses(address_id),
  route_key text,
  selected_parts jsonb not null default '[]'::jsonb,
  selected_slice_sites jsonb not null default '[]'::jsonb,
  tf_key_signature jsonb not null default '[]'::jsonb,
  pf_key_signature jsonb not null default '[]'::jsonb,
  cell_state text,
  score double precision,
  source_run_id bigint references runs(run_id),
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assembly_routes_field_idx on assembly_routes(field_id);
create index if not exists assembly_routes_address_idx on assembly_routes(address_id);

create table if not exists exam_targets (
  target_id bigserial primary key,
  transcript_id text not null,
  gene_id text,
  gene_name text,
  chrom text not null references chromosomes(chrom),
  strand text not null,
  transcript_start bigint,
  transcript_end bigint,
  part_start bigint not null,
  part_end bigint not null,
  part_rank integer,
  annotation_source text not null,
  features jsonb not null default '{}'::jsonb,
  constraint exam_targets_valid_part check (part_start > 0 and part_end >= part_start),
  constraint exam_targets_strand_check check (strand in ('+', '-'))
);

create index if not exists exam_targets_coord_idx on exam_targets using gist (chrom, int8range(part_start, part_end + 1, '[]'));
create index if not exists exam_targets_tx_idx on exam_targets(transcript_id);

create table if not exists exam_results (
  exam_id bigserial primary key,
  run_id bigint references runs(run_id),
  chrom text references chromosomes(chrom),
  exam_type text not null,
  label text,
  window_bp integer,
  known_internal_parts integer,
  exact_count integer,
  near_count integer,
  one_side_count integer,
  missing_count integer,
  fraction double precision,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint exam_results_type_check check (exam_type in ('whole_part', 'slice_edge', 'field_coverage', 'error_diagnostic', 'other'))
);

create table if not exists exam_error_rows (
  error_row_id bigserial primary key,
  exam_id bigint references exam_results(exam_id) on delete cascade,
  transcript_id text,
  gene_id text,
  gene_name text,
  field_id bigint references merged_premrna_fields(merged_field_id),
  known_start bigint,
  known_end bigint,
  best_found_start bigint,
  best_found_end bigint,
  start_distance bigint,
  end_distance bigint,
  relation text,
  error_class text,
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists exam_error_rows_exam_idx on exam_error_rows(exam_id);
create index if not exists exam_error_rows_class_idx on exam_error_rows(error_class);

insert into model_rules (rule_key, rule_group, title, statement, version)
values
  ('read_as_pol2', 'reading', 'Read As Pol II', 'DNA must be read as Pol II: movement and copied instruction are different chain roles.', 'v1'),
  ('promoter_on_poll_track', 'chains', 'Promoter On Poll Track', 'Promoter belongs to poll-track-chain, while instruction belongs to target-chain.', 'v1'),
  ('end_signal_on_target', 'chains', 'End Signal On Target', 'The transcription end-processing signal is meaningful on target-chain for the produced RNA instruction.', 'v1'),
  ('premrna_field_possibility', 'field', 'Pre-mRNA Field', 'A pre-mRNA field is a field of possibilities, not a finished gene object.', 'v1'),
  ('exon_intron_roles', 'assembly', 'Exon/Intron Roles', 'Exon and intron are roles after a concrete assembly, not permanent area identities.', 'v1'),
  ('slice_zone', 'assembly', 'Slice Zone', 'A slice can be a site or a zone of possible cut.', 'v1'),
  ('mature_mrna_route', 'assembly', 'Mature mRNA Route', 'Mature mRNA is a selected route through possible parts and slice zones; order is not permuted.', 'v1'),
  ('tf_pf_keys', 'keys', 'TF/PF Keys', 'TF keys address/open fields; PF keys influence pattern assembly and slice selection.', 'v1')
on conflict (rule_key) do nothing;

insert into mechanics (mechanic_key, mechanic_type, title, description, parameters)
values
  ('promoter_scan_v1', 'promoter_detection', 'Sequence-only promoter scan v1', 'Window scan using CpG, TATA-like, Inr-like, GC-box and CAAT-box features.', '{"window_bp":600,"step_bp":100}'::jsonb),
  ('premrna_field_v2', 'field_detection', 'Pre-mRNA field detection v2', 'Build candidate fields from promoter launch side and target-chain end-signal support.', '{}'::jsonb),
  ('merge_fields_gap10000_cap2000000', 'field_merge', 'Merge fields gap10000 cap2000000', 'Merge neighboring pre-mRNA fields with max gap 10000 and max length 2000000.', '{"max_gap":10000,"max_field_length":2000000,"min_support":10}'::jsonb),
  ('slice_edge_exam_v1', 'exam', 'Slice edge exam v1', 'Evaluate known mature pattern parts by nearest possible start and end slice edges.', '{"windows":[20,50,100,250]}'::jsonb)
on conflict (mechanic_key) do nothing;
