import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("teamMembers").collect();
  },
});

export const add = mutation({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, { name, email }) => {
    const normalised = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("teamMembers", { name: name.trim(), email: normalised });
  },
});
