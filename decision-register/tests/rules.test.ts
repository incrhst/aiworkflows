import { describe, expect, it } from "vitest";
import { workingDaysBetween } from "../convex/lib/workingDays";
import { nextNudgeAction } from "../convex/lib/nudges";
import {
  agreementWording,
  effectOf,
  validateChange,
  type ScopeItemState,
} from "../convex/lib/changes";

const at = (iso: string) => Date.parse(iso);

describe("workingDaysBetween", () => {
  it("counts weekdays only", () => {
    // Monday 9:00 to Wednesday 9:00 = 2 working days.
    expect(workingDaysBetween(at("2026-11-09T09:00Z"), at("2026-11-11T09:00Z"))).toBe(2);
    // Friday 9:00 to Monday 9:00 = 1 working day (weekend skipped).
    expect(workingDaysBetween(at("2026-11-13T09:00Z"), at("2026-11-16T09:00Z"))).toBe(1);
    // Friday to Tuesday = 2.
    expect(workingDaysBetween(at("2026-11-13T09:00Z"), at("2026-11-17T09:00Z"))).toBe(2);
  });

  it("does not count partial days", () => {
    expect(workingDaysBetween(at("2026-11-09T09:00Z"), at("2026-11-10T08:59Z"))).toBe(0);
  });
});

describe("nextNudgeAction", () => {
  const sentAt = at("2026-11-09T09:00Z"); // Monday
  const state = { sentAt, nudgeCount: 0, needsPersonalFollowUp: false };

  it("waits until day 2 for the first nudge", () => {
    expect(nextNudgeAction(state, at("2026-11-10T10:00Z"))).toBeNull();
    expect(nextNudgeAction(state, at("2026-11-11T09:00Z"))).toBe("first_nudge");
  });

  it("sends the second nudge on day 4", () => {
    const s = { ...state, nudgeCount: 1 };
    expect(nextNudgeAction(s, at("2026-11-12T09:00Z"))).toBeNull(); // day 3
    expect(nextNudgeAction(s, at("2026-11-13T09:00Z"))).toBe("second_nudge"); // Fri, day 4
  });

  it("flags the driver after that, once", () => {
    const s = { ...state, nudgeCount: 2 };
    expect(nextNudgeAction(s, at("2026-11-16T09:00Z"))).toBeNull(); // Mon, day 5
    expect(nextNudgeAction(s, at("2026-11-17T09:00Z"))).toBe("flag_driver"); // Tue, day 6
    expect(nextNudgeAction({ ...s, needsPersonalFollowUp: true }, at("2026-11-20T09:00Z"))).toBeNull();
  });
});

describe("changes", () => {
  const scope: ScopeItemState[] = [
    { id: "a", title: "Login", inBaseline: true, status: "active" },
    { id: "b", title: "Reports", inBaseline: true, status: "active" },
    { id: "c", title: "Exports", inBaseline: true, status: "deferred" },
  ];
  const date = "2027-01-15";

  it("accepts no change", () => {
    expect(validateChange({ kind: "none" }, scope, date)).toEqual([]);
  });

  it("requires the date move to start from the current date", () => {
    expect(validateChange({ kind: "date_moves", fromDate: date, toDate: "2027-02-01" }, scope, date)).toEqual([]);
    expect(validateChange({ kind: "date_moves", fromDate: "2027-01-01", toDate: "2027-02-01" }, scope, date)).toHaveLength(1);
    expect(validateChange({ kind: "date_moves", fromDate: date, toDate: date }, scope, date)).toHaveLength(1);
  });

  it("requires a swap to name what comes in and an active item going out", () => {
    expect(validateChange({ kind: "scope_swap", inTitle: "SSO", outItemId: "b" }, scope, date)).toEqual([]);
    expect(validateChange({ kind: "scope_swap", inTitle: " ", outItemId: "b" }, scope, date)).toHaveLength(1);
    expect(validateChange({ kind: "scope_swap", inTitle: "SSO", outItemId: "c" }, scope, date)).toHaveLength(1);
  });

  it("requires a reduction to say where the item went", () => {
    expect(validateChange({ kind: "scope_reduced", itemId: "a", destination: "phase 2" }, scope, date)).toEqual([]);
    expect(validateChange({ kind: "scope_reduced", itemId: "a", destination: "" }, scope, date)).toHaveLength(1);
  });

  it("uses firmer wording for changes", () => {
    expect(agreementWording({ kind: "none" })).toBe("I agree");
    expect(agreementWording({ kind: "extra_cost", description: "x" })).toBe("I agree to this change");
  });

  it("maps changes to scope and date effects", () => {
    expect(effectOf({ kind: "date_moves", fromDate: date, toDate: "2027-02-01" })).toEqual({ newDate: "2027-02-01" });
    expect(effectOf({ kind: "scope_swap", inTitle: " SSO ", outItemId: "b" })).toEqual({ addItem: { title: "SSO" }, removeItemId: "b" });
    expect(effectOf({ kind: "extra_cost", description: "x" })).toEqual({});
  });
});
