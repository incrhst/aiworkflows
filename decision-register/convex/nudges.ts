import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { nextNudgeAction } from "./lib/nudges";
import { logActivity } from "./model";

/** Runs on a schedule (see crons.ts). Sends nudges and flags drivers. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const awaiting = await ctx.db
      .query("decisions")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_client"))
      .collect();
    for (const decision of awaiting) {
      if (decision.sentAt === undefined) continue;
      const action = nextNudgeAction(
        {
          sentAt: decision.sentAt,
          nudgeCount: decision.nudgeCount,
          needsPersonalFollowUp: decision.needsPersonalFollowUp,
        },
        now,
      );
      if (action === "first_nudge" || action === "second_nudge") {
        await ctx.db.patch(decision._id, {
          nudgeCount: decision.nudgeCount + 1,
          lastNudgeAt: now,
        });
        await ctx.scheduler.runAfter(0, internal.email.sendDecisionEmail, {
          decisionId: decision._id,
          kind: action,
        });
        await logActivity(
          ctx,
          decision.projectId,
          "nudge_sent",
          `${action === "first_nudge" ? "First" : "Second"} reminder sent for D-${decision.number}.`,
          decision._id,
        );
      } else if (action === "flag_driver") {
        await ctx.db.patch(decision._id, { needsPersonalFollowUp: true });
        await ctx.scheduler.runAfter(0, internal.email.notifyDriverFollowUp, {
          decisionId: decision._id,
        });
        await logActivity(
          ctx,
          decision.projectId,
          "driver_flagged",
          `No response to D-${decision.number} after two reminders. Driver to follow up personally.`,
          decision._id,
        );
      }
    }
  },
});
