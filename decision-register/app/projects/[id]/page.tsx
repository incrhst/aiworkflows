"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { DecisionForm } from "@/components/DecisionForm";
import { ScopeTable } from "@/components/ScopeTable";
import { ChangePill, describeChange } from "@/components/ChangeSummary";
import { errorMessage } from "@/components/errors";

const STATUS_LABEL: Record<Doc<"decisions">["status"], string> = {
  draft: "Draft",
  awaiting_client: "Awaiting client",
  sent_back: "Sent back",
  agreed: "Agreed",
  withdrawn: "Withdrawn",
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id as Id<"projects">;
  const data = useQuery(api.projects.get, { projectId });
  const team = useQuery(api.team.list);
  const createDraft = useMutation(api.decisions.createDraft);
  const handOver = useMutation(api.projects.handOverDriver);
  const [adding, setAdding] = useState(false);

  if (data === undefined || team === undefined) return <main className="page">Loading…</main>;
  if (data === null) return <main className="page">Project not found.</main>;
  const { project, driver, scope, decisions, activity } = data;

  const scopeRefs = scope.map((s) => ({ id: s._id as string, title: s.title, status: s.status }));
  const numberOf = new Map(decisions.map((d) => [d._id as string, d.number]));
  const decisionLabel = (itemId: string) => {
    const item = scope.find((s) => s._id === itemId);
    const by = item?.changedByDecisionId ?? item?.addedByDecisionId;
    return by && numberOf.has(by) ? `D-${numberOf.get(by)}` : undefined;
  };
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const open = decisions.filter((d) => d.status !== "agreed" && d.status !== "withdrawn");
  const closed = decisions.filter((d) => d.status === "agreed" || d.status === "withdrawn");

  return (
    <main className="page">
      <Link href="/">← All projects</Link>
      <h1>{project.name}</h1>
      <p className="muted">
        {project.clientName} · Decision maker: {project.decisionMakerName} ({project.decisionMakerEmail})
      </p>
      <div className="row">
        <label htmlFor="driver" style={{ margin: 0 }}>
          Driver
        </label>
        <select
          id="driver"
          style={{ width: "auto" }}
          value={project.driverId}
          onChange={(e) => handOver({ projectId, newDriverId: e.target.value as Id<"teamMembers"> })}
        >
          {team.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>
        <span className="muted">
          Client project page: <a href={`/p/${project.clientToken}`}>{`${origin}/p/${project.clientToken.slice(0, 8)}…`}</a>
        </span>
      </div>

      <h2>Scope: current versus baseline</h2>
      <ScopeTable
        items={scope.map((s) => ({ ...s, id: s._id }))}
        baselineDate={project.baselineDate}
        currentDate={project.currentDate}
        decisionLabel={decisionLabel}
      />

      <div className="row spread">
        <h2>Open decisions</h2>
        {!adding && (
          <button className="primary" onClick={() => setAdding(true)}>
            Log a decision
          </button>
        )}
      </div>
      {adding && driver && (
        <DecisionForm
          scope={scopeRefs}
          currentDate={project.currentDate}
          authors={team}
          defaultAuthorId={driver._id}
          submitLabel="Save draft"
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            await createDraft({ projectId, ...input });
            setAdding(false);
          }}
        />
      )}
      {open.length === 0 && !adding && <p className="muted">No open decisions.</p>}
      {open.map((d) => (
        <DecisionCard
          key={d._id}
          decision={d}
          scope={scopeRefs}
          currentDate={project.currentDate}
          team={team}
          defaultAuthorId={project.driverId}
          origin={origin}
        />
      ))}

      {closed.length > 0 && <h2>Agreed and withdrawn</h2>}
      {closed.map((d) => (
        <DecisionCard
          key={d._id}
          decision={d}
          scope={scopeRefs}
          currentDate={project.currentDate}
          team={team}
          defaultAuthorId={project.driverId}
          origin={origin}
        />
      ))}

      <h2>Activity</h2>
      <div className="card">
        {activity.map((a) => (
          <div key={a._id} className="row" style={{ marginBottom: 4 }}>
            <span className="muted" style={{ minWidth: 140 }}>
              {new Date(a.at).toLocaleString()}
            </span>
            <span>{a.detail}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

type DecisionWithLatest = Doc<"decisions"> & { latest: Doc<"decisionVersions"> };

function DecisionCard({
  decision,
  scope,
  currentDate,
  team,
  defaultAuthorId,
  origin,
}: {
  decision: DecisionWithLatest;
  scope: { id: string; title: string; status: "active" | "removed" | "deferred" }[];
  currentDate: string;
  team: { _id: Id<"teamMembers">; name: string }[];
  defaultAuthorId: Id<"teamMembers">;
  origin: string;
}) {
  const send = useMutation(api.decisions.send);
  const revise = useMutation(api.decisions.revise);
  const withdraw = useMutation(api.decisions.withdraw);
  const clearFollowUp = useMutation(api.decisions.clearFollowUp);
  const history = useQuery(api.decisions.history, { decisionId: decision._id });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { latest } = decision;
  const lastResponse = history?.responses.at(-1);
  const canEdit = decision.status === "draft" || decision.status === "sent_back";
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (editing) {
    return (
      <DecisionForm
        scope={scope}
        currentDate={currentDate}
        authors={team}
        defaultAuthorId={defaultAuthorId}
        initial={latest}
        submitLabel={`Save as v${decision.currentVersion + 1}`}
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          await revise({ decisionId: decision._id, ...input });
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className={`card${latest.change.kind !== "none" || decision.needsPersonalFollowUp ? " flagged" : ""}`}>
      <div className="row spread">
        <strong>
          D-{decision.number}: {latest.summary}
        </strong>
        <div className="row">
          <ChangePill kind={latest.change.kind} />
          <span className="pill">{STATUS_LABEL[decision.status]}</span>
          <span className="muted">v{decision.currentVersion}</span>
        </div>
      </div>
      <p style={{ margin: "8px 0 4px" }}>{latest.why}</p>
      <p className="muted" style={{ margin: 0 }}>
        {describeChange(latest.change, scope)} Source: {latest.source.channel}
        {latest.source.excerpt && ` — “${latest.source.excerpt}”`}
      </p>
      {decision.status === "sent_back" && lastResponse?.kind === "not_quite" && (
        <p className="error">Client: “{lastResponse.note}”</p>
      )}
      {decision.status === "agreed" && lastResponse && (
        <p className="muted">
          “{lastResponse.agreementWording}”{lastResponse.note && `, with note: “${lastResponse.note}”`} on{" "}
          {new Date(lastResponse.respondedAt).toLocaleDateString()}
        </p>
      )}
      {decision.status === "awaiting_client" && (
        <p className="muted">
          Sent {decision.sentAt && new Date(decision.sentAt).toLocaleDateString()} · Reminders sent:{" "}
          {decision.nudgeCount}
          {decision.needsPersonalFollowUp && <strong> · Follow up personally</strong>}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        {canEdit && (
          <>
            <button className="primary" onClick={() => run(() => send({ decisionId: decision._id }))}>
              {decision.status === "sent_back" ? "Resend to client" : "Send to client"}
            </button>
            <button onClick={() => setEditing(true)}>Revise</button>
          </>
        )}
        {decision.needsPersonalFollowUp && (
          <button onClick={() => run(() => clearFollowUp({ decisionId: decision._id }))}>Mark followed up</button>
        )}
        {decision.status !== "agreed" && decision.status !== "withdrawn" && (
          <button onClick={() => run(() => withdraw({ decisionId: decision._id }))}>Withdraw</button>
        )}
        {decision.status !== "draft" && (
          <a href={`${origin}/d/${decision.clientToken}`} className="muted">
            Client link
          </a>
        )}
      </div>
    </div>
  );
}
