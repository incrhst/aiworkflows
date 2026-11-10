import { CHANGE_LABELS, type Change } from "@/convex/lib/changes";

interface ScopeRef {
  id: string;
  title: string;
}

/** One-line, plain-English description of what a decision changes. */
export function describeChange(change: Change, scope: ScopeRef[]): string {
  const title = (id: string) => scope.find((s) => s.id === id)?.title ?? "an item";
  switch (change.kind) {
    case "none":
      return "Fits the existing scope and date.";
    case "date_moves":
      return `Delivery date moves from ${change.fromDate} to ${change.toDate}.`;
    case "scope_swap":
      return `"${change.inTitle}" comes in; "${title(change.outItemId)}" goes out.`;
    case "scope_reduced":
      return `"${title(change.itemId)}" is dropped or deferred: ${change.destination}.`;
    case "extra_cost":
      return `Extra cost, handled as a separate change order: ${change.description}`;
  }
}

export function ChangePill({ kind }: { kind: Change["kind"] }) {
  return <span className={`pill${kind === "none" ? "" : " change"}`}>{CHANGE_LABELS[kind]}</span>;
}
