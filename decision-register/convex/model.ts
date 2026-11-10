// Shared helpers for Convex functions (not exposed as API functions).
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { effectOf, type Change, type ScopeItemState } from "./lib/changes";

export async function loadScope(ctx: QueryCtx, projectId: Id<"projects">) {
  const items = await ctx.db
    .query("scopeItems")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return items.sort((a, b) => a.order - b.order);
}

export function toScopeState(items: Doc<"scopeItems">[]): ScopeItemState[] {
  return items.map((i) => ({
    id: i._id,
    title: i.title,
    inBaseline: i.inBaseline,
    status: i.status,
  }));
}

export async function latestVersion(ctx: QueryCtx, decision: Doc<"decisions">) {
  const version = await ctx.db
    .query("decisionVersions")
    .withIndex("by_decision", (q) =>
      q.eq("decisionId", decision._id).eq("version", decision.currentVersion),
    )
    .unique();
  if (!version) throw new Error(`Decision ${decision._id} has no current version.`);
  return version;
}

export async function decisionsWithLatest(ctx: QueryCtx, projectId: Id<"projects">) {
  const decisions = await ctx.db
    .query("decisions")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .order("desc")
    .collect();
  return await Promise.all(
    decisions.map(async (decision) => ({
      ...decision,
      latest: await latestVersion(ctx, decision),
    })),
  );
}

export async function logActivity(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  kind: string,
  detail: string,
  decisionId?: Id<"decisions">,
) {
  await ctx.db.insert("activity", { projectId, decisionId, kind, detail, at: Date.now() });
}

/** Apply an agreed change to the project's current scope and date. */
export async function applyAgreedChange(
  ctx: MutationCtx,
  project: Doc<"projects">,
  decisionId: Id<"decisions">,
  change: Change,
) {
  const effect = effectOf(change);
  if (effect.newDate) {
    await ctx.db.patch(project._id, { currentDate: effect.newDate });
  }
  if (effect.removeItemId) {
    const id = ctx.db.normalizeId("scopeItems", effect.removeItemId);
    if (id) await ctx.db.patch(id, { status: "removed", changedByDecisionId: decisionId });
  }
  if (effect.deferItem) {
    const id = ctx.db.normalizeId("scopeItems", effect.deferItem.id);
    if (id) {
      await ctx.db.patch(id, {
        status: "deferred",
        deferredTo: effect.deferItem.destination,
        changedByDecisionId: decisionId,
      });
    }
  }
  if (effect.addItem) {
    const scope = await loadScope(ctx, project._id);
    await ctx.db.insert("scopeItems", {
      projectId: project._id,
      title: effect.addItem.title,
      inBaseline: false,
      status: "active",
      addedByDecisionId: decisionId,
      order: scope.length,
    });
  }
}
