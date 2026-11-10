import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const changeValidator = v.union(
  v.object({ kind: v.literal("none") }),
  v.object({ kind: v.literal("date_moves"), fromDate: v.string(), toDate: v.string() }),
  v.object({ kind: v.literal("scope_swap"), inTitle: v.string(), outItemId: v.string() }),
  v.object({ kind: v.literal("scope_reduced"), itemId: v.string(), destination: v.string() }),
  v.object({ kind: v.literal("extra_cost"), description: v.string() }),
);

export const sourceValidator = v.object({
  channel: v.union(
    v.literal("email"),
    v.literal("whatsapp"),
    v.literal("meeting"),
    v.literal("other"),
  ),
  excerpt: v.optional(v.string()),
  link: v.optional(v.string()),
});

export const decisionStatus = v.union(
  v.literal("draft"), // driver is still wording it
  v.literal("awaiting_client"), // sent, waiting for the decision maker
  v.literal("sent_back"), // client said "Not quite"; driver revises and resends
  v.literal("agreed"),
  v.literal("withdrawn"),
);

export default defineSchema({
  // Our side. Auth is not wired up yet: see README "Before real client use".
  teamMembers: defineTable({
    name: v.string(),
    email: v.string(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    clientName: v.string(),
    driverId: v.id("teamMembers"),
    decisionMakerName: v.string(),
    decisionMakerEmail: v.string(),
    // Agreed delivery date at kickoff, and the date as changed by decisions.
    baselineDate: v.string(), // YYYY-MM-DD
    currentDate: v.string(),
    // Secret for the client's project page link.
    clientToken: v.string(),
    nextDecisionNumber: v.number(),
    createdAt: v.number(),
  })
    .index("by_driver", ["driverId"])
    .index("by_client_token", ["clientToken"]),

  // Deliverables. Baseline items are loaded at kickoff; others arrive via swaps.
  scopeItems: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    inBaseline: v.boolean(),
    status: v.union(v.literal("active"), v.literal("removed"), v.literal("deferred")),
    deferredTo: v.optional(v.string()),
    addedByDecisionId: v.optional(v.id("decisions")),
    changedByDecisionId: v.optional(v.id("decisions")),
    order: v.number(),
  }).index("by_project", ["projectId"]),

  decisions: defineTable({
    projectId: v.id("projects"),
    number: v.number(), // D-1, D-2… per project
    status: decisionStatus,
    currentVersion: v.number(),
    // Secret for the client's link to this one decision.
    clientToken: v.string(),
    sentAt: v.optional(v.number()),
    nudgeCount: v.number(),
    lastNudgeAt: v.optional(v.number()),
    needsPersonalFollowUp: v.boolean(),
    agreedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_client_token", ["clientToken"]),

  // Every version is kept. Clients never edit decisions directly.
  decisionVersions: defineTable({
    decisionId: v.id("decisions"),
    version: v.number(),
    summary: v.string(),
    why: v.string(),
    change: changeValidator,
    source: sourceValidator,
    optionsConsidered: v.optional(v.string()),
    authorId: v.id("teamMembers"),
    createdAt: v.number(),
  }).index("by_decision", ["decisionId", "version"]),

  responses: defineTable({
    decisionId: v.id("decisions"),
    version: v.number(),
    kind: v.union(v.literal("agree"), v.literal("agree_with_note"), v.literal("not_quite")),
    note: v.optional(v.string()),
    // The exact wording the client agreed to, kept as a record.
    agreementWording: v.optional(v.string()),
    respondedAt: v.number(),
  }).index("by_decision", ["decisionId"]),

  // Audit trail: sends, nudges, driver handovers, responses.
  activity: defineTable({
    projectId: v.id("projects"),
    decisionId: v.optional(v.id("decisions")),
    kind: v.string(),
    detail: v.string(),
    at: v.number(),
  }).index("by_project", ["projectId", "at"]),
});
