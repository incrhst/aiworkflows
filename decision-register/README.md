# Client Decision Register

A lightweight system for recording, confirming and tracking decisions made with clients.
Most Incrementic client work is fixed price, so every change to scope or timeline must be
explicit and agreed. Product brief: *Client Decision Register: Product Brief* (Claude Docs).

This folder is self-contained so it can move to its own repository later
(`git subtree split --prefix decision-register` keeps its history).

## What works now (slice 1: the core register)

- **Kickoff baseline.** Create a project, pick the driver and the client's decision maker,
  and load the deliverables and delivery date from the proposal.
- **Decisions with a required "what it changes".** No change, date moves, scope swap,
  scope reduced (with where it went), or extra cost (a separate change order). The change
  is checked against current scope when it is drafted, sent and agreed.
- **Client responses by secure link, no passwords.** Agree, agree with a note, or "Not quite"
  (comment required; it goes back to the driver). Changes use firmer wording
  ("I agree to this change"), and the exact wording agreed is stored. Clients never edit
  decisions, and every version is kept.
- **Current scope versus baseline.** Every change is linked to the decision that caused it,
  on the driver's project page and on the client's project page.
- **Nudges.** Email reminders on working days 2 and 4, then the driver is flagged to follow
  up personally (on day 6; the brief only says "after that").
- **Team view.** Every project, filterable by driver: awaiting client, sent back,
  needs personal follow-up. The driver role can be handed over at any time.
- **Email through Resend.** Without `RESEND_API_KEY`, emails are printed to the Convex logs.

## Slice 2: capture and AI drafting

- On a project page, the driver pastes WhatsApp messages, an email or meeting notes.
- Claude (`convex/ai.ts`) drafts the decision: summary, why, what it changes, and the
  sentence it rests on. Structured outputs force the shape. The draft refers to scope items
  as S1, S2…, and `convex/lib/drafting.ts` maps them back and checks the change against
  current scope. A change that doesn't hold up is dropped, and the driver is told why.
- If the text asks for something outside current scope, the draft is flagged:
  "This looks like new scope. What is the trade?" The AI never invents a trade.
- The driver reviews and edits the draft in the normal decision form, then saves it.
  Nothing reaches the client until the driver sends it.
- Without `ANTHROPIC_API_KEY`, or if the AI declines or fails, the capture says so and the
  driver writes the decision by hand.
- Requests use refusal fallbacks (`fallbacks: "default"`): if a safety classifier declines,
  the API retries on a fallback model in the same call.

## Next slices

3. **Forwarding address.** One inbound address per project (Resend inbound), feeding the
   same draft-and-review flow.
4. **MCP connector.** "Log this as a decision" from the team's AI tools.

## Before real client use

- **Team sign-in.** The team pages and mutations have no authentication yet. Anyone with the
  Convex URL could call them. Add auth (for example Clerk or Convex Auth) and check the caller
  in every function except those in `convex/client.ts`, which use link tokens by design.
- **Resend domain.** Verify the sending domain and set `EMAIL_FROM`.

## Stack

- **Convex** (`convex/`): database, functions and the hourly nudge job (`crons.ts`).
- **Next.js on Vercel** (`app/`): team pages and client pages.
- **Resend**: outbound email (`convex/email.ts`).
- **Claude API** (`@anthropic-ai/sdk`): drafting decisions from captured text (`convex/ai.ts`).

Business rules sit in plain TypeScript in `convex/lib/` (`changes.ts`, `nudges.ts`,
`workingDays.ts`), so they can be tested without a backend.

## Run it locally

```bash
cd decision-register
npm install
npx convex dev      # first run: log in, create the project, writes .env.local
npm run dev         # in a second terminal, then open http://localhost:3000
```

Set backend variables with `npx convex env set` (see `.env.example`).

`convex/_generated/` is committed, as Convex recommends. `npx convex dev` regenerates it.

## Tests

```bash
npm test            # business rules, plus the whole flow against an in-memory Convex
npm run typecheck
```

## Deploy

On Vercel, create a project with **Root Directory** set to `decision-register`, and set the
build command to `npx convex deploy --cmd 'npm run build'` with a `CONVEX_DEPLOY_KEY`
environment variable. The repository's root `vercel.json` belongs to the Docusaurus site and
is not used by this project.

## Assumptions to confirm

- Working days skip weekends only. Public holidays are not handled.
- The driver is flagged two working days after the second reminder.
- If scope has changed since a decision was sent (for example, another decision removed
  the same item), the client cannot agree to it, and the driver revises and resends.
