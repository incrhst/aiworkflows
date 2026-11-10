// Client-facing functions. Access is by unguessable link token only (no
// passwords in version one). Only return what the decision maker should see.
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { agreementWording, isChange, validateChange } from "./lib/changes";
import {
  applyAgreedChange,
  latestVersion,
  loadScope,
  logActivity,
  toScopeState,
} from "./model";

function publicScope(items: Doc<"scopeItems">[]) {
  return items.map((i) => ({
    id: i._id,
    title: i.title,
    inBaseline: i.inBaseline,
    status: i.status,
    deferredTo: i.deferredTo,
  }));
}

export const decision = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const decision = await ctx.db
      .query("decisions")
      .withIndex("by_client_token", (q) => q.eq("clientToken", token))
      .unique();
    // Drafts are never shown to the client.
    if (!decision || decision.status === "draft") return null;
    const project = await ctx.db.get(decision.projectId);
    if (!project) return null;
    const latest = await latestVersion(ctx, decision);
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_decision", (q) => q.eq("decisionId", decision._id))
      .collect();
    return {
      projectName: project.name,
      clientName: project.clientName,
      decisionMakerName: project.decisionMakerName,
      projectToken: project.clientToken,
      currentDate: project.currentDate,
      number: decision.number,
      status: decision.status,
      version: decision.currentVersion,
      summary: latest.summary,
      why: latest.why,
      change: latest.change,
      optionsConsidered: latest.optionsConsidered,
      sourceChannel: latest.source.channel,
      isChange: isChange(latest.change),
      agreementWording: agreementWording(latest.change),
      scope: publicScope(await loadScope(ctx, project._id)),
      responses: responses.map((r) => ({
        version: r.version,
        kind: r.kind,
        note: r.note,
        respondedAt: r.respondedAt,
      })),
    };
  },
});

export const respond = mutation({
  args: {
    token: v.string(),
    version: v.number(),
    kind: v.union(v.literal("agree"), v.literal("agree_with_note"), v.literal("not_quite")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { token, version, kind, note }) => {
    const decision = await ctx.db
      .query("decisions")
      .withIndex("by_client_token", (q) => q.eq("clientToken", token))
      .unique();
    if (!decision) throw new ConvexError("This link is not valid.");
    if (decision.status !== "awaiting_client") {
      throw new ConvexError("This decision is not waiting for a response.");
    }
    if (decision.currentVersion !== version) {
      throw new ConvexError("This decision has been updated. Please reload to see the latest version.");
    }
    const trimmed = note?.trim() || undefined;
    if ((kind === "not_quite" || kind === "agree_with_note") && !trimmed) {
      throw new ConvexError(kind === "not_quite" ? "Please say what is not quite right." : "Please add your note.");
    }
    const project = await ctx.db.get(decision.projectId);
    if (!project) throw new ConvexError("Project not found.");
    const latest = await latestVersion(ctx, decision);
    const now = Date.now();

    if (kind === "not_quite") {
      await ctx.db.insert("responses", { decisionId: decision._id, version, kind, note: trimmed, respondedAt: now });
      await ctx.db.patch(decision._id, { status: "sent_back", needsPersonalFollowUp: false });
      await logActivity(ctx, project._id, "client_sent_back", `${project.decisionMakerName} sent D-${decision.number} back: "${trimmed}"`, decision._id);
    } else {
      // Scope could have changed through another decision since this was sent.
      const scope = toScopeState(await loadScope(ctx, project._id));
      const problems = validateChange(latest.change, scope, project.currentDate);
      if (problems.length) {
        throw new ConvexError("The project has changed since this was sent. Your driver will send an updated version.");
      }
      const wording = agreementWording(latest.change);
      await ctx.db.insert("responses", {
        decisionId: decision._id,
        version,
        kind,
        note: trimmed,
        agreementWording: wording,
        respondedAt: now,
      });
      await ctx.db.patch(decision._id, { status: "agreed", agreedAt: now, needsPersonalFollowUp: false });
      await applyAgreedChange(ctx, project, decision._id, latest.change);
      await logActivity(ctx, project._id, "client_agreed", `${project.decisionMakerName}: "${wording}" on D-${decision.number} v${version}${trimmed ? `, note: "${trimmed}"` : ""}.`, decision._id);
    }
    await ctx.scheduler.runAfter(0, internal.email.notifyDriverOfResponse, {
      decisionId: decision._id,
    });
  },
});

/** The client's project page: all decisions, and current scope versus baseline. */
export const project = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_client_token", (q) => q.eq("clientToken", token))
      .unique();
    if (!project) return null;
    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .order("desc")
      .collect();
    const visible = decisions.filter((d) => d.status !== "draft" && d.status !== "withdrawn");
    return {
      name: project.name,
      clientName: project.clientName,
      baselineDate: project.baselineDate,
      currentDate: project.currentDate,
      scope: publicScope(await loadScope(ctx, project._id)),
      decisions: await Promise.all(
        visible.map(async (d) => {
          const latest = await latestVersion(ctx, d);
          return {
            number: d.number,
            status: d.status,
            token: d.clientToken,
            summary: latest.summary,
            changeKind: latest.change.kind,
            agreedAt: d.agreedAt,
          };
        }),
      ),
    };
  },
});
