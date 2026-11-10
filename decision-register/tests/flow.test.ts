/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const driverId = await t.mutation(api.team.add, { name: "Dana Driver", email: "dana@example.com" });
  const projectId = await t.mutation(api.projects.create, {
    name: "Portal rebuild",
    clientName: "Acme",
    driverId,
    decisionMakerName: "Casey",
    decisionMakerEmail: "casey@acme.test",
    deliveryDate: "2027-01-15",
    deliverables: ["Login", "Reports", "Exports", ""],
  });
  const project = (await t.query(api.projects.get, { projectId }))!;
  const item = (title: string) => project.scope.find((s) => s.title === title)!._id;
  return { t, driverId, projectId, item };
}

const source = { channel: "email" as const, excerpt: "Can we swap exports for SSO?" };

describe("decision flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T09:00:00Z")); // Monday
  });
  afterEach(() => vi.useRealTimers());

  it("loads the baseline at kickoff", async () => {
    const { t, projectId } = await setup();
    const p = (await t.query(api.projects.get, { projectId }))!;
    expect(p.scope.map((s) => s.title)).toEqual(["Login", "Reports", "Exports"]);
    expect(p.project.currentDate).toBe("2027-01-15");
  });

  it("agreeing to a scope swap updates current scope but keeps the baseline", async () => {
    const { t, driverId, projectId, item } = await setup();
    const decisionId = await t.mutation(api.decisions.createDraft, {
      projectId,
      summary: "Swap exports for SSO",
      why: "Client's IT team needs SSO for launch.",
      change: { kind: "scope_swap", inTitle: "SSO", outItemId: item("Exports") },
      source,
      authorId: driverId,
    });
    // Drafts are never shown to the client.
    const draft = (await t.query(api.decisions.history, { decisionId }))!;
    expect(await t.query(api.client.decision, { token: draft.decision.clientToken })).toBeNull();

    await t.mutation(api.decisions.send, { decisionId });
    const token = draft.decision.clientToken;
    const view = (await t.query(api.client.decision, { token }))!;
    expect(view.isChange).toBe(true);
    expect(view.agreementWording).toBe("I agree to this change");

    await t.mutation(api.client.respond, { token, version: 1, kind: "agree" });
    const p = (await t.query(api.projects.get, { projectId }))!;
    const byTitle = Object.fromEntries(p.scope.map((s) => [s.title, s]));
    expect(byTitle.Exports.status).toBe("removed");
    expect(byTitle.Exports.inBaseline).toBe(true);
    expect(byTitle.SSO.inBaseline).toBe(false);
    expect(byTitle.SSO.addedByDecisionId).toBe(decisionId);
    const responses = (await t.query(api.decisions.history, { decisionId }))!.responses;
    expect(responses[0].agreementWording).toBe("I agree to this change");
  });

  it("'Not quite' needs a comment, returns to the driver, and every version is kept", async () => {
    const { t, driverId, projectId } = await setup();
    const decisionId = await t.mutation(api.decisions.createDraft, {
      projectId,
      summary: "Move launch",
      why: "Content is late.",
      change: { kind: "date_moves", fromDate: "2027-01-15", toDate: "2027-02-01" },
      source,
      authorId: driverId,
    });
    await t.mutation(api.decisions.send, { decisionId });
    const token = (await t.query(api.decisions.history, { decisionId }))!.decision.clientToken;

    await expect(t.mutation(api.client.respond, { token, version: 1, kind: "not_quite" })).rejects.toThrow();
    await t.mutation(api.client.respond, { token, version: 1, kind: "not_quite", note: "We can only do Jan 25." });
    expect((await t.query(api.decisions.history, { decisionId }))!.decision.status).toBe("sent_back");

    await t.mutation(api.decisions.revise, {
      decisionId,
      summary: "Move launch",
      why: "Content is late.",
      change: { kind: "date_moves", fromDate: "2027-01-15", toDate: "2027-01-25" },
      source,
      authorId: driverId,
    });
    await t.mutation(api.decisions.send, { decisionId });
    // The client can't respond to a stale version.
    await expect(t.mutation(api.client.respond, { token, version: 1, kind: "agree" })).rejects.toThrow();
    await t.mutation(api.client.respond, { token, version: 2, kind: "agree_with_note", note: "Fine, thanks." });

    const h = (await t.query(api.decisions.history, { decisionId }))!;
    expect(h.versions).toHaveLength(2);
    expect(h.responses.map((r) => r.kind)).toEqual(["not_quite", "agree_with_note"]);
    const p = (await t.query(api.projects.get, { projectId }))!;
    expect(p.project.baselineDate).toBe("2027-01-15");
    expect(p.project.currentDate).toBe("2027-01-25");
  });

  it("rejects a change that does not match current scope", async () => {
    const { t, driverId, projectId } = await setup();
    await expect(
      t.mutation(api.decisions.createDraft, {
        projectId,
        summary: "Move launch",
        why: "x",
        change: { kind: "date_moves", fromDate: "2026-12-01", toDate: "2027-02-01" },
        source,
        authorId: driverId,
      }),
    ).rejects.toThrow(/current delivery date/);
  });

  it("an agreement is refused if scope moved since sending", async () => {
    const { t, driverId, projectId, item } = await setup();
    const make = (summary: string) =>
      t.mutation(api.decisions.createDraft, {
        projectId,
        summary,
        why: "x",
        change: { kind: "scope_reduced", itemId: item("Reports"), destination: "phase 2" },
        source,
        authorId: driverId,
      });
    const a = await make("Defer reports");
    const b = await make("Defer reports again");
    await t.mutation(api.decisions.send, { decisionId: a });
    await t.mutation(api.decisions.send, { decisionId: b });
    const tokenOf = async (id: typeof a) => (await t.query(api.decisions.history, { decisionId: id }))!.decision.clientToken;
    await t.mutation(api.client.respond, { token: await tokenOf(a), version: 1, kind: "agree" });
    await expect(
      t.mutation(api.client.respond, { token: await tokenOf(b), version: 1, kind: "agree" }),
    ).rejects.toThrow(/changed since/);
  });

  it("nudges on working days 2 and 4, then flags the driver", async () => {
    const { t, driverId, projectId } = await setup();
    const decisionId = await t.mutation(api.decisions.createDraft, {
      projectId,
      summary: "Use the client's logo set",
      why: "Brand team supplied it.",
      change: { kind: "none" },
      source,
      authorId: driverId,
    });
    await t.mutation(api.decisions.send, { decisionId });
    const state = async () => (await t.query(api.decisions.history, { decisionId }))!.decision;

    const runAt = async (iso: string) => {
      vi.setSystemTime(new Date(iso));
      await t.mutation(internal.nudges.run, {});
    };
    await runAt("2026-11-10T10:00:00Z"); // Tue, day 1
    expect((await state()).nudgeCount).toBe(0);
    await runAt("2026-11-11T10:00:00Z"); // Wed, day 2
    expect((await state()).nudgeCount).toBe(1);
    await runAt("2026-11-13T10:00:00Z"); // Fri, day 4
    expect((await state()).nudgeCount).toBe(2);
    await runAt("2026-11-16T10:00:00Z"); // Mon, day 5
    expect((await state()).needsPersonalFollowUp).toBe(false);
    await runAt("2026-11-17T10:00:00Z"); // Tue, day 6
    expect((await state()).needsPersonalFollowUp).toBe(true);

    const team = (await t.query(api.projects.teamView))[0];
    expect(team.counts.followUp).toBe(1);
  });

  it("the driver role can be handed over", async () => {
    const { t, projectId } = await setup();
    const sam = await t.mutation(api.team.add, { name: "Sam", email: "sam@example.com" });
    await t.mutation(api.projects.handOverDriver, { projectId, newDriverId: sam });
    const p = (await t.query(api.projects.get, { projectId }))!;
    expect(p.driver?.name).toBe("Sam");
    expect(p.activity.some((a) => a.kind === "driver_handover")).toBe(true);
  });
});
