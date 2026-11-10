// "What it changes" — the required, rigorous field on every decision.
// On fixed price work the price holds, so every change is a trade between
// scope and time. These types are shared by the Convex functions and the UI.

export type Change =
  | { kind: "none" }
  | { kind: "date_moves"; fromDate: string; toDate: string }
  | { kind: "scope_swap"; inTitle: string; outItemId: string }
  | { kind: "scope_reduced"; itemId: string; destination: string }
  | { kind: "extra_cost"; description: string };

export type ScopeStatus = "active" | "removed" | "deferred";

export interface ScopeItemState {
  id: string;
  title: string;
  inBaseline: boolean;
  status: ScopeStatus;
}

export const CHANGE_LABELS: Record<Change["kind"], string> = {
  none: "No change",
  date_moves: "Date moves",
  scope_swap: "Scope swap",
  scope_reduced: "Scope reduced",
  extra_cost: "Extra cost",
};

export function isChange(change: Change): boolean {
  return change.kind !== "none";
}

/** Wording the decision maker agrees to. Changes get firmer wording. */
export function agreementWording(change: Change): string {
  return isChange(change) ? "I agree to this change" : "I agree";
}

/**
 * Check a change against the current scope before it is saved or sent.
 * Returns a list of problems; an empty list means the change is valid.
 */
export function validateChange(
  change: Change,
  scope: ScopeItemState[],
  currentDate: string,
): string[] {
  const problems: string[] = [];
  const active = (id: string) =>
    scope.find((item) => item.id === id && item.status === "active");

  switch (change.kind) {
    case "none":
      break;
    case "date_moves":
      if (change.fromDate !== currentDate) {
        problems.push(
          `The "before" date must be the current delivery date (${currentDate}).`,
        );
      }
      if (!isIsoDate(change.toDate)) problems.push("The new date is not a valid date.");
      if (change.toDate === change.fromDate) {
        problems.push("The new date is the same as the current date.");
      }
      break;
    case "scope_swap":
      if (!change.inTitle.trim()) problems.push("Name the item coming in.");
      if (!active(change.outItemId)) {
        problems.push("Choose a current scope item going out.");
      }
      break;
    case "scope_reduced":
      if (!active(change.itemId)) problems.push("Choose a current scope item to drop or defer.");
      if (!change.destination.trim()) {
        problems.push('Say where the item went (for example, "phase 2" or "dropped").');
      }
      break;
    case "extra_cost":
      if (!change.description.trim()) {
        problems.push("Describe the extra cost. It is handled as a separate change order.");
      }
      break;
  }
  return problems;
}

/** The effect an agreed change has on the project's scope and date. */
export interface ChangeEffect {
  newDate?: string;
  addItem?: { title: string };
  removeItemId?: string;
  deferItem?: { id: string; destination: string };
}

export function effectOf(change: Change): ChangeEffect {
  switch (change.kind) {
    case "date_moves":
      return { newDate: change.toDate };
    case "scope_swap":
      return { addItem: { title: change.inTitle.trim() }, removeItemId: change.outItemId };
    case "scope_reduced":
      return { deferItem: { id: change.itemId, destination: change.destination.trim() } };
    case "none":
    case "extra_cost":
      // Extra cost sits outside the fixed price: no scope or date effect here.
      return {};
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
