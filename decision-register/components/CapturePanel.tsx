"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { NEW_SCOPE_QUESTION } from "@/convex/lib/drafting";
import { DecisionForm } from "./DecisionForm";
import { ChangePill, describeChange } from "./ChangeSummary";
import { errorMessage } from "./errors";

type Channel = Doc<"captures">["channel"];
type ScopeOption = { id: string; title: string; status: "active" | "removed" | "deferred" };

/** Paste a message or notes; AI drafts a decision; the driver reviews it. */
export function CapturePanel({
  projectId,
  scope,
  currentDate,
  team,
  driverId,
}: {
  projectId: Id<"projects">;
  scope: ScopeOption[];
  currentDate: string;
  team: { _id: Id<"teamMembers">; name: string }[];
  driverId: Id<"teamMembers">;
}) {
  const captures = useQuery(api.captures.openForProject, { projectId });
  const submit = useMutation(api.captures.submit);
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="row spread">
        <h2>Capture</h2>
        {!open && <button onClick={() => setOpen(true)}>Paste a message or notes</button>}
      </div>
      {open && (
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await submit({ projectId, channel, text, link: link || undefined, capturedBy: driverId });
              setText("");
              setLink("");
              setOpen(false);
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="cap-channel">Where it came from</label>
          <select id="cap-channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting notes</option>
            <option value="other">Other</option>
          </select>
          <label htmlFor="cap-text">Paste the messages or notes</label>
          <textarea id="cap-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} required />
          <label htmlFor="cap-link">Link (optional)</label>
          <input id="cap-link" value={link} onChange={(e) => setLink(e.target.value)} />
          <p className="muted">AI drafts a decision and checks it against the baseline. You review it before anything is sent.</p>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="primary" type="submit" disabled={busy}>
              Draft with AI
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {captures?.map((c) => (
        <CaptureCard
          key={c._id}
          capture={c}
          projectId={projectId}
          scope={scope}
          currentDate={currentDate}
          team={team}
          driverId={driverId}
        />
      ))}
    </>
  );
}

function CaptureCard({
  capture,
  projectId,
  scope,
  currentDate,
  team,
  driverId,
}: {
  capture: Doc<"captures">;
  projectId: Id<"projects">;
  scope: ScopeOption[];
  currentDate: string;
  team: { _id: Id<"teamMembers">; name: string }[];
  driverId: Id<"teamMembers">;
}) {
  const createDraft = useMutation(api.decisions.createDraft);
  const dismiss = useMutation(api.captures.dismiss);
  const retry = useMutation(api.captures.retry);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const d = capture.draft;
  const flag = d?.newScopeFlag ? (
    <div className="card flagged" style={{ background: "var(--warn-bg)" }}>
      <strong>{NEW_SCOPE_QUESTION}</strong>
      {d.newScopeItems.length > 0 && <p style={{ margin: "4px 0 0" }}>Not in scope: {d.newScopeItems.join(", ")}</p>}
    </div>
  ) : null;

  if (reviewing) {
    return (
      <DecisionForm
        scope={scope}
        currentDate={currentDate}
        authors={team}
        defaultAuthorId={driverId}
        notice={
          <>
            {flag}
            {d && d.checks.length > 0 && (
              <ul className="muted">
                {d.checks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </>
        }
        initial={{
          summary: d?.summary ?? "",
          why: d?.why ?? "",
          change: d?.change,
          source: {
            channel: capture.channel,
            excerpt: d?.sourceExcerpt || capture.text.slice(0, 500),
            link: capture.link,
          },
          optionsConsidered: d?.optionsConsidered,
        }}
        submitLabel="Save draft decision"
        onCancel={() => setReviewing(false)}
        onSubmit={async (input) => {
          await createDraft({ projectId, captureId: capture._id, ...input });
        }}
      />
    );
  }

  return (
    <div className={`card${d?.newScopeFlag ? " flagged" : ""}`}>
      <div className="row spread">
        <span className="muted">
          From {capture.channel} · {new Date(capture.createdAt).toLocaleString()}
        </span>
        {capture.status === "drafting" && <span className="pill">Drafting…</span>}
        {capture.status === "failed" && <span className="pill bad">Not drafted</span>}
        {capture.status === "ready" && d && (d.change ? <ChangePill kind={d.change.kind} /> : <span className="pill change">Pick a change</span>)}
      </div>

      {capture.status === "failed" && <p className="error">{capture.error}</p>}
      {capture.status === "ready" && d && !d.isDecision && (
        <p>The AI found no decision in this text.</p>
      )}
      {capture.status === "ready" && d && d.isDecision && (
        <>
          <p style={{ margin: "8px 0 4px" }}>
            <strong>{d.summary}</strong>
          </p>
          {d.why && <p style={{ margin: "0 0 4px" }}>{d.why}</p>}
          {d.change && <p className="muted" style={{ margin: 0 }}>{describeChange(d.change, scope)}</p>}
          {flag}
          {d.checks.length > 0 && (
            <ul className="muted">
              {d.checks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </>
      )}
      <details>
        <summary className="muted">Original text</summary>
        <pre style={{ whiteSpace: "pre-wrap", font: "inherit" }}>{capture.text}</pre>
      </details>

      {error && <p className="error">{error}</p>}
      <div className="row" style={{ marginTop: 8 }}>
        {capture.status === "ready" && (
          <button className="primary" onClick={() => setReviewing(true)}>
            Review and save
          </button>
        )}
        {capture.status === "failed" && (
          <>
            <button className="primary" onClick={() => setReviewing(true)}>
              Write it by hand
            </button>
            <button onClick={() => run(() => retry({ captureId: capture._id }))}>Try AI again</button>
          </>
        )}
        {capture.status !== "drafting" && (
          <button onClick={() => run(() => dismiss({ captureId: capture._id }))}>Dismiss</button>
        )}
      </div>
    </div>
  );
}
