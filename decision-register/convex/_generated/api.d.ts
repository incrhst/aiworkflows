/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */
  
  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as client from "../client.js";
import type * as crons from "../crons.js";
import type * as decisions from "../decisions.js";
import type * as email from "../email.js";
import type * as lib_changes from "../lib/changes.js";
import type * as lib_nudges from "../lib/nudges.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as lib_workingDays from "../lib/workingDays.js";
import type * as model from "../model.js";
import type * as nudges from "../nudges.js";
import type * as projects from "../projects.js";
import type * as team from "../team.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "client": typeof client,
"crons": typeof crons,
"decisions": typeof decisions,
"email": typeof email,
"lib/changes": typeof lib_changes,
"lib/nudges": typeof lib_nudges,
"lib/tokens": typeof lib_tokens,
"lib/workingDays": typeof lib_workingDays,
"model": typeof model,
"nudges": typeof nudges,
"projects": typeof projects,
"team": typeof team,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
  