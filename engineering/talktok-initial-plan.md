# Discussion Intelligence Platform Plan

## Working Title

Live discussion intelligence platform for classrooms, workshops, and conference Q&A.

This is not a traditional forum. The product is a live submission, clustering, analysis, and synthesis system with instructor orchestration and participant reflection.

The student-facing experience should use an acts-based wrapper over the internal session phases, with a persistent bottom-tab mobile navigation model.

## Product Intent

The platform supports real-time discussion where participants join by QR code, submit one or more ideas, receive private AI feedback, and later see their contributions synthesized into category-based class or audience insights.

The instructor or host can:

- open and manage a live discussion session
- configure categories in advance or let the AI create them dynamically
- review live clustering and merge, split, rename, or lock categories
- send follow-up questions to all participants or specific categories
- trigger comparison, synthesis, and debate-like flows

Participants can:

- join quickly with session code and nickname
- submit one or more top-level responses
- add follow-up replies
- receive private AI feedback on their submissions
- request recategorization
- compare themselves privately against class patterns
- use Fight Me mode to argue with AI or an opposing view
- review their participation and contribution summary at the end

## MVP Scope

### Included

- live session creation and joining
- reusable session templates
- QR code join flow
- nickname-based participant identity
- session persistence via local storage or cookie token
- multiple top-level submissions per participant
- follow-up replies attached to a submission or follow-up prompt
- emoji reactions
- soft word limit guidance
- private AI feedback after each submission
- acts-based student UX
- persistent bottom-tab student navigation
- hybrid categorization: predefined and dynamic
- instructor dashboard for category operations
- instructor command center
- category synthesis and publish flow
- targeted follow-up prompts
- Fight Me mode
- instructor pin and highlight actions
- student personal response zone
- typing and submission telemetry
- final consolidated summary
- participant-level reflection and contribution analysis

### Excluded for MVP

- file attachments
- image uploads
- roster import
- external authentication
- fully automated timers and rule-based phase switching
- rich moderation workflows

## User Roles

### Participant

- joins with QR code, session code, and nickname
- may change nickname later, with the updated nickname reflected across their submissions
- can leave and rejoin the session if the device token is preserved

### Instructor or Host

- creates and configures sessions
- controls phase switching
- monitors live submissions and synthesized views
- sends follow-up prompts
- reviews recategorization requests

### Admin

- optional platform-level role for later
- not required for the main MVP interaction flow

## Core Interaction Model

### Student UX Model

Students should experience the product through four acts:

- `Submit`
- `Discover`
- `Challenge`
- `Synthesize`

These acts are the user-facing wrapper over the more detailed internal phases.

Students should also have persistent bottom-tab access to:

- `Main`
- `Stream`
- `Fight Me`
- `My Zone`

`Main` reflects the current act. The other tabs provide autonomy and progressive unlock behavior.

### Submission Model

- participants may submit multiple top-level responses in a session
- each top-level response is treated as a separate unit for analysis and categorization
- the data model should support optional multi-tag assignment so a submission can later belong to more than one category if needed
- participants may add follow-up replies after submission
- replies can attach to:
  - a participant's own earlier response
  - a host-issued follow-up prompt
  - a Fight Me exchange

### Reply Analysis Rules

- addendum replies attached to a participant's own earlier response may be analyzed together with the original submission for categorization purposes
- replies to follow-up prompts should be treated as separate analysis units
- Fight Me turns should be treated as separate argument units, not merged into the original submission

### Editing Rules

For MVP, do not allow editing the original response after submission.

Reasons:

- preserves reasoning trail
- simplifies analysis and category drift
- avoids ambiguity in synthesis and contribution trace

If a participant wants to refine a point, they add a follow-up reply or addendum.

## Session Phases

Use explicit phases, switched manually by the instructor.

1. Lobby
2. Discussion Open
3. Private Feedback
4. Category Mapping
5. Synthesis Published
6. Follow-Up Round
7. Fight Me Round
8. Final Consolidation
9. Review
10. Closed

### Acts to Phase Mapping

- `Submit` maps to `Lobby`, `Discussion Open`, and parts of `Private Feedback`
- `Discover` maps to `Private Feedback`, `Category Mapping`, and `Synthesis Published`
- `Challenge` maps to `Follow-Up Round`, `Fight Me Round`, and recategorization interactions
- `Synthesize` maps to `Final Consolidation` and `Review`

### Phase Notes

#### Lobby

- participants join
- nickname is set or restored
- prompt or topic may be shown as preview

#### Discussion Open

- main topic or activity is active
- participants can submit one or more top-level responses
- this naming intentionally avoids "Prompt Open" because the session may be a discussion, Q&A, workshop, or conference activity

#### Private Feedback

- participants get private AI analysis on submitted responses
- this can happen immediately per response even while the discussion remains open

#### Category Mapping

- AI groups responses into categories
- instructor may review, rename, merge, split, or lock categories
- visible category count should stay around 5 to 8, with overflow merged into an emerging or other bucket
- when categorization is not yet published, new submissions may sit in an uncategorized holding area

#### Synthesis Published

- participants can see category names and summarized key points
- raw responses are collapsed by default and expandable on demand

#### Follow-Up Round

- instructor can send follow-up prompts to:
  - everyone
  - one or more categories
- multiple follow-up rounds are allowed

#### Fight Me Round

- participants may engage in structured counterargument mode

#### Final Consolidation

- class or audience discussion is summarized into a final synthesis

#### Review

- each participant gets private reflection and contribution analysis

## AI Features

## 1. Immediate Private Feedback

Run fast AI analysis after each top-level submission and follow-up reply.

Outputs may include:

- clarity
- depth
- distinctiveness
- support or justification quality
- whether the point is conventional or novel relative to the session
- short qualitative guidance

The student-facing tone should not accuse users of cheating or using AI. The wording should focus on reasoning quality and originality.

### Tone Controls

Participant can choose critique style:

- Supportive
- Direct
- Spicy
- Roast Me

The backend prompt should keep all modes non-personal and bounded.

## 2. Hidden Reference Comparison

Each submission may be compared against:

- an LLM-generated reference answer
- optionally an instructor-seeded reference

Purpose:

- identify generic or conventional answers
- reward distinctive reasoning or new angles
- reduce the incentive to paste obvious generated answers

This should be exposed as qualitative comparison, not as AI-authorship detection.

## 3. Hybrid Categorization

The system supports:

- instructor-seeded categories
- AI assignment into seeded categories
- AI suggestion of emerging categories

Instructor controls:

- rename category
- merge categories
- split categories
- lock category
- publish category view

Participant control:

- request recategorization
- suggest an alternate existing category

For MVP, recategorization should move to an existing or merged category rather than creating a new one from the participant side.

## 4. Similarity and Embedding Features

Useful embedding-driven capabilities:

- similar response clustering
- duplicate and near-duplicate detection
- novelty radar
- representative quote selection
- opposition mapping
- session memory
- contribution trace
- category drift across rounds

Embeddings should be part of the analysis pipeline, not the critical path for basic submission UX.

## 5. Fight Me Mode

Fight Me mode is a structured mini-argument feature.

Participant options:

- argue against AI
- argue against an opposing category or synthesized opposing view

Recommended MVP flow:

1. system generates a concise counterargument
2. participant responds
3. system replies once more or ends the round
4. system produces a short debrief

Debrief can include:

- what the participant defended well
- what was underdeveloped
- what a stronger rebuttal might include

Keep MVP Fight Me asynchronous and turn-based, not freeform real-time chat.

## 6. Final Reflection

At the end of the session, each participant receives a private reflection with:

- participation level
- quality of reasoning
- originality
- responsiveness to follow-up prompts
- contribution trace into the final synthesis
- category drift over time
- argument evolution across rounds or follow-up cycles

## Visibility Rules

Visibility should be a session-level configuration, not just an emergent phase behavior.

### Visibility Modes

- `Immediate`
  Participants can see shared discussion outputs as soon as the instructor allows live publication for the current flow. This works best when preset categories or low-latency categorization are available.
- `After Processing`
  Participants wait until the instructor triggers or approves clustering and synthesis publication.

### Visibility Progression

Recommended shared visibility progression:

1. before categorization, participants may see stream content according to visibility mode rules
2. after categorization but before publish, only the instructor sees structured categories
3. after publish, participants see category names and summarized key points
4. after final consolidation, participants see the fuller synthesis artifact and can still drill into raw responses where allowed

### Participant Sees

- own submissions and replies
- private AI feedback
- own category placements
- published category summaries
- private comparison against overall response patterns
- Fight Me interactions
- final personal reflection

### Instructor Sees

- all raw responses
- participant identities
- live category state
- merge and split suggestions
- novelty and opposition signals
- private and class-level analytics

### Class-Level Shared View

- category names
- synthesized key points
- representative quotes
- opposing views
- final consolidated takeaways

Raw responses should be anonymized and collapsed by default, with optional expansion.

### Anonymity Mode

Anonymity should be an explicit session setting:

- peers may see nicknames
- peers may see anonymized labels only
- instructor always sees participant identities

This allows classroom and conference use cases to differ without changing the underlying workflow.

## Session Configuration

Each session should support the following core configuration:

- title
- topic or opening activity
- preset categories
- visibility mode
- anonymity mode
- soft word limit
- critique tone defaults
- whether Fight Me mode is enabled
- whether summary-reading is required before targeted follow-up response
- session mode preset
- advanced model settings and JSON overrides

### Session Templates

Instructors should be able to save a session configuration as a reusable template.

Useful template fields:

- title pattern
- preset categories
- visibility mode
- anonymity mode
- soft word limit
- Fight Me availability

### Session Mode Presets

Useful preset starting points:

- `Class Discussion`
  Balanced visibility, category-driven synthesis, targeted follow-up, and reflection.
- `Conference Q&A`
  Faster response flow, stronger anonymity defaults, lighter follow-up structure, and public synthesis emphasis.
- `Workshop / Brainstorm`
  Greater support for multiple top-level responses, novelty emphasis, and looser clustering.

Presets should remain editable after selection. They are accelerators, not rigid modes.

### Publish Semantics

Publication should be treated as an explicit release of shared state, not just a rendering toggle.

Recommended publishable artifacts:

- category names
- synthesized key points
- representative quotes
- raw response visibility
- final consolidated summary

Recommended publication states:

1. `Draft`
   Instructor-only. Categories and summaries may still be unstable.
2. `Published`
   Visible to participants according to visibility and anonymity rules.
3. `Final`
   Stable consolidated artifact used for reflection, reporting, and later review.

This keeps students from seeing half-formed structure unless the instructor intentionally publishes it.

### Advanced Model Settings

The platform should support controlled advanced model configuration for experimentation, evaluation, and cost control.

Useful fields:

- model identifier
- provider identifier
- temperature or equivalent creativity control
- reasoning effort or depth mode where supported
- advanced JSON overrides for model-specific parameters

Important constraint:

- advanced JSON overrides should be restricted to instructor or admin controls
- invalid overrides should fail safely with validation and logging

### Prompt Configuration and Editing

Prompt behavior should not be locked into hardcoded invisible instructions.

The platform should expose editable prompt configuration with sensible defaults for each AI feature:

- moderation
- private feedback
- categorization
- overlap detection
- summary generation
- Fight Me
- reflection and report generation

Recommended model:

- ship with default prompt templates
- allow instructors or admins to edit prompt text
- allow prompt variables and structured placeholders
- store prompt versions and change history
- support reverting to defaults

Important constraints:

- prompt editing should only be available on the instructor-side admin interface for the demo
- students should never see or edit prompt templates, provider settings, or raw model configuration
- prompt edits should be validated before activation
- dangerous or malformed prompt JSON overrides should fail safely
- participant-facing sessions should always reference a saved prompt version, not a transient unsaved draft

### Model Setup Surface

The instructor-side admin interface should expose a dedicated model setup area rather than scattering model controls across session screens.

Useful sections:

- providers and model registry
- prompt templates
- behavior or advanced settings
- retrieval or context settings
- monitoring and observability

Useful provider and model controls:

- enable or disable provider
- fetch available models
- choose active model per feature
- define manual model entries if needed
- store or update API key state where applicable
- define pricing metadata for input, cached input, and output tokens
- attach advanced JSON variables or model config overrides

### Retrieval and Context Controls

If retrieval-backed or context-heavy features are used, the instructor-side admin tools should expose tuning controls such as:

- context preset
- recent-message limit
- search limit
- before and after context range
- retrieval provider
- embedding model
- reindex trigger

These controls are for experimentation and debugging. They should not clutter the core live-session instructor workflow.

### Session Codes

Session codes should be easy to read and type from a projected screen.

Recommendation:

- use short human-friendly codes or words
- avoid ambiguous characters
- check uniqueness against active sessions

### URL Slug Policy

All URL-facing slugs should be readable words, never opaque random IDs or long numeric strings.

Rules:

- keep Convex document IDs internal
- use readable session codes or slugs for navigation
- use readable derived slugs for participant-facing nested routes where possible
- avoid exposing raw database IDs in URLs
- resolve slugs to internal IDs server-side or through Convex queries

Examples:

- use `/join/spark`
- use `/session/ethics-ai-healthcare`
- use `/session/ethics-ai-healthcare/fight/liability-gap`
- avoid `/session/j97x8a2p9q3`
- avoid `/session/123456789`

Slug generation should:

- derive from session title or generated word code
- normalize to lowercase kebab case
- enforce uniqueness with a short readable suffix if needed
- preserve a stable slug once shared

## UX Direction

Avoid a conventional discussion board layout.

The app should feel like a hybrid of:

- live participation canvas
- synthesis dashboard
- structured response system

### Participant Surface

- topic and activity area
- submission composer
- personal feedback panel
- class synthesis panel
- follow-up prompt panel
- Fight Me panel
- My Responses zone
- personal progress or reflection panel

### My Zone

`My Zone` should be a first-class product surface, not only a post-session report.

During session it should include:

- top-level submissions
- follow-up replies
- category placements
- feedback history
- Fight Me history
- recategorization request status

After session it should include:

- personal analysis
- contribution trace
- argument evolution
- growth opportunities

### Instructor Surface

- phase controls
- response stream
- category board
- uncategorized queue
- merge and split tools
- pin and highlight tools
- follow-up targeting tools
- novelty and opposition indicators
- submission telemetry indicators
- final synthesis controls

### Instructor Command Center

The instructor interface should be treated as a dedicated command center that is:

- desktop-optimized
- projectable
- high-contrast
- centered on orchestration rather than text authoring

Key modules:

- phase and act controls
- category board
- uncategorized queue
- aggregate metrics
- consensus pulse
- typing presence
- activity feed
- follow-up targeting
- highlight and pin controls

### Shared Synthesis Surface

- category cards or lanes
- key claims per category
- representative quotes
- category overlaps
- opposing viewpoint relationships

## Protection and Safety Baseline

The MVP should not ship with only product flows. It needs explicit abuse resistance, safety rules, and operational guardrails.

### 1. Content Protection

Input and output content should both be protected.

#### Input Protection

Before a participant submission becomes publicly visible or enters downstream synthesis:

- run a fast content filter for obviously abusive, sexual, hateful, self-harm, violent, doxxing, or harassment content
- sanitize student text before sending it to LLM prompts
- treat student text as data, never as executable instruction
- strip or neutralize prompt-injection attempts such as attempts to override system instructions or reveal hidden references

#### Output Protection

Before showing any AI-generated content to participants or instructors:

- filter Fight Me replies
- filter roast-mode feedback
- filter summaries and quote selections
- ensure no AI output contains personal attacks, slurs, or accusations of cheating

#### Moderation Behavior

Recommended MVP moderation behavior:

- allow private save of a flagged submission where appropriate
- prevent flagged content from being publicly published automatically
- mark content for instructor review
- avoid showing raw moderation model reasoning to participants

### 2. Rate Limiting and Cooldowns

The platform needs application-level rate limits to prevent spam, accidental overload, and AI cost spikes.

#### Participant Rate Limits

Recommended baseline:

- join attempts per IP or device
- top-level submissions per participant per minute
- follow-up replies per participant per minute
- reactions per participant per minute
- recategorization requests per response with cooldown
- one active Fight Me thread per participant at a time
- capped Fight Me turn count per thread

#### Instructor Rate Limits

Heavy instructor-triggered operations should have cooldowns and idempotency:

- batch categorization
- merge suggestion generation
- summary regeneration
- final synthesis generation
- report generation

#### Duplicate Protection

- reject or collapse repeated identical submissions within a short window
- prevent accidental double-submit from slow mobile networks

### 3. Debounce, Throttle, and Event Hygiene

The system should not write or broadcast on every keystroke.

Recommended behavior:

- throttle typing presence updates
- debounce low-value activity updates
- batch lightweight events where possible
- keep activity feeds derived from meaningful state transitions, not raw key activity

Presence should use coarse state transitions such as:

- joined
- started typing
- active
- idle
- submitted

### 4. Privacy and Telemetry Guardrails

Typing and submission telemetry should be useful without becoming surveillance-heavy.

Required guardrails:

- telemetry must be session-configurable
- telemetry use should be disclosed in the session configuration and participant experience
- only summary telemetry should be stored for MVP, not raw keystroke history
- raw live drafts should not be broadcast or persisted as a default feature
- instructor views should default to aggregate telemetry, not invasive draft monitoring
- anonymous-to-peer mode must still preserve instructor traceability for moderation and audit

Retention guidance:

- telemetry may have shorter retention than core submissions
- flagged moderation artifacts should be auditable

### 5. AI Guardrails

The AI layer should be bounded and schema-driven.

Recommended protections:

- use separate prompts for moderation, categorization, feedback, Fight Me, and synthesis
- require structured outputs for category assignment, originality judgments, moderation flags, and summary artifacts
- record confidence or uncertainty where relevant
- use fallback states such as `pending`, `failed`, or `needs review` instead of forcing low-confidence outputs
- never present telemetry or LLM comparison as proof of AI use or cheating

#### Roast and Fight Me Safety

Roast modes and Fight Me responses must remain:

- non-personal
- non-discriminatory
- non-abusive
- focused on argument quality rather than identity or humiliation

### 6. Operational Resilience

The system should protect itself under bursty classroom or conference conditions.

Recommended baseline:

- idempotency keys for submit-like actions
- queued handling of heavy AI workflows
- audit logs for instructor overrides and category operations
- moderation logs for flagged content
- retry strategy for flaky model or third-party calls
- cost guardrails per session for expensive AI features

### 7. Protection Defaults Recommended for MVP

Minimum serious baseline:

1. fast input and output moderation
2. participant and session-level rate limiting
3. throttled typing presence
4. duplicate submission protection
5. idempotent submit handling
6. session-configurable telemetry with disclosure
7. bounded roast and Fight Me prompts
8. structured AI outputs with uncertainty handling
9. cooldowns for heavy instructor-triggered AI actions
10. audit logging for instructor overrides and publication actions

## Technical Architecture

### UI and Rendering Choices

Required UI and rendering choices:

- use `Phosphor` for icons
- use `pretext` for text display and layout-sensitive reading surfaces

Recommended uses for `pretext`:

- synthesis cards
- quote previews
- response stream previews
- masonry or bubble-based layouts
- instructor category summaries
- My Zone response cards

Important note:

- use `pretext` primarily for text display, preview, measurement, and layout stability
- use standard browser-native or app-native input controls for response composition
- do not force `pretext` into the text input or composition path unless there is a very strong reason

## Frontend

- Vite
- React
- TanStack Router
- Tailwind CSS
- shadcn/ui style components
- Base UI primitives where appropriate
- Phosphor icons
- pretext for text display surfaces
- Framer Motion if animation becomes worth the complexity

Recommendation:

- use TanStack Router for route structure
- use `convex/react` hooks for live data in MVP
- treat TanStack Query as optional later, not foundational

Reason:

Convex documents the standard React integration directly, while its React Query adapter is still documented as beta as of May 9, 2026.

## Backend

- Convex database
- Convex queries for live reads
- Convex mutations for writes and orchestration triggers
- Convex actions for LLM and embedding workflows
- internal scheduling or background jobs for heavy analysis

### Convex Component Recommendations

The plan should assume selective use of official Convex components where they clearly reduce implementation risk.

#### Recommended Early

- `@convex-dev/rate-limiter`
  Use for participant submission limits, reaction spam control, recategorization request limits, Fight Me limits, and cooldowns on heavy instructor-triggered AI actions.
- `@convex-dev/presence`
  Use for lobby presence and aggregate typing or activity states without per-keystroke event spam.
- `@convex-dev/workpool`
  Use for queued background AI work such as mass categorization, summary generation, final synthesis, and report generation while controlling parallelism.
- `@convex-dev/action-cache`
  Use for caching expensive stable action results such as hidden reference answers, deterministic summary fragments, or other high-cost repeatable AI outputs.

#### Conditional or Later

- `convex-smart-tags`
  Useful as an optional semantic enrichment layer for hierarchical tags, cross-entity tagging, and trend analysis. It should not replace the core session category model.
- `convex-batch-processor`
  Good candidate for explicitly batch-oriented workloads such as mass categorization, overlap detection across many submissions, periodic summary rebuilds, and report generation for large cohorts.
- `@convex-dev/action-retrier`
  Use selectively for flaky third-party calls if retry behavior is not already owned cleanly by the queued workflow layer.
- `@convex-dev/sharded-counter`
  Use only if hot counters become a real throughput bottleneck for large sessions.

#### Batching Guidance

Batch-style processing is likely useful for:

- mass categorization of a wave of uncategorized submissions
- overlap detection across multiple categories
- periodic summary refreshes
- final report generation

Current recommendation:

- treat batching as a required workflow pattern
- start with `workpool` for queued background execution
- evaluate `convex-batch-processor` specifically for larger batched workloads where grouping many records into one processing unit is clearer than one-job-per-item scheduling
- use whichever gives the cleaner operational model for categorization waves and report generation in practice

### LLM Telemetry and Cost Tracking

AI usage should be treated as a first-class backend concern.

Track per AI operation where available:

- provider
- model
- feature name
  - private feedback
  - categorization
  - summary generation
  - Fight Me
  - report generation
- prompt version
- input token count
- output token count
- cached input token count
- reasoning token count where exposed by the provider
- request latency
- error or retry count
- estimated or actual cost

Track at useful aggregation levels:

- per request
- per participant
- per session
- per feature
- global deployment totals

Useful controls:

- session-level AI budget cap
- per-feature budget cap
- soft warning thresholds
- automatic disabling or downgrading of expensive features when thresholds are exceeded

Recommended persistence:

- keep provider usage metadata separate from participant-facing analytics
- make AI telemetry exportable for debugging and cost review

### Optional Semantic Tagging Layer

If adopted, `convex-smart-tags` should be used as a secondary semantic layer rather than the primary workflow model.

Recommended separation of concerns:

- `categories` and `categoryAssignments`
  Session-specific discussion buckets used for live orchestration, visibility, merge and split behavior, and synthesis publication.
- `smart tags`
  Reusable semantic labels used for hierarchy, cross-cutting concepts, retrieval, trend analysis, and richer report generation.

Good entities to tag:

- submissions
- submission replies
- summaries
- follow-up prompts
- Fight Me threads
- later, synthesis artifacts

Good uses:

- hierarchical themes
- cross-cutting semantic labels
- reusable taxonomy across sessions
- trend analysis over time
- richer contribution tracing

Important constraint:

- smart tags should not replace category merge, split, lock, publish, or session-visibility logic
- the MVP UI does not need to expose full tag hierarchy even if the backend stores it

### Suggested Category-to-Tag Workflow

If smart tags are adopted, the safest workflow is:

1. the LLM generates live session categories
2. those categories remain the source of truth in the normal `categories` table
3. a normalization step proposes smart-tag candidates for those categories
4. the system attempts to match candidates to existing smart tags using exact, alias, or semantic matching
5. only high-confidence or approved concepts become new smart tags
6. mapped smart tags are then applied to related entities such as submissions, summaries, follow-up prompts, or synthesis artifacts

Recommended mapping metadata:

- source session category
- proposed smart tag path
- mapping type
  - exact
  - alias
  - semantic
  - manual
- confidence
- approval state

Recommended guardrails:

- do not automatically promote every generated category into the canonical tag hierarchy
- keep visible session category labels intact even when they map to a normalized tag
- review low-confidence mappings before turning them into reusable taxonomy nodes

This keeps:

- `categories` as the live orchestration layer
- `smart tags` as the reusable semantic memory layer

### LLM Observability

The instructor-side admin tools should include an observability view for LLM usage and failures.

Useful summary cards:

- total calls
- estimated cost
- total tokens
- average latency
- error count or error rate

Useful breakdowns:

- by feature
- by model
- by status
- by item type
- recent call log

Useful call-level detail:

- time
- provider
- model
- feature or surface
- stage
- status
- latency
- input tokens
- output tokens
- reasoning tokens where available
- estimated cost
- retries
- raw request JSON
- raw response or error payload

Recommended admin affordances:

- export telemetry data
- filter by time range
- drill into failed generations
- recalculate missing costs if provider pricing metadata changes

### Recommended MVP Defaults for AI Telemetry

The MVP should treat these fields as mandatory when the provider exposes them:

- provider
- model
- feature name
- prompt version
- input tokens
- output tokens
- cached input tokens
- request latency
- retry count
- estimated or actual cost

These fields are useful but optional depending on provider support:

- reasoning tokens
- cache write tokens
- tool-call counts
- server-side queue time

### Recommended MVP Defaults for AI Budgets

Suggested baseline controls:

- per-session soft budget warning
- per-session hard budget ceiling
- per-feature soft warning thresholds
- per-feature fallback behavior when thresholds are exceeded

Recommended fallback order when costs climb:

1. reduce repeated summary refresh frequency
2. downgrade or defer rich reflection generation
3. queue or defer Fight Me generation
4. switch expensive analyses to instructor-triggered only

The system should fail gracefully:

- do not block core submission flow if AI budgets are exceeded
- preserve submissions and show that advanced analysis is delayed, queued, or unavailable

## Suggested Route Structure

- `/` landing or session join
- `/join/:sessionCode`
- `/session/:sessionSlug`
- `/session/:sessionSlug/submission/:submissionSlug`
- `/session/:sessionSlug/fight/:fightSlug`
- `/instructor`
- `/instructor/session/:sessionSlug`
- `/instructor/session/:sessionSlug/categories`
- `/instructor/session/:sessionSlug/synthesis`
- `/review/:sessionSlug`

## Suggested Convex Data Model

### Core Tables

- `sessions`
- `sessionConfigs`
- `sessionTemplates`
- `participants`
- `topics`
- `submissions`
- `submissionReplies`
- `categories`
- `categoryAssignments`
- `recategorizationRequests`
- `followUpPrompts`
- `followUpTargets`
- `analyses`
- `summaries`
- `reactions`
- `submissionTelemetry`
- `fightMeThreads`
- `fightMeTurns`

### Optional or Derived Tables

- `embeddings`
- `noveltySignals`
- `oppositionLinks`
- `participationSnapshots`
- `synthesisArtifacts`
- `reportArtifacts`

### Data Modeling Rules

- keep raw submission content separate from analysis outputs
- keep category assignments separate from categories
- keep final synthesis separate from intermediate synthesis
- preserve timestamps and phase context for drift and contribution analysis
- keep telemetry separate from pedagogical analysis so it can be turned on or off by policy

## Typing and Submission Telemetry

The platform can capture lightweight submission-process signals to help interpret how a response was produced.

Useful signals:

- first keypress timestamp
- submit timestamp
- active typing duration
- idle gaps
- paste events
- character burst patterns
- total revision count within the composer

Potential uses:

- identify likely copy-paste behavior
- distinguish rapid dump-in submissions from slow composition
- help instructors interpret whether a response was drafted thoughtfully or inserted abruptly
- enrich private reflection and instructor analytics

Important constraint:

These signals should be treated as behavioral indicators, not proof of cheating or quality.

Student-facing use should stay soft:

- composed gradually
- revised actively
- submitted quickly
- likely pasted in full

Avoid punitive or accusatory wording.

## Typing Presence Strategy

Do not make raw live typing streams the default shared experience.

For sessions with large cohorts such as 200 participants, showing every student's live typing in real time creates unnecessary noise, bandwidth churn, and UI distraction.

Recommended MVP approach:

- show participant presence counts
- show aggregate typing indicators such as `23 people typing`
- optionally show instructor-only progress metrics such as `started typing`, `submitted`, `idle`
- do not broadcast per-keystroke text or full live draft previews

Possible later enhancement:

- small-group live typing previews
- instructor-only sampling view
- opt-in collaborative drafting mode

## Consensus and Position Shift

### Consensus Pulse

Consensus pulse should be included as a lightweight aggregate signal to help instructors judge when to move the discussion forward.

Important constraint:

- it should be grounded in explicit signals where possible, such as reactions, stance prompts, or structured responses
- it should not overclaim semantic certainty from freeform text alone

### Position Shift Tracker

Participants should be able to explicitly flag `I changed my mind`.

Useful metadata:

- what changed
- what influenced the change
- which category or opposing idea was most persuasive

This should feed:

- My Zone
- instructor analytics
- final reflection

## AI Pipelines

### Fast Path

Triggered immediately after each submission.

- generate private feedback
- generate reference comparison
- produce provisional category suggestion
- compute initial novelty indicators
- store submission telemetry summary

### Background Path

Triggered on thresholds or instructor action.

- support both manual and threshold-based categorization triggers
- recluster submissions
- merge similar categories
- generate representative quotes
- detect opposing viewpoints
- build synthesis cards
- build argument evolution traces

### End-of-Session Path

- generate final consolidated summary
- generate participant reflections
- compute contribution trace
- compute category drift and response evolution
- generate report artifacts on demand where possible

## Final Consolidated Summary

Should include:

- top categories
- key points per category
- representative quotes
- overlapping themes
- novel or overlooked viewpoints
- opposing viewpoints where relevant
- argument evolution across rounds
- teaching or facilitation follow-up suggestions

## Recommended Build Sequence

1. App shell and routing
2. Convex setup and AI helper files
3. Session creation and join flow
4. Participant identity persistence
5. Multiple top-level submission flow
6. Follow-up replies and reactions
7. Private AI feedback
8. Category board and instructor controls
9. Follow-up targeting
10. Fight Me mode
11. Final synthesis and participant reflection
12. Embedding-enhanced features
13. Templates, telemetry, and reporting refinements

## Stretch Goals

- D3-based argument map showing support, contradiction, and isolated viewpoints
- richer category drift visualizations over multiple rounds

## Convex Setup Notes

Recommended initial steps:

```bash
npm install convex
npx convex dev
npx convex ai-files install
```

Official references:

- https://docs.convex.dev/quickstart/react
- https://docs.convex.dev/client/react/
- https://docs.convex.dev/ai
- https://docs.convex.dev/client/tanstack-query

## Open Decisions for the Next Planning Pass

- whether a single session can hold multiple topic blocks
- whether instructor reference answers are required or optional
- whether raw peer responses become visible only after synthesis publish
- how many Fight Me turns to allow by default
- whether category drift should be shown as cards first and charts later
- whether conference-style anonymous public display should differ from classroom display
- whether telemetry is enabled by default or session-configurable
- whether multi-tag categorization is allowed in MVP or only schema-ready
- whether summary-reading before follow-up is optional, recommended, or required
