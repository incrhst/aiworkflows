"use client";
import { useState } from "react";
import { CHANGE_LABELS, type Change } from "@/convex/lib/changes";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "./errors";

type Channel = "email" | "whatsapp" | "meeting" | "other";

export interface DecisionInput {
  summary: string;
  why: string;
  change: Change;
  source: { channel: Channel; excerpt?: string; link?: string };
  optionsConsidered?: string;
  authorId: Id<"teamMembers">;
}

interface ScopeOption {
  id: string;
  title: string;
  status: "active" | "removed" | "deferred";
}

export function DecisionForm({
  scope,
  currentDate,
  authors,
  defaultAuthorId,
  initial,
  notice,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  scope: ScopeOption[];
  currentDate: string;
  authors: { _id: Id<"teamMembers">; name: string }[];
  defaultAuthorId: Id<"teamMembers">;
  // `change` is optional so an AI draft without a valid change leaves it unset.
  initial?: Omit<DecisionInput, "authorId" | "change"> & { change?: Change };
  /** Shown above the form, e.g. the new scope flag on an AI draft. */
  notice?: React.ReactNode;
  submitLabel: string;
  onSubmit: (input: DecisionInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const active = scope.filter((s) => s.status === "active");
  const init = initial?.change;
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [kind, setKind] = useState<Change["kind"] | "">(init?.kind ?? "");
  const [toDate, setToDate] = useState(init?.kind === "date_moves" ? init.toDate : "");
  const [inTitle, setInTitle] = useState(init?.kind === "scope_swap" ? init.inTitle : "");
  const [itemId, setItemId] = useState(
    init?.kind === "scope_swap" ? init.outItemId : init?.kind === "scope_reduced" ? init.itemId : "",
  );
  const [destination, setDestination] = useState(init?.kind === "scope_reduced" ? init.destination : "");
  const [costDescription, setCostDescription] = useState(init?.kind === "extra_cost" ? init.description : "");
  const [channel, setChannel] = useState<Channel>(initial?.source.channel ?? "email");
  const [excerpt, setExcerpt] = useState(initial?.source.excerpt ?? "");
  const [link, setLink] = useState(initial?.source.link ?? "");
  const [options, setOptions] = useState(initial?.optionsConsidered ?? "");
  const [authorId, setAuthorId] = useState(defaultAuthorId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function buildChange(): Change | null {
    switch (kind) {
      case "none":
        return { kind };
      case "date_moves":
        return { kind, fromDate: currentDate, toDate };
      case "scope_swap":
        return { kind, inTitle, outItemId: itemId };
      case "scope_reduced":
        return { kind, itemId, destination };
      case "extra_cost":
        return { kind, description: costDescription };
      default:
        return null;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const change = buildChange();
    if (!change) {
      setError("Choose what this decision changes.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        summary,
        why,
        change,
        source: { channel, excerpt: excerpt.trim() || undefined, link: link.trim() || undefined },
        optionsConsidered: options.trim() || undefined,
        authorId,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      {notice}
      <label htmlFor="summary">Summary: one line on what was decided</label>
      <input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} required />

      <label htmlFor="why">Why</label>
      <textarea id="why" value={why} onChange={(e) => setWhy(e.target.value)} required />

      <label htmlFor="kind">What it changes (required)</label>
      <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Change["kind"])} required>
        <option value="" disabled>
          Choose one…
        </option>
        {(Object.keys(CHANGE_LABELS) as Change["kind"][]).map((k) => (
          <option key={k} value={k}>
            {CHANGE_LABELS[k]}
          </option>
        ))}
      </select>

      {kind === "date_moves" && (
        <>
          <p className="muted">Current date: {currentDate}</p>
          <label htmlFor="toDate">New delivery date</label>
          <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
        </>
      )}
      {kind === "scope_swap" && (
        <>
          <label htmlFor="inTitle">Coming in</label>
          <input id="inTitle" value={inTitle} onChange={(e) => setInTitle(e.target.value)} required />
          <ItemSelect label="Going out" items={active} value={itemId} onChange={setItemId} />
        </>
      )}
      {kind === "scope_reduced" && (
        <>
          <ItemSelect label="Item dropped or deferred" items={active} value={itemId} onChange={setItemId} />
          <label htmlFor="destination">Where it went</label>
          <input
            id="destination"
            placeholder="For example, phase 2"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </>
      )}
      {kind === "extra_cost" && (
        <>
          <p className="muted">Rare. Handled as a separate change order outside the fixed price.</p>
          <label htmlFor="cost">Describe the extra cost</label>
          <textarea id="cost" value={costDescription} onChange={(e) => setCostDescription(e.target.value)} required />
        </>
      )}

      <label htmlFor="channel">Source</label>
      <select id="channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
        <option value="email">Email</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="meeting">Meeting</option>
        <option value="other">Other</option>
      </select>
      <label htmlFor="excerpt">Excerpt (optional)</label>
      <textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      <label htmlFor="link">Link (optional)</label>
      <input id="link" value={link} onChange={(e) => setLink(e.target.value)} />

      <label htmlFor="options">Options considered (optional)</label>
      <textarea id="options" value={options} onChange={(e) => setOptions(e.target.value)} />

      <label htmlFor="author">Logged by</label>
      <select id="author" value={authorId} onChange={(e) => setAuthorId(e.target.value as Id<"teamMembers">)}>
        {authors.map((a) => (
          <option key={a._id} value={a._id}>
            {a.name}
          </option>
        ))}
      </select>

      {error && <p className="error">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="primary" type="submit" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ItemSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: ScopeOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <>
      <label htmlFor="item">{label}</label>
      <select id="item" value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          Choose a current scope item…
        </option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.title}
          </option>
        ))}
      </select>
    </>
  );
}
