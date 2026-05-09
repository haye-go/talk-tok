/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiFeedback from "../aiFeedback.js";
import type * as audit from "../audit.js";
import type * as bootstrap from "../bootstrap.js";
import type * as categorisation from "../categorisation.js";
import type * as categoryManagement from "../categoryManagement.js";
import type * as fightMe from "../fightMe.js";
import type * as followUps from "../followUps.js";
import type * as instructorCommandCenter from "../instructorCommandCenter.js";
import type * as instructorControls from "../instructorControls.js";
import type * as jobs from "../jobs.js";
import type * as llm from "../llm.js";
import type * as llmObservability from "../llmObservability.js";
import type * as modelSettings from "../modelSettings.js";
import type * as participantWorkspace from "../participantWorkspace.js";
import type * as participants from "../participants.js";
import type * as promptTemplates from "../promptTemplates.js";
import type * as protection from "../protection.js";
import type * as recategorisation from "../recategorisation.js";
import type * as sessions from "../sessions.js";
import type * as submissions from "../submissions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiFeedback: typeof aiFeedback;
  audit: typeof audit;
  bootstrap: typeof bootstrap;
  categorisation: typeof categorisation;
  categoryManagement: typeof categoryManagement;
  fightMe: typeof fightMe;
  followUps: typeof followUps;
  instructorCommandCenter: typeof instructorCommandCenter;
  instructorControls: typeof instructorControls;
  jobs: typeof jobs;
  llm: typeof llm;
  llmObservability: typeof llmObservability;
  modelSettings: typeof modelSettings;
  participantWorkspace: typeof participantWorkspace;
  participants: typeof participants;
  promptTemplates: typeof promptTemplates;
  protection: typeof protection;
  recategorisation: typeof recategorisation;
  sessions: typeof sessions;
  submissions: typeof submissions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
