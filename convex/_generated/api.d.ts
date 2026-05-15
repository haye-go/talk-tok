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
import type * as argumentMap from "../argumentMap.js";
import type * as audit from "../audit.js";
import type * as bootstrap from "../bootstrap.js";
import type * as budget from "../budget.js";
import type * as categorisation from "../categorisation.js";
import type * as categoryManagement from "../categoryManagement.js";
import type * as components_ from "../components.js";
import type * as demo from "../demo.js";
import type * as fightMe from "../fightMe.js";
import type * as followUps from "../followUps.js";
import type * as instructorCommandCenter from "../instructorCommandCenter.js";
import type * as instructorControls from "../instructorControls.js";
import type * as jobs from "../jobs.js";
import type * as llm from "../llm.js";
import type * as llmObservability from "../llmObservability.js";
import type * as migrations from "../migrations.js";
import type * as modelSettings from "../modelSettings.js";
import type * as participantWorkspace from "../participantWorkspace.js";
import type * as participants from "../participants.js";
import type * as personalReports from "../personalReports.js";
import type * as positionShifts from "../positionShifts.js";
import type * as previewAuth from "../previewAuth.js";
import type * as previewAuthGuard from "../previewAuthGuard.js";
import type * as promptTemplates from "../promptTemplates.js";
import type * as protection from "../protection.js";
import type * as questionBaselines from "../questionBaselines.js";
import type * as questionCapabilities from "../questionCapabilities.js";
import type * as questionScope from "../questionScope.js";
import type * as reactions from "../reactions.js";
import type * as recategorisation from "../recategorisation.js";
import type * as semantic from "../semantic.js";
import type * as sessionQuestions from "../sessionQuestions.js";
import type * as sessionTemplates from "../sessionTemplates.js";
import type * as sessions from "../sessions.js";
import type * as stageDemo from "../stageDemo.js";
import type * as submissionStatus from "../submissionStatus.js";
import type * as submissions from "../submissions.js";
import type * as synthesis from "../synthesis.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiFeedback: typeof aiFeedback;
  argumentMap: typeof argumentMap;
  audit: typeof audit;
  bootstrap: typeof bootstrap;
  budget: typeof budget;
  categorisation: typeof categorisation;
  categoryManagement: typeof categoryManagement;
  components: typeof components_;
  demo: typeof demo;
  fightMe: typeof fightMe;
  followUps: typeof followUps;
  instructorCommandCenter: typeof instructorCommandCenter;
  instructorControls: typeof instructorControls;
  jobs: typeof jobs;
  llm: typeof llm;
  llmObservability: typeof llmObservability;
  migrations: typeof migrations;
  modelSettings: typeof modelSettings;
  participantWorkspace: typeof participantWorkspace;
  participants: typeof participants;
  personalReports: typeof personalReports;
  positionShifts: typeof positionShifts;
  previewAuth: typeof previewAuth;
  previewAuthGuard: typeof previewAuthGuard;
  promptTemplates: typeof promptTemplates;
  protection: typeof protection;
  questionBaselines: typeof questionBaselines;
  questionCapabilities: typeof questionCapabilities;
  questionScope: typeof questionScope;
  reactions: typeof reactions;
  recategorisation: typeof recategorisation;
  semantic: typeof semantic;
  sessionQuestions: typeof sessionQuestions;
  sessionTemplates: typeof sessionTemplates;
  sessions: typeof sessions;
  stageDemo: typeof stageDemo;
  submissionStatus: typeof submissionStatus;
  submissions: typeof submissions;
  synthesis: typeof synthesis;
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

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  aiWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"aiWorkpool">;
  actionCache: import("@convex-dev/action-cache/_generated/component.js").ComponentApi<"actionCache">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
