"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScopeTable } from "@/components/ScopeTable";
import { ChangePill } from "@/components/ChangeSummary";

const STATUS: Record<string, string> = {
  awaiting_client: "Waiting for you",
  sent_back: "Being revised",
  agreed: "Agreed",
};

/** The client's project page: every decision, and current scope versus baseline. */
export default function ClientProject() {
  const { token } = useParams<{ token: string }>();
  const p = useQuery(api.client.project, { token });

  if (p === undefined) return <main className="page">Loading…</main>;
  if (p === null) return <main className="page">This link is not valid.</main>;

  return (
    <main className="page">
      <p className="muted">{p.clientName}</p>
      <h1>{p.name}</h1>

      <h2>Scope: current versus what we agreed</h2>
      <ScopeTable items={p.scope} baselineDate={p.baselineDate} currentDate={p.currentDate} />

      <h2>Decisions</h2>
      {p.decisions.length === 0 && <p className="muted">No decisions yet.</p>}
      {p.decisions.map((d) => (
        <Link key={d.token} href={`/d/${d.token}`} style={{ color: "inherit", textDecoration: "none" }}>
          <div className={`card${d.status === "awaiting_client" ? " flagged" : ""}`}>
            <div className="row spread">
              <strong>
                D-{d.number}: {d.summary}
              </strong>
              <div className="row">
                <ChangePill kind={d.changeKind} />
                <span className="pill">{STATUS[d.status] ?? d.status}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </main>
  );
}
