import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly is fine-grained enough for working-day nudges.
crons.interval("decision nudges", { hours: 1 }, internal.nudges.run, {});

export default crons;
