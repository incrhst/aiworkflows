"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/components/errors";

/** Kickoff: load the agreed scope from the proposal as the baseline. */
export default function NewProject() {
  const router = useRouter();
  const team = useQuery(api.team.list);
  const create = useMutation(api.projects.create);
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    driverId: "",
    decisionMakerName: "",
    decisionMakerEmail: "",
    deliveryDate: "",
    deliverables: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  if (team === undefined) return <main className="page">Loading…</main>;

  return (
    <main className="page">
      <Link href="/">← All projects</Link>
      <h1>New project</h1>
      <p className="muted">Load the agreed scope from the proposal. This becomes the baseline.</p>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const id = await create({
              name: form.name,
              clientName: form.clientName,
              driverId: form.driverId as Id<"teamMembers">,
              decisionMakerName: form.decisionMakerName,
              decisionMakerEmail: form.decisionMakerEmail,
              deliveryDate: form.deliveryDate,
              deliverables: form.deliverables.split("\n"),
            });
            router.push(`/projects/${id}`);
          } catch (err) {
            setError(errorMessage(err));
            setBusy(false);
          }
        }}
      >
        <label htmlFor="name">Project name</label>
        <input id="name" value={form.name} onChange={set("name")} required />
        <label htmlFor="client">Client</label>
        <input id="client" value={form.clientName} onChange={set("clientName")} required />
        <label htmlFor="driver">Driver (our side)</label>
        <select id="driver" value={form.driverId} onChange={set("driverId")} required>
          <option value="" disabled>
            Choose…
          </option>
          {team.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>
        <label htmlFor="dmName">Decision maker (client side)</label>
        <input id="dmName" value={form.decisionMakerName} onChange={set("decisionMakerName")} required />
        <label htmlFor="dmEmail">Decision maker email</label>
        <input id="dmEmail" type="email" value={form.decisionMakerEmail} onChange={set("decisionMakerEmail")} required />
        <label htmlFor="date">Agreed delivery date</label>
        <input id="date" type="date" value={form.deliveryDate} onChange={set("deliveryDate")} required />
        <label htmlFor="deliverables">Deliverables, one per line</label>
        <textarea id="deliverables" rows={8} value={form.deliverables} onChange={set("deliverables")} required />
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: 16 }}>
          <button className="primary" type="submit" disabled={busy}>
            Create project and load baseline
          </button>
        </div>
      </form>
    </main>
  );
}
