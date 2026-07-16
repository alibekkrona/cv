import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cable,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  FileCode2,
  Gauge,
  Microscope,
  Radio,
  ShieldCheck,
  TerminalSquare,
  TriangleAlert
} from "lucide-react";

type Overview = {
  project: string;
  module: string;
  part_number: string;
  network: Record<string, string>;
  wiring: Array<{ signal: string; pin: string }>;
  state_packets: Array<{ id: string; payload: string; result: string; confidence: string }>;
  dids: Array<{ did: string; meaning: string; value: string }>;
  boundary: { included: string[]; excluded: string[] };
};

type Evidence = {
  event_count: number;
  identifiers: string[];
  dtcs: Array<{ code: string; status: string; label: string }>;
  summary: Record<string, string | number>;
  events: Array<{
    time_ms: number;
    transport: string;
    direction: string;
    identifier: string;
    payload?: string;
    details: Record<string, string | number>;
  }>;
};

type Artifact = { name: string; path: string; kind: string; purpose: string };

const formatTime = (value: number) => `${(value / 1000).toFixed(value < 1000 ? 2 : 1)}s`;
const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());

function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeTab, setActiveTab] = useState<"bench" | "diagnostics" | "artifacts">("bench");

  useEffect(() => {
    Promise.all([
      fetch("/api/overview").then((response) => response.json()),
      fetch("/api/evidence").then((response) => response.json()),
      fetch("/api/artifacts").then((response) => response.json())
    ]).then(([overviewData, evidenceData, artifactData]) => {
      setOverview(overviewData);
      setEvidence(evidenceData);
      setArtifacts(artifactData);
    });
  }, []);

  const timelineEnd = useMemo(
    () => Math.max(...(evidence?.events.map((event) => event.time_ms) ?? [1])),
    [evidence]
  );

  if (!overview || !evidence) {
    return <main className="loading">Loading verified bench evidence...</main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="identity">
          <div className="mark"><Gauge size={22} /></div>
          <div>
            <p className="eyebrow">Independent engineering project</p>
            <h1>J285 Bench Research</h1>
          </div>
        </div>
        <div className="health"><span /> Evidence set verified</div>
      </header>

      <section className="overview-band">
        <div>
          <p className="section-label">Audi A8 D4 / 4H instrument cluster</p>
          <h2>From an isolated module to a reproducible CAN and UDS diagnostic bench.</h2>
          <p className="lede">
            Hardware bring-up, reversible state experiments, delayed diagnostics,
            capture analysis, and a documented path toward legitimate ODIS adaptation.
          </p>
        </div>
        <div className="module-id">
          <span>Module</span><strong>{overview.module}</strong>
          <span>Part number</span><strong>{overview.part_number}</strong>
        </div>
      </section>

      <section className="metric-strip">
        <Metric icon={<Radio />} label="CAN bus" value={overview.network.bitrate} />
        <Metric icon={<Activity />} label="UDS pair" value={`${overview.network.uds_request} → ${overview.network.uds_response}`} />
        <Metric icon={<TerminalSquare />} label="Capture" value={`${evidence.event_count} evidence events`} />
        <Metric icon={<CheckCircle2 />} label="Bus health" value={`EFLG ${evidence.summary.EFLG}`} />
      </section>

      <nav className="tabs" aria-label="Research views">
        <Tab active={activeTab === "bench"} onClick={() => setActiveTab("bench")} label="Bench model" />
        <Tab active={activeTab === "diagnostics"} onClick={() => setActiveTab("diagnostics")} label="Diagnostics" />
        <Tab active={activeTab === "artifacts"} onClick={() => setActiveTab("artifacts")} label="Artifacts" />
      </nav>

      {activeTab === "bench" && (
        <div className="workspace-grid">
          <section className="panel span-2">
            <PanelHeading icon={<CircuitBoard />} title="Verified state packets" detail="Observable, reversible behavior" />
            <div className="packet-grid">
              {overview.state_packets.map((packet) => (
                <article className="packet" key={`${packet.id}-${packet.payload}`}>
                  <div className="packet-id">{packet.id}</div>
                  <code>{packet.payload}</code>
                  <p>{packet.result}</p>
                  <span>{packet.confidence}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <PanelHeading icon={<Cable />} title="Bench wiring" detail="Confirmed pin assignment" />
            <div className="wiring-list">
              {overview.wiring.map((wire) => (
                <div key={wire.signal}><span>{wire.signal}</span><strong>{wire.pin}</strong></div>
              ))}
            </div>
            <div className="network-note">
              <Radio size={18} />
              <div><strong>{overview.network.frame_format}</strong><span>{overview.network.controller}</span></div>
            </div>
          </section>

          <section className="panel span-2">
            <PanelHeading icon={<Activity />} title="Delayed diagnostic timeline" detail="Visual startup protected from early UDS traffic" />
            <div className="timeline">
              {evidence.events.map((event) => (
                <div
                  className={`timeline-event ${event.transport.toLowerCase()}`}
                  key={`${event.time_ms}-${event.identifier}-${event.direction}`}
                  style={{ left: `${Math.min(96, (event.time_ms / timelineEnd) * 96)}%` }}
                  title={`T+${event.time_ms} ms ${event.transport} ${event.direction} ${event.identifier}`}
                />
              ))}
              <div className="quiet-window"><span>0-60s diagnostic quiet window</span></div>
            </div>
            <div className="timeline-labels"><span>Power on</span><span>UDS snapshot</span><span>Standby</span></div>
          </section>

          <section className="panel">
            <PanelHeading icon={<ShieldCheck />} title="Research boundary" detail="Explicitly controlled scope" />
            <ul className="boundary-list allowed">
              {overview.boundary.included.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}
            </ul>
            <div className="boundary-divider">Not part of this project</div>
            <ul className="boundary-list excluded">
              {overview.boundary.excluded.map((item) => <li key={item}><TriangleAlert />{item}</li>)}
            </ul>
          </section>
        </div>
      )}

      {activeTab === "diagnostics" && (
        <div className="workspace-grid">
          <section className="panel span-2">
            <PanelHeading icon={<Microscope />} title="Read-only evidence trace" detail="Condensed from verified bench captures" />
            <div className="event-table">
              <div className="event-row event-head"><span>Time</span><span>Flow</span><span>ID</span><span>Interpretation</span></div>
              {evidence.events.map((event) => (
                <div className="event-row" key={`${event.time_ms}-${event.identifier}-${event.direction}`}>
                  <span>{formatTime(event.time_ms)}</span>
                  <span className={`flow ${event.direction.toLowerCase()}`}>{event.transport} {event.direction}</span>
                  <code>0x{event.identifier}</code>
                  <span>{titleCase(String(event.details.service ?? event.details.mode ?? "state evidence"))}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <PanelHeading icon={<TriangleAlert />} title="DTC evidence" detail="Classification, not circumvention" />
            {evidence.dtcs.map((dtc) => (
              <div className="dtc" key={dtc.code}>
                <strong>{dtc.code}</strong><span>Status {dtc.status}</span><p>{titleCase(dtc.label)}</p>
              </div>
            ))}
            <div className="result-box">
              <span>Forensics result</span>
              <strong>{titleCase(String(evidence.summary.result))}</strong>
              <small>txFail={evidence.summary.txFail} · TEC={evidence.summary.TEC} · REC={evidence.summary.REC}</small>
            </div>
          </section>

          <section className="panel span-3">
            <PanelHeading icon={<CircuitBoard />} title="Observed data identifiers" detail="Positive J285 identification results" />
            <div className="did-grid">
              {overview.dids.map((did) => (
                <div className="did" key={did.did}><code>{did.did}</code><span>{did.meaning}</span><strong>{did.value}</strong></div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "artifacts" && (
        <section className="panel artifact-panel">
          <PanelHeading icon={<FileCode2 />} title="Runnable research artifacts" detail="Selected from the larger private workspace" />
          <div className="artifact-list">
            {artifacts.map((artifact) => (
              <article className="artifact" key={artifact.path}>
                <div className="artifact-icon"><FileCode2 /></div>
                <div><span>{artifact.kind}</span><h3>{artifact.name}</h3><p>{artifact.purpose}</p><code>{artifact.path}</code></div>
                <ChevronRight />
              </article>
            ))}
          </div>
        </section>
      )}

      <footer>
        <span>Audi A8 D4 Instrument Cluster Bench Research</span>
        <span>Reproducible portfolio edition · synthetic condensed trace</span>
      </footer>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return <div className="metric"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>;
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{label}</button>;
}

function PanelHeading({ icon, title, detail }: { icon: JSX.Element; title: string; detail: string }) {
  return <div className="panel-heading"><div>{icon}</div><span><strong>{title}</strong><small>{detail}</small></span></div>;
}

export default App;
