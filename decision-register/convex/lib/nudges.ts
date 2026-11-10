import { workingDaysBetween } from "./workingDays";

// Default schedule from the brief. Configurable schedules are out of scope for
// version one, so these live here as constants.
export const FIRST_NUDGE_AFTER = 2; // working days after sending
export const SECOND_NUDGE_AFTER = 4;
// The brief says "after that, the driver is flagged". We flag two working days
// after the second nudge, keeping the same rhythm.
export const DRIVER_FOLLOW_UP_AFTER = 6;

export type NudgeAction = "first_nudge" | "second_nudge" | "flag_driver" | null;

export interface NudgeState {
  sentAt: number;
  nudgeCount: number;
  needsPersonalFollowUp: boolean;
}

/** Decide the next nudge step for a decision that is awaiting the client. */
export function nextNudgeAction(state: NudgeState, now: number): NudgeAction {
  const days = workingDaysBetween(state.sentAt, now);
  if (state.nudgeCount === 0 && days >= FIRST_NUDGE_AFTER) return "first_nudge";
  if (state.nudgeCount === 1 && days >= SECOND_NUDGE_AFTER) return "second_nudge";
  if (
    state.nudgeCount >= 2 &&
    !state.needsPersonalFollowUp &&
    days >= DRIVER_FOLLOW_UP_AFTER
  ) {
    return "flag_driver";
  }
  return null;
}
