"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChangePill, describeChange } from "@/components/ChangeSummary";
import { errorMessage } from "@/components/errors";

type Kind = "agree" | "agree_with_note" | "not_quite";

/** The decision maker's view of one decision, reached from the email link. */
export default function ClientDecision() {
  const { token } = useParams<{ token: string }>();
  const d = useQuery(api.client.decision, { token });
  const respond = useMutation(api.client.respond);
  const [choice, setChoice] = useState<Kind | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (d === undefined) return <main className="page">Loading…</main>;
  if (d === null) return <main className="page">This link is not valid.</main>;

  async function submit(kind: Kind) {
    setBusy(true);
    setError(null);
    try {
      await respond({ token, version: d!.version, kind, note: note || undefined });
      setChoice(null);
      setNote("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const awaiting = d.status === "awaiting_client";
  const last = d.responses.at(-1);

  return (
    <main className="page">
      <p className="muted">
        {d.clientName} · {d.projectName}
      </p>
      <h1>
        D-{d.number}: {d.summary}
      </h1>
      <div className={`card${d.isChange ? " flagged" : ""}`}>
        <div className="row">
          <ChangePill kind={d.change.kind} />
          {d.isChange && <strong>This changes what we agreed.</strong>}
        </div>
        <p>
          <strong>What it changes:</strong> {describeChange(d.change, d.scope)}
        </p>
        <p>
          <strong>Why:</strong> {d.why}
        </p>
        {d.optionsConsidered && (
          <p>
            <strong>Options considered:</strong> {d.optionsConsidered}
          </p>
        )}
        <p className="muted">Version {d.version} · Raised via {d.sourceChannel}</p>
      </div>

      {awaiting && (
        <div className="card">
          <p>Hi {d.decisionMakerName}, please confirm this decision.</p>
          {choice === null && (
            <div className="row">
              <button className="primary" disabled={busy} onClick={() => submit("agree")}>
                {d.agreementWording}
              </button>
              <button onClick={() => setChoice("agree_with_note")}>Agree with a note</button>
              <button onClick={() => setChoice("not_quite")}>Not quite</button>
            </div>
          )}
          {choice !== null && (
            <>
              <label htmlFor="note">
                {choice === "not_quite" ? "What is not quite right? (required)" : "Your note"}
              </label>
              <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} required />
              <div className="row" style={{ marginTop: 12 }}>
                <button className="primary" disabled={busy || !note.trim()} onClick={() => submit(choice)}>
                  {choice === "not_quite" ? "Send back" : `${d.agreementWording}, with this note`}
                </button>
                <button onClick={() => setChoice(null)}>Cancel</button>
              </div>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {d.status === "agreed" && last && (
        <div className="card">
          <span className="pill ok">Agreed</span> on {new Date(last.respondedAt).toLocaleDateString()}
          {last.note && <p>Your note: “{last.note}”</p>}
        </div>
      )}
      {d.status === "sent_back" && (
        <div className="card">
          <span className="pill">Sent back</span> Thanks. We are revising this and will send an updated
          version.
        </div>
      )}
      {d.status === "withdrawn" && (
        <div className="card">
          <span className="pill">Withdrawn</span> This decision is no longer needed.
        </div>
      )}

      <p>
        <Link href={`/p/${d.projectToken}`}>See all decisions and the current scope for this project</Link>
      </p>
    </main>
  );
}
