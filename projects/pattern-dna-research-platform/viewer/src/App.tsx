import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Braces,
  Database,
  Dna,
  FlaskConical,
  GitBranch,
  Network,
  RefreshCw
} from "lucide-react";

type Mode = {
  mode_key: string;
  title: string;
  cell_state: string;
  description: string;
};

type Overview = {
  counts: Record<string, number>;
  modes: Mode[];
  exams: Array<{
    mode_key: string;
    label: string;
    exact_count: number;
    near_count: number;
    missing_count: number;
    fraction: number;
  }>;
  rules: Array<{
    rule_key: string;
    rule_group: string;
    title: string;
    statement: string;
  }>;
  run: {
    run_name: string;
    parameters: Record<string, unknown>;
    notes: string;
    created_at: string;
  };
};

type Region = {
  region_key: string;
  start_pos: number;
  end_pos: number;
  region_type: string;
  chain: string;
  score: number;
  role_type: string;
  confidence: number;
  features: {
    label?: string;
    families?: string[];
    exact_motifs?: string[];
    key_factors?: string[];
  };
};

type Field = {
  field_key: string;
  start_pos: number;
  end_pos: number;
  target_chain: string;
  poll_chain: string;
  support_score: number;
  features: {label?: string};
};

type Complex = {
  complex_key: string;
  field_key: string;
  confidence: number;
  status: string;
  members: Array<{
    region_key: string;
    member_role: string;
    member_order: number;
  }>;
};

type Viewport = {
  chromosome: {
    chrom: string;
    length_bp: number;
    reference_build: string;
    features: Record<string, unknown>;
  };
  mode: string;
  regions: Region[];
  fields: Field[];
  complexes: Complex[];
};

type Resolution = {
  complex: {
    verdict: string;
    confidence: string;
    address_candidate: string | null;
    promoter_candidate: string | null;
    bridge_rationale: string[];
  };
  platform_a: {dominant_role: string; scores: Record<string, number>};
  platform_b: {dominant_role: string; scores: Record<string, number>};
};

const roleColors: Record<string, string> = {
  address_like: "#e44d5e",
  address_bridge: "#ef8f3c",
  promoter_local: "#087f8c",
  promoter_support: "#48a078",
  field_boundary: "#67738a"
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [mode, setMode] = useState("baseline");
  const [selected, setSelected] = useState<Region | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [status, setStatus] = useState("Loading demonstration data");

  useEffect(() => {
    getJson<Overview>("/api/overview")
      .then((data) => {
        setOverview(data);
        setStatus("Ready");
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    setStatus("Loading genomic viewport");
    getJson<Viewport>(`/api/chromosomes/Demo/viewport?mode=${mode}`)
      .then((data) => {
        setViewport(data);
        setSelected((current) => (
          current
            ? data.regions.find((region) => region.region_key === current.region_key) ?? null
            : data.regions[0] ?? null
        ));
        setStatus("Ready");
      })
      .catch((error: Error) => setStatus(error.message));
  }, [mode]);

  useEffect(() => {
    fetch("/api/resolve", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        context: {context_id: mode, cell_state: mode},
        platform_a: {
          landing_id: "address-demo",
          families: ["AP1/CREB/bZIP", "ETS"],
          exact_motif_hits: ["MA0028.3 ELK1"],
          key_factors: ["ELK1", "MED23"]
        },
        platform_b: {
          landing_id: "promoter-demo",
          families: ["GC/ZF", "RUNX"],
          key_factors: ["TBP", "TFIID", "POLR2A"]
        }
      })
    })
      .then((response) => response.json())
      .then(setResolution)
      .catch(() => setResolution(null));
  }, [mode]);

  const selectedMode = overview?.modes.find((item) => item.mode_key === mode);
  const exactFraction = useMemo(() => {
    const exam = overview?.exams.find((item) => item.mode_key === mode);
    return exam ? Math.round(exam.fraction * 100) : 0;
  }, [mode, overview]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Dna size={25} /></span>
          <div>
            <h1>Pattern DNA</h1>
            <p>Contextual genomic architecture research platform</p>
          </div>
        </div>
        <div className="run-state">
          <span>{status}</span>
          <strong>{overview?.run.run_name ?? "bootstrap pending"}</strong>
        </div>
      </header>

      <main>
        <section className="intro-band">
          <div>
            <span className="eyebrow">Public reproducible demonstration</span>
            <h2>Object, role, mode, complex, and result remain separate.</h2>
            <p>
              The same regulatory site can participate differently when the
              reading context changes. Stable coordinates stay relational;
              evolving evidence remains explicit JSONB.
            </p>
          </div>
          <div className="mode-control" aria-label="Reading mode">
            {overview?.modes.map((item) => (
              <button
                key={item.mode_key}
                className={item.mode_key === mode ? "active" : ""}
                onClick={() => setMode(item.mode_key)}
              >
                {item.cell_state}
              </button>
            ))}
          </div>
        </section>

        <section className="metrics-grid">
          <Metric icon={<Database />} label="Objects" value={overview?.counts.regions} />
          <Metric icon={<GitBranch />} label="Contextual roles" value={overview?.counts.region_roles} />
          <Metric icon={<Network />} label="Pol II complexes" value={overview?.counts.complexes} />
          <Metric icon={<FlaskConical />} label="Exam confidence" value={`${exactFraction}%`} />
        </section>

        <section className="workspace">
          <div className="map-column">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Synthetic coordinate window</span>
                <h3>chr{viewport?.chromosome.chrom ?? "Demo"} · 1,000,000 bp</h3>
              </div>
              <button className="icon-button" onClick={() => setMode((current) => current)}>
                <RefreshCw size={17} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="genome-map">
              <div className="scale">
                {[0, 250, 500, 750, 1000].map((value) => (
                  <span key={value} style={{left: `${value / 10}%`}}>{value} kb</span>
                ))}
              </div>

              <Track label="Regulatory objects">
                {viewport?.regions.map((region) => (
                  <button
                    key={region.region_key}
                    className={`region ${selected?.region_key === region.region_key ? "selected" : ""}`}
                    style={{
                      left: percent(region.start_pos),
                      width: widthPercent(region.start_pos, region.end_pos),
                      backgroundColor: roleColors[region.role_type] ?? "#667085"
                    }}
                    title={`${region.region_key}: ${region.role_type}`}
                    onClick={() => setSelected(region)}
                  >
                    <span>{region.region_key.replace("R-", "")}</span>
                  </button>
                ))}
              </Track>

              <Track label="pre-mRNA fields">
                {viewport?.fields.map((field) => (
                  <div
                    key={field.field_key}
                    className="field"
                    style={{
                      left: percent(field.start_pos),
                      width: widthPercent(field.start_pos, field.end_pos)
                    }}
                  >
                    <span>{field.field_key}</span>
                  </div>
                ))}
              </Track>

              <div className="legend">
                {Object.entries(roleColors).map(([role, color]) => (
                  <span key={role}><i style={{backgroundColor: color}} />{pretty(role)}</span>
                ))}
              </div>
            </div>

            <div className="complex-list">
              {viewport?.complexes.map((complex) => (
                <article key={complex.complex_key}>
                  <div>
                    <Network size={18} />
                    <strong>{complex.complex_key}</strong>
                    <span>{complex.field_key}</span>
                  </div>
                  <p>
                    {complex.members.map((member) => (
                      `${member.region_key} as ${pretty(member.member_role)}`
                    )).join("  ->  ")}
                  </p>
                  <small>{Math.round(complex.confidence * 100)}% confidence</small>
                </article>
              ))}
            </div>
          </div>

          <aside className="detail-panel">
            <span className="eyebrow">Selected object</span>
            {selected ? (
              <>
                <h3>{selected.features.label ?? selected.region_key}</h3>
                <dl>
                  <Row label="Stable object" value={selected.region_key} />
                  <Row label="Coordinates" value={`${format(selected.start_pos)}-${format(selected.end_pos)}`} />
                  <Row label="Base type" value={selected.region_type} />
                  <Row label="Role in mode" value={pretty(selected.role_type)} />
                  <Row label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
                  <Row label="Families" value={(selected.features.families ?? []).join(", ") || "unknown"} />
                </dl>
                <div className="evidence-box">
                  <Braces size={17} />
                  <div>
                    <strong>Evidence remains attached</strong>
                    <p>{(selected.features.key_factors ?? []).join(" · ") || "No key factors in demo profile"}</p>
                  </div>
                </div>
              </>
            ) : <p>Select a regulatory object.</p>}
          </aside>
        </section>

        <section className="lower-grid">
          <article className="resolution-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Explainable resolver</span>
                <h3>Address + promoter assessment</h3>
              </div>
              <Activity size={21} />
            </div>
            {resolution ? (
              <>
                <div className="verdict">
                  <strong>{pretty(resolution.complex.verdict)}</strong>
                  <span>{resolution.complex.confidence}</span>
                </div>
                <div className="role-pair">
                  <RoleResult
                    title="Address platform"
                    role={resolution.platform_a.dominant_role}
                    scores={resolution.platform_a.scores}
                  />
                  <RoleResult
                    title="Local platform"
                    role={resolution.platform_b.dominant_role}
                    scores={resolution.platform_b.scores}
                  />
                </div>
              </>
            ) : <p>Resolver result is loading.</p>}
          </article>

          <article className="rules-panel">
            <span className="eyebrow">Model rules</span>
            <h3>{selectedMode?.title ?? "Reading mode"}</h3>
            <p>{selectedMode?.description}</p>
            <div className="rules-list">
              {overview?.rules.map((rule) => (
                <div key={rule.rule_key}>
                  <strong>{rule.title}</strong>
                  <span>{rule.statement}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function Metric({icon, label, value}: {icon: React.ReactNode; label: string; value?: string | number}) {
  return (
    <article className="metric">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value ?? "..."}</strong></div>
    </article>
  );
}

function Track({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="track-row">
      <span className="track-label">{label}</span>
      <div className="track-line">{children}</div>
    </div>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function RoleResult({title, role, scores}: {
  title: string;
  role: string;
  scores: Record<string, number>;
}) {
  const topScore = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (
    <div>
      <small>{title}</small>
      <strong>{pretty(role)}</strong>
      <span>Top signal: {pretty(topScore?.[0] ?? "unknown")} {topScore?.[1] ?? 0}</span>
    </div>
  );
}

function percent(value: number) {
  return `${(value / 1_000_000) * 100}%`;
}

function widthPercent(start: number, end: number) {
  return `${Math.max(1.2, ((end - start + 1) / 1_000_000) * 100)}%`;
}

function pretty(value: string) {
  return value.replaceAll("_", " ");
}

function format(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
