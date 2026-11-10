import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { changeValidator } from "./schema";
import { loadScope, logActivity, toScopeState } from "./model";

const channel = v.union(v.literal("email"), v.literal("whatsapp"), v.literal("meeting"), v.literal("other"));
const MAX_TEXT = 50_000;

/** The driver pastes a message or meeting notes; drafting starts at once. */
export const submit = mutation({
  args: {
    projectId: v.id("projects"),
    channel,
    text: v.string(),
    link: v.optional(v.string()),
    capturedBy: v.id("teamMembers"),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (!text) throw new ConvexError("Paste the message or notes first.");
    if (text.length > MAX_TEXT) {
      throw new ConvexError("That is too long to draft from. Paste the part with the decision in it.");
    }
    if (!(await ctx.db.get(args.projectId))) throw new ConvexError("Project not found.");
    const captureId = await ctx.db.insert("captures", {
      projectId: args.projectId,
      channel: args.channel,
      text,
      link: args.link?.trim() || undefined,
      capturedBy: args.capturedBy,
      status: "drafting",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.ai.draftCapture, { captureId });
    return captureId;
  },
});

/** Captures still waiting for the driver (drafting, ready or failed). */
export const openForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const captures = await ctx.db
      .query("captures")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect();
    return captures.filter((c) => c.status === "drafting" || c.status === "ready" || c.status === "failed");
  },
});

export const dismiss = mutation({
  args: { captureId: v.id("captures") },
  handler: async (ctx, { captureId }) => {
    const capture = await ctx.db.get(captureId);
    if (!capture) throw new ConvexError("Capture not found.");
    if (capture.status === "logged") throw new ConvexError("This capture is already logged as a decision.");
    await ctx.db.patch(captureId, { status: "dismissed" });
  },
});

export const retry = mutation({
  args: { captureId: v.id("captures") },
  handler: async (ctx, { captureId }) => {
    const capture = await ctx.db.get(captureId);
    if (!capture) throw new ConvexError("Capture not found.");
    if (capture.status !== "failed" && capture.status !== "ready") {
      throw new ConvexError("This capture cannot be redrafted.");
    }
    await ctx.db.patch(captureId, { status: "drafting", error: undefined, draft: undefined });
    await ctx.scheduler.runAfter(0, internal.ai.draftCapture, { captureId });
  },
});

// ---- Internal: used by the drafting action in ai.ts ----

export const draftingContext = internalQuery({
  args: { captureId: v.id("captures") },
  handler: async (ctx, { captureId }) => {
    const capture = await ctx.db.get(captureId);
    if (!capture || capture.status !== "drafting") return null;
    const project = await ctx.db.get(capture.projectId);
    if (!project) return null;
    return {
      capture: { channel: capture.channel, text: capture.text },
      project: {
        name: project.name,
        clientName: project.clientName,
        baselineDate: project.baselineDate,
        currentDate: project.currentDate,
      },
      scope: toScopeState(await loadScope(ctx, project._id)),
    };
  },
});

export const saveDraft = internalMutation({
  args: {
    captureId: v.id("captures"),
    draft: v.object({
      isDecision: v.boolean(),
      summary: v.string(),
      why: v.string(),
      change: v.optional(changeValidator),
      optionsConsidered: v.optional(v.string()),
      sourceExcerpt: v.string(),
      newScopeFlag: v.boolean(),
      newScopeItems: v.array(v.string()),
      checks: v.array(v.string()),
      model: v.string(),
    }),
  },
  handler: async (ctx, { captureId, draft }) => {
    const capture = await ctx.db.get(captureId);
    // Dismissed while drafting: keep it dismissed.
    if (!capture || capture.status !== "drafting") return;
    await ctx.db.patch(captureId, { status: "ready", draft });
    await logActivity(
      ctx,
      capture.projectId,
      "capture_drafted",
      draft.newScopeFlag
        ? `AI drafted a decision from ${capture.channel} text and flagged possible new scope.`
        : `AI drafted a decision from ${capture.channel} text.`,
    );
  },
});

export const markFailed = internalMutation({
  args: { captureId: v.id("captures"), error: v.string() },
  handler: async (ctx, { captureId, error }) => {
    const capture = await ctx.db.get(captureId);
    if (!capture || capture.status !== "drafting") return;
    await ctx.db.patch(captureId, { status: "failed", error });
  },
});
