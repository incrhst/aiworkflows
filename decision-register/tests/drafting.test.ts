/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import {
  DraftSchema,
  buildUserMessage,
  normaliseDraft,
  type DraftContext,
  type ModelDraft,
} from "../convex/lib/drafting";

const modules = import.meta.glob("../convex/**/*.ts");

const ctx: DraftContext = {
  projectName: "Portal rebuild",
  clientName: "Acme",
  baselineDate: "2027-01-15",
  currentDate: "2027-01-15",
  today: "2026-11-10",
  scope: [
    { id: "id-login", title: "Login", inBaseline: true, status: "active" },
    { id: "id-old", title: "Old export", inBaseline: true, status: "removed" },
    { id: "id-reports", title: "Reports", inBaseline: true, status: "active" },
  ],
};

const base: ModelDraft = {
  is_decision: true,
  summary: "Swap reports for SSO",
  why: "IT needs SSO at launch.",
  change: { kind: "none", to_date: null, in_title: null, out_item: null, item: null, destination: null, cost_description: null },
  options_considered: null,
  source_excerpt: "Can we do SSO instead of reports?",
  new_scope: { looks_like_new_scope: false, items: [] },
  unclear: [],
};

describe("drafting prompt", () => {
  it("lists only active scope items, with references", () => {
    const msg = buildUserMessage(ctx, "whatsapp", "hello");
    expect(msg).toContain("S1: Login");
    expect(msg).toContain("S2: Reports");
    expect(msg).not.toContain("Old export");
    expect(msg).toContain("<captured_text>\nhello\n</captured_text>");
  });

  it("converts to a structured output schema", () => {
    expect(() => betaZodOutputFormat(DraftSchema)).not.toThrow();
  });
});

describe("normaliseDraft", () => {
  it("maps scope references back to item ids", () => {
    const d = normaliseDraft(
      { ...base, change: { ...base.change, kind: "scope_swap", in_title: "SSO", out_item: "s2" } },
      ctx,
    );
    expect(d.change).toEqual({ kind: "scope_swap", inTitle: "SSO", outItemId: "id-reports" });
    expect(d.checks).toEqual([]);
  });

  it("drops a change that does not hold up, and says why", () => {
    const d = normaliseDraft(
      { ...base, change: { ...base.change, kind: "scope_reduced", item: "S9", destination: "phase 2" } },
      ctx,
    );
    expect(d.change).toBeNull();
    expect(d.checks[0]).toMatch(/needs fixing/);
  });

  it("takes the before date from the project, not the model", () => {
    const d = normaliseDraft({ ...base, change: { ...base.change, kind: "date_moves", to_date: "2027-02-01" } }, ctx);
    expect(d.change).toEqual({ kind: "date_moves", fromDate: "2027-01-15", toDate: "2027-02-01" });
  });

  it("keeps the new scope flag and the model's own checks", () => {
    const d = normaliseDraft(
      { ...base, new_scope: { looks_like_new_scope: true, items: ["SSO"] }, unclear: ["No trade agreed."] },
      ctx,
    );
    expect(d.newScopeFlag).toBe(true);
    expect(d.newScopeItems).toEqual(["SSO"]);
    expect(d.checks).toEqual(["No trade agreed."]);
  });
});

describe("capture lifecycle", () => {
  async function setup() {
    const t = convexTest(schema, modules);
    const driverId = await t.mutation(api.team.add, { name: "Dana", email: "dana@example.com" });
    const projectId = await t.mutation(api.projects.create, {
      name: "Portal",
      clientName: "Acme",
      driverId,
      decisionMakerName: "Casey",
      decisionMakerEmail: "casey@acme.test",
      deliveryDate: "2027-01-15",
      deliverables: ["Login", "Reports"],
    });
    const captureId = await t.mutation(api.captures.submit, {
      projectId,
      channel: "whatsapp",
      text: "Casey: can we add SSO? Happy to push reports to phase 2.",
      capturedBy: driverId,
    });
    return { t, driverId, projectId, captureId };
  }

  it("fails clearly without an API key, so the driver can write it by hand", async () => {
    const { t, projectId, captureId } = await setup();
    delete process.env.ANTHROPIC_API_KEY;
    await t.action(internal.ai.draftCapture, { captureId });
    const [c] = await t.query(api.captures.openForProject, { projectId });
    expect(c.status).toBe("failed");
    expect(c.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("a reviewed draft becomes a decision and the capture is closed", async () => {
    const { t, driverId, projectId, captureId } = await setup();
    await t.mutation(internal.captures.saveDraft, {
      captureId,
      draft: {
        isDecision: true,
        summary: "Defer reports to phase 2 for SSO",
        why: "Client needs SSO.",
        sourceExcerpt: "Happy to push reports to phase 2.",
        newScopeFlag: true,
        newScopeItems: ["SSO"],
        checks: [],
        model: "test",
      },
    });
    const [ready] = await t.query(api.captures.openForProject, { projectId });
    expect(ready.status).toBe("ready");

    const project = (await t.query(api.projects.get, { projectId }))!;
    const reports = project.scope.find((s) => s.title === "Reports")!._id;
    const decisionId = await t.mutation(api.decisions.createDraft, {
      projectId,
      captureId,
      summary: "Swap reports for SSO",
      why: "Client needs SSO.",
      change: { kind: "scope_swap", inTitle: "SSO", outItemId: reports },
      source: { channel: "whatsapp", excerpt: "Happy to push reports to phase 2." },
      authorId: driverId,
    });
    expect(await t.query(api.captures.openForProject, { projectId })).toEqual([]);
    const h = (await t.query(api.decisions.history, { decisionId }))!;
    expect(h.decision.captureId).toBe(captureId);
    // The same capture can't be logged twice.
    await expect(
      t.mutation(api.decisions.createDraft, {
        projectId,
        captureId,
        summary: "Again",
        why: "x",
        change: { kind: "none" },
        source: { channel: "whatsapp" },
        authorId: driverId,
      }),
    ).rejects.toThrow(/already logged/);
  });

  it("a dismissed capture stays dismissed if the draft arrives late", async () => {
    const { t, projectId, captureId } = await setup();
    await t.mutation(api.captures.dismiss, { captureId });
    await t.mutation(internal.captures.saveDraft, {
      captureId,
      draft: { isDecision: false, summary: "", why: "", sourceExcerpt: "", newScopeFlag: false, newScopeItems: [], checks: [], model: "test" },
    });
    expect(await t.query(api.captures.openForProject, { projectId })).toEqual([]);
  });
});
