import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { newToken } from "./lib/tokens";
import { loadScope, decisionsWithLatest } from "./model";

/** Kickoff: create a project and load the baseline scope from the proposal. */
export const create = mutation({
  args: {
    name: v.string(),
    clientName: v.string(),
    driverId: v.id("teamMembers"),
    decisionMakerName: v.string(),
    decisionMakerEmail: v.string(),
    deliveryDate: v.string(),
    deliverables: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const deliverables = args.deliverables.map((d) => d.trim()).filter(Boolean);
    if (deliverables.length === 0) throw new ConvexError("Add at least one deliverable.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.deliveryDate)) {
      throw new ConvexError("Delivery date must be YYYY-MM-DD.");
    }
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: args.name.trim(),
      clientName: args.clientName.trim(),
      driverId: args.driverId,
      decisionMakerName: args.decisionMakerName.trim(),
      decisionMakerEmail: args.decisionMakerEmail.trim().toLowerCase(),
      baselineDate: args.deliveryDate,
      currentDate: args.deliveryDate,
      clientToken: newToken(),
      nextDecisionNumber: 1,
      createdAt: now,
    });
    for (const [order, title] of deliverables.entries()) {
      await ctx.db.insert("scopeItems", {
        projectId,
        title,
        inBaseline: true,
        status: "active",
        order,
      });
    }
    await ctx.db.insert("activity", {
      projectId,
      kind: "baseline_loaded",
      detail: `Baseline loaded: ${deliverables.length} deliverables, due ${args.deliveryDate}.`,
      at: now,
    });
    return projectId;
  },
});

/** Team view: every project, with what each driver needs to act on. */
export const teamView = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();
    return await Promise.all(
      projects.map(async (project) => {
        const driver = await ctx.db.get(project.driverId);
        const decisions = await ctx.db
          .query("decisions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        return {
          _id: project._id,
          name: project.name,
          clientName: project.clientName,
          driverId: project.driverId,
          driverName: driver?.name ?? "Unknown",
          baselineDate: project.baselineDate,
          currentDate: project.currentDate,
          counts: {
            drafts: decisions.filter((d) => d.status === "draft").length,
            awaitingClient: decisions.filter((d) => d.status === "awaiting_client").length,
            sentBack: decisions.filter((d) => d.status === "sent_back").length,
            followUp: decisions.filter(
              (d) => d.status === "awaiting_client" && d.needsPersonalFollowUp,
            ).length,
            agreed: decisions.filter((d) => d.status === "agreed").length,
          },
        };
      }),
    );
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) return null;
    const driver = await ctx.db.get(project.driverId);
    const activity = await ctx.db
      .query("activity")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(50);
    return {
      project,
      driver,
      scope: await loadScope(ctx, projectId),
      decisions: await decisionsWithLatest(ctx, projectId),
      activity,
    };
  },
});

/** The driver role can be handed to someone else at any time. */
export const handOverDriver = mutation({
  args: { projectId: v.id("projects"), newDriverId: v.id("teamMembers") },
  handler: async (ctx, { projectId, newDriverId }) => {
    const project = await ctx.db.get(projectId);
    if (!project) throw new ConvexError("Project not found.");
    if (project.driverId === newDriverId) return;
    const from = await ctx.db.get(project.driverId);
    const to = await ctx.db.get(newDriverId);
    if (!to) throw new ConvexError("Team member not found.");
    await ctx.db.patch(projectId, { driverId: newDriverId });
    await ctx.db.insert("activity", {
      projectId,
      kind: "driver_handover",
      detail: `Driver handed over from ${from?.name ?? "unknown"} to ${to.name}.`,
      at: Date.now(),
    });
  },
});
