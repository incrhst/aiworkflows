import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { changeValidator, sourceValidator } from "./schema";
import { newToken } from "./lib/tokens";
import { validateChange, CHANGE_LABELS } from "./lib/changes";
import { loadScope, toScopeState, latestVersion, logActivity } from "./model";

const versionFields = {
  summary: v.string(),
  why: v.string(),
  change: changeValidator,
  source: sourceValidator,
  optionsConsidered: v.optional(v.string()),
  authorId: v.id("teamMembers"),
};

function checkText(summary: string, why: string) {
  if (!summary.trim()) throw new ConvexError("Summary is required.");
  if (!why.trim()) throw new ConvexError("Why is required.");
}

/** The driver logs a new decision. It starts as a draft. */
export const createDraft = mutation({
  args: { projectId: v.id("projects"), ...versionFields },
  handler: async (ctx, { projectId, ...fields }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new ConvexError("Project not found.");
    checkText(fields.summary, fields.why);
    const scope = toScopeState(await loadScope(ctx, projectId));
    const problems = validateChange(fields.change, scope, project.currentDate);
    if (problems.length) throw new ConvexError(problems.join(" "));

    const now = Date.now();
    const number = project.nextDecisionNumber;
    await ctx.db.patch(projectId, { nextDecisionNumber: number + 1 });
    const decisionId = await ctx.db.insert("decisions", {
      projectId,
      number,
      status: "draft",
      currentVersion: 1,
      clientToken: newToken(),
      nudgeCount: 0,
      needsPersonalFollowUp: false,
      createdAt: now,
    });
    await ctx.db.insert("decisionVersions", {
      decisionId,
      version: 1,
      ...fields,
      summary: fields.summary.trim(),
      why: fields.why.trim(),
      createdAt: now,
    });
    await logActivity(
      ctx,
      projectId,
      "decision_drafted",
      `D-${number} drafted (${CHANGE_LABELS[fields.change.kind]}).`,
      decisionId,
    );
    return decisionId;
  },
});

/** Revise a draft, or a decision the client sent back. Adds a new version. */
export const revise = mutation({
  args: { decisionId: v.id("decisions"), ...versionFields },
  handler: async (ctx, { decisionId, ...fields }) => {
    const decision = await ctx.db.get(decisionId);
    if (!decision) throw new ConvexError("Decision not found.");
    if (decision.status !== "draft" && decision.status !== "sent_back") {
      throw new ConvexError("Only drafts and decisions sent back by the client can be revised.");
    }
    const project = await ctx.db.get(decision.projectId);
    if (!project) throw new ConvexError("Project not found.");
    checkText(fields.summary, fields.why);
    const scope = toScopeState(await loadScope(ctx, project._id));
    const problems = validateChange(fields.change, scope, project.currentDate);
    if (problems.length) throw new ConvexError(problems.join(" "));

    const version = decision.currentVersion + 1;
    await ctx.db.insert("decisionVersions", {
      decisionId,
      version,
      ...fields,
      summary: fields.summary.trim(),
      why: fields.why.trim(),
      createdAt: Date.now(),
    });
    await ctx.db.patch(decisionId, { currentVersion: version });
    await logActivity(ctx, project._id, "decision_revised", `D-${decision.number} revised to v${version}.`, decisionId);
  },
});

/** Send (or resend) a decision to the client's decision maker. */
export const send = mutation({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const decision = await ctx.db.get(decisionId);
    if (!decision) throw new ConvexError("Decision not found.");
    if (decision.status !== "draft" && decision.status !== "sent_back") {
      throw new ConvexError("This decision has already been sent.");
    }
    const project = await ctx.db.get(decision.projectId);
    if (!project) throw new ConvexError("Project not found.");
    // Scope may have moved since the draft was written; check again.
    const latest = await latestVersion(ctx, decision);
    const scope = toScopeState(await loadScope(ctx, project._id));
    const problems = validateChange(latest.change, scope, project.currentDate);
    if (problems.length) {
      throw new ConvexError(`Revise before sending: ${problems.join(" ")}`);
    }
    const resend = decision.status === "sent_back";
    await ctx.db.patch(decisionId, {
      status: "awaiting_client",
      sentAt: Date.now(),
      nudgeCount: 0,
      lastNudgeAt: undefined,
      needsPersonalFollowUp: false,
    });
    await ctx.scheduler.runAfter(0, internal.email.sendDecisionEmail, {
      decisionId,
      kind: resend ? "resend" : "new",
    });
    await logActivity(
      ctx,
      project._id,
      resend ? "decision_resent" : "decision_sent",
      `D-${decision.number} v${decision.currentVersion} ${resend ? "resent" : "sent"} to ${project.decisionMakerName}.`,
      decisionId,
    );
  },
});

export const withdraw = mutation({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const decision = await ctx.db.get(decisionId);
    if (!decision) throw new ConvexError("Decision not found.");
    if (decision.status === "agreed") throw new ConvexError("Agreed decisions cannot be withdrawn.");
    await ctx.db.patch(decisionId, { status: "withdrawn" });
    await logActivity(ctx, decision.projectId, "decision_withdrawn", `D-${decision.number} withdrawn.`, decisionId);
  },
});

/** The driver has followed up personally; clear the flag. */
export const clearFollowUp = mutation({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const decision = await ctx.db.get(decisionId);
    if (!decision) throw new ConvexError("Decision not found.");
    await ctx.db.patch(decisionId, { needsPersonalFollowUp: false });
    await logActivity(ctx, decision.projectId, "follow_up_done", `Driver followed up on D-${decision.number}.`, decisionId);
  },
});

/** Full history of one decision: every version and every client response. */
export const history = query({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const decision = await ctx.db.get(decisionId);
    if (!decision) return null;
    const versions = await ctx.db
      .query("decisionVersions")
      .withIndex("by_decision", (q) => q.eq("decisionId", decisionId))
      .collect();
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_decision", (q) => q.eq("decisionId", decisionId))
      .collect();
    return { decision, versions, responses };
  },
});
