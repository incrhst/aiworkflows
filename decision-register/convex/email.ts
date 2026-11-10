// Outbound email through Resend's HTTP API.
// Environment variables (set in the Convex dashboard or with `npx convex env set`):
//   RESEND_API_KEY  – without it, emails are logged instead of sent (local dev)
//   EMAIL_FROM      – e.g. "Incrementic Decisions <decisions@example.com>"
//   APP_URL         – public URL of the front end, used to build client links
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { agreementWording, CHANGE_LABELS, isChange } from "./lib/changes";
import { latestVersion } from "./model";

const emailKind = v.union(
  v.literal("new"),
  v.literal("resend"),
  v.literal("first_nudge"),
  v.literal("second_nudge"),
);

export const decisionContext = internalQuery({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const decision = await ctx.db.get(decisionId);
    if (!decision) return null;
    const project = await ctx.db.get(decision.projectId);
    if (!project) return null;
    const driver = await ctx.db.get(project.driverId);
    const latest = await latestVersion(ctx, decision);
    const responses = await ctx.db
      .query("responses")
      .withIndex("by_decision", (q) => q.eq("decisionId", decisionId))
      .collect();
    return { decision, project, driver, latest, lastResponse: responses.at(-1) ?? null };
  },
});

export const sendDecisionEmail = internalAction({
  args: { decisionId: v.id("decisions"), kind: emailKind },
  handler: async (ctx, { decisionId, kind }) => {
    const data = await ctx.runQuery(internal.email.decisionContext, { decisionId });
    if (!data) return;
    const { decision, project, driver, latest } = data;
    const link = `${appUrl()}/d/${decision.clientToken}`;
    const ref = `D-${decision.number}`;
    const changeLine = isChange(latest.change)
      ? `This is a change to the agreed project: ${CHANGE_LABELS[latest.change.kind]}.`
      : "This fits the agreed scope and date.";
    const opener = {
      new: `A decision on ${project.name} needs your confirmation.`,
      resend: `We have updated ${ref} on ${project.name} following your comments.`,
      first_nudge: `A reminder: ${ref} on ${project.name} is waiting for your confirmation.`,
      second_nudge: `A second reminder: ${ref} on ${project.name} still needs your confirmation.`,
    }[kind];
    const subject = {
      new: `Please confirm: ${latest.summary} (${ref})`,
      resend: `Updated, please confirm: ${latest.summary} (${ref})`,
      first_nudge: `Reminder: ${latest.summary} (${ref})`,
      second_nudge: `Second reminder: ${latest.summary} (${ref})`,
    }[kind];
    const text = [
      `Hi ${project.decisionMakerName},`,
      "",
      opener,
      "",
      `Decision: ${latest.summary}`,
      `Why: ${latest.why}`,
      changeLine,
      "",
      `Review and respond (${agreementWording(latest.change)}, or "Not quite"):`,
      link,
      "",
      `Thanks,`,
      driver?.name ?? "The Incrementic team",
    ].join("\n");
    await sendEmail({ to: project.decisionMakerEmail, replyTo: driver?.email, subject, text });
  },
});

export const notifyDriverOfResponse = internalAction({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const data = await ctx.runQuery(internal.email.decisionContext, { decisionId });
    if (!data?.driver || !data.lastResponse) return;
    const { decision, project, driver, latest, lastResponse } = data;
    const verdict = {
      agree: "agreed",
      agree_with_note: "agreed with a note",
      not_quite: "sent it back (not quite)",
    }[lastResponse.kind];
    const text = [
      `${project.decisionMakerName} ${verdict} on D-${decision.number}: ${latest.summary}`,
      lastResponse.note ? `\nNote: ${lastResponse.note}` : "",
      lastResponse.kind === "not_quite" ? "\nRevise and resend it from the project page." : "",
      `\n${appUrl()}/projects/${project._id}`,
    ].join("");
    await sendEmail({
      to: driver.email,
      subject: `${project.name}: D-${decision.number} ${verdict}`,
      text,
    });
  },
});

export const notifyDriverFollowUp = internalAction({
  args: { decisionId: v.id("decisions") },
  handler: async (ctx, { decisionId }) => {
    const data = await ctx.runQuery(internal.email.decisionContext, { decisionId });
    if (!data?.driver) return;
    const { decision, project, driver, latest } = data;
    await sendEmail({
      to: driver.email,
      subject: `Follow up personally: ${project.name} D-${decision.number}`,
      text: [
        `${project.decisionMakerName} has not responded to D-${decision.number} after two reminders.`,
        `Decision: ${latest.summary}`,
        "Please follow up with them personally.",
        `${appUrl()}/projects/${project._id}`,
      ].join("\n"),
    });
  },
});

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function sendEmail(msg: { to: string; subject: string; text: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.log(`[email not sent: RESEND_API_KEY or EMAIL_FROM unset]\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    // Throwing makes the failure visible in the Convex logs.
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}
