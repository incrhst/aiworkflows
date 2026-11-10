"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

export function Providers({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <main className="page">
        <h1>Not connected</h1>
        <p>
          Set <code>NEXT_PUBLIC_CONVEX_URL</code> in <code>.env.local</code>. Running{" "}
          <code>npx convex dev</code> does this for you.
        </p>
      </main>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
