"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/components/errors";

/** Team view: everyone sees every project; filter to one driver's work. */
export default function TeamView() {
  const projects = useQuery(api.projects.teamView);
  const team = useQuery(api.team.list);
  const [driverFilter, setDriverFilter] = useState("");

  if (projects === undefined || team === undefined) return <main className="page">Loading…</main>;

  const shown = driverFilter ? projects.filter((p) => p.driverId === driverFilter) : projects;
  const totals = shown.reduce(
    (t, p) => ({
      awaiting: t.awaiting + p.counts.awaitingClient,
      sentBack: t.sentBack + p.counts.sentBack,
      followUp: t.followUp + p.counts.followUp,
    }),
    { awaiting: 0, sentBack: 0, followUp: 0 },
  );

  return (
    <main className="page">
      <div className="row spread">
        <div>
          <h1>Client decisions</h1>
          <p className="muted">Every decision made with a client, confirmed and tracked.</p>
        </div>
        {team.length > 0 && <Link href="/projects/new">New project</Link>}
      </div>

      {team.length === 0 ? (
        <>
          <p>Add yourself and your team to get started.</p>
          <AddTeamMember />
        </>
      ) : (
        <>
          <div className="row" style={{ marginTop: 16 }}>
            <label htmlFor="driver" style={{ margin: 0 }}>
              Driver
            </label>
            <select
              id="driver"
              style={{ width: "auto" }}
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
            >
              <option value="">Everyone</option>
              {team.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="stats" style={{ margin: "16px 0" }}>
            <span>Awaiting client: <strong>{totals.awaiting}</strong></span>
            <span>Sent back: <strong>{totals.sentBack}</strong></span>
            <span>Needs personal follow-up: <strong>{totals.followUp}</strong></span>
          </div>

          {shown.length === 0 && <p className="muted">No projects yet.</p>}
          {shown.map((p) => (
            <Link key={p._id} href={`/projects/${p._id}`} style={{ color: "inherit", textDecoration: "none" }}>
              <div className={`card${p.counts.followUp || p.counts.sentBack ? " flagged" : ""}`}>
                <div className="row spread">
                  <strong>{p.name}</strong>
                  <span className="muted">{p.clientName} · Driver: {p.driverName}</span>
                </div>
                <div className="stats muted">
                  <span>Awaiting client: {p.counts.awaitingClient}</span>
                  <span>Sent back: {p.counts.sentBack}</span>
                  <span>Follow up: {p.counts.followUp}</span>
                  <span>Drafts: {p.counts.drafts}</span>
                  <span>Agreed: {p.counts.agreed}</span>
                  <span>
                    Due {p.currentDate}
                    {p.currentDate !== p.baselineDate && ` (was ${p.baselineDate})`}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          <h2>Team</h2>
          <p className="muted">{team.map((m) => m.name).join(", ")}</p>
          <AddTeamMember />
        </>
      )}
    </main>
  );
}

function AddTeamMember() {
  const add = useMutation(api.team.add);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await add({ name, email });
          setName("");
          setEmail("");
          setError(null);
        } catch (err) {
          setError(errorMessage(err));
        }
      }}
    >
      <div className="row">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 1 }} />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <button type="submit">Add team member</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
