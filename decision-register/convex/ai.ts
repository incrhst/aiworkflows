"use node";
// Drafts a decision from a capture with Claude. Needs ANTHROPIC_API_KEY set on
// the Convex deployment (`npx convex env set ANTHROPIC_API_KEY ...`).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  DraftSchema,
  SYSTEM_PROMPT,
  buildUserMessage,
  normaliseDraft,
} from "./lib/drafting";

const MODEL = "claude-opus-5-5";

export const draftCapture = internalAction({
  args: { captureId: v.id("captures") },
  handler: async (ctx, { captureId }) => {
    const data = await ctx.runQuery(internal.captures.draftingContext, { captureId });
    if (!data) return; // dismissed or already handled
    const fail = (error: string) => ctx.runMutation(internal.captures.markFailed, { captureId, error });

    if (!process.env.ANTHROPIC_API_KEY) {
      await fail("AI drafting is not set up (ANTHROPIC_API_KEY is missing). Write the decision by hand.");
      return;
    }

    const context = {
      projectName: data.project.name,
      clientName: data.project.clientName,
      baselineDate: data.project.baselineDate,
      currentDate: data.project.currentDate,
      today: new Date().toISOString().slice(0, 10),
      scope: data.scope,
    };

    const client = new Anthropic();
    let response;
    try {
      response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        // If a safety classifier declines, the API retries on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(DraftSchema) },
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUserMessage(context, data.capture.channel, data.capture.text) },
        ],
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        await fail("AI drafting is busy right now. Try again in a minute.");
      } else if (err instanceof Anthropic.AuthenticationError) {
        await fail("AI drafting is not set up correctly (the API key was rejected).");
      } else if (err instanceof Anthropic.APIError) {
        await fail(`AI drafting failed (${err.status ?? "network error"}). Try again or write it by hand.`);
      } else {
        throw err;
      }
      return;
    }

    if (response.stop_reason === "refusal") {
      await fail("The AI declined to draft from this text. Write the decision by hand.");
      return;
    }
    const parsed = response.parsed_output;
    if (response.stop_reason === "max_tokens" || !parsed) {
      await fail("The AI draft came back incomplete. Try again or write it by hand.");
      return;
    }

    const draft = normaliseDraft(parsed, context);
    await ctx.runMutation(internal.captures.saveDraft, {
      captureId,
      draft: { ...draft, change: draft.change ?? undefined, model: response.model },
    });
  },
});
