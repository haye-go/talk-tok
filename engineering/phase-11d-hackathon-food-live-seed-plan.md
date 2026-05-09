# Phase 11D: Hackathon Food Live-Stage Seed

## Purpose

Create a second demo seed for an on-stage live session with real participants.

This is separate from the judge persona demo. The judge demo is pre-populated for exploration. This live-stage seed should create a ready-to-run session that participants can join from the projected QR code and contribute to in real time.

Discussion question:

> What's the best food for a hackathon?

## Recommended Session Setup

The session should be created as a real Convex `sessions` row, not a local mock.

Recommended values:

- session slug: `best-food-for-a-hackathon-live`
- session title: `Best Food for a Hackathon`
- opening topic/question: `What's the best food for a hackathon? Defend your answer with one practical reason and one morale reason.`
- mode: `class_discussion`
- visibility mode: `private_until_released`
- anonymity: `nicknames_visible`
- soft word limit: `200`
- default critique tone: `spicy`
- category soft cap: `6`
- Fight Me: enabled
- Summary Gate: enabled
- Telemetry: enabled
- session code: `SNACK`

Backend note:

- Use the existing `class_discussion` mode for this live-stage seed.
- Do not add a new `workshop` mode for this seed.

## Preset Categories

Do not reuse the old `Legal/Regulatory`, `Ethical`, `Practical` categories for this seed.

Recommended preset categories:

1. **Sustained Energy**
   - Foods that keep people alert without a crash.
2. **Clean and Keyboard-Safe**
   - Low-mess foods that will not destroy laptops, mice, or shared tables.
3. **Shareable Crowd Food**
   - Pizza, sushi platters, sandwiches, wraps, snacks, and other group-friendly options.
4. **Comfort and Morale**
   - Foods that lift mood, reduce stress, or become part of the event memory.
5. **Caffeine and Sugar**
   - Drinks, desserts, candy, and high-speed fuel.
6. **Dietary Inclusive**
   - Vegetarian, halal, allergy-aware, gluten-free, and other inclusive options.

## Seed Strategy

Because this is for real live participants, keep the session mostly empty by default.

Seed by default:

- session row
- preset categories
- optional instructor-facing welcome activity/audit event
- prompt template defaults already available globally

Do not seed by default:

- participant responses
- Fight Me threads
- personal reports
- synthesis artifacts

Reason:

- The on-stage value is seeing real answers arrive live.
- Pre-filled participant responses could confuse judges and audience members about what is live.
- The dashboard should start clean, then visibly populate as people join.

## Optional Warm-Start Mode

Add an optional `includeWarmStart` flag for emergencies.

If enabled, seed 3-4 clearly labeled sample responses so the dashboard is not empty if Wi-Fi or audience participation fails.

Recommended warm-start responses:

1. `Mira`
   - "Bananas and peanut butter. Not glamorous, but it is cheap, quick, and does not make your keyboard look like a crime scene."
   - Category: Sustained Energy.
2. `Dev`
   - "Pizza wins because nobody needs instructions. The downside is grease, but the upside is that it turns tired strangers into a team."
   - Category: Shareable Crowd Food.
3. `Kai`
   - "Sushi rolls are underrated. Clean, bite-sized, shareable, and you can eat without falling into a carb coma before judging."
   - Category: Clean and Keyboard-Safe.
4. `Nora`
   - "Good coffee plus fruit is the best combo. Coffee keeps people moving, fruit stops the room from becoming pure sugar panic."
   - Category: Caffeine and Sugar.

Warm-start rules:

- The UI should label these as sample seeded responses if surfaced before live submissions arrive.
- Warm-start participants should use deterministic `clientKeyHash` values such as `stage-demo-mira`.
- Warm-start can be reset independently by reseeding the session.

## Live Flow

Recommended stage sequence:

1. Run the seed function before the demo.
2. Open instructor dashboard for the returned session slug.
3. Project the QR code or join URL.
4. Participants join with nicknames.
5. Keep visibility private while responses come in.
6. Trigger categorisation once there are enough responses.
7. Release categories or summaries.
8. Invite one or two Fight Me challenges.
9. Trigger synthesis at the end.

## Backend API Contract

Recommended separate function, not mixed into the judge demo seed:

- `api.stageDemo.seedFoodHackathon`

Suggested args:

```ts
{
  resetExisting?: boolean;
  includeWarmStart?: boolean;
  joinCode?: string;
}
```

Suggested return:

```ts
{
  sessionId: Id<"sessions">;
  slug: string;
  joinCode: string;
  joinPath: string;
  instructorPath: string;
  participantCount: number;
  categoryCount: number;
  warmStartIncluded: boolean;
}
```

Recommended companion functions:

- `api.stageDemo.getFoodHackathonSession`
- `api.stageDemo.resetFoodHackathonSession`

Reset safety:

- Reset must be restricted to `best-food-for-a-hackathon-live`.
- Reset requires an explicit confirmation string.
- Reset should delete only that session and its related rows.

## Session Code Strategy

For stage usage, use a memorable five-letter English word.

Reason:

- Avoid conflict with `SPARK`, which should remain reserved for the judge persona demo.
- Avoid accidentally sending judges or participants to the wrong session.

Chosen code:

- `SNACK`

If `SNACK` is unavailable in a future deployment, rerun the seed with another five-letter food-related word such as `BREAD`, `PASTA`, or `MANGO`.

## Implementation Steps

1. Create a separate `convex/stageDemo.ts` seed module.
2. Implement `seedFoodHackathon` to create or reset the live-stage session with `modePreset: "class_discussion"`.
3. Insert preset categories.
4. Optionally insert warm-start participants/responses/feedback when `includeWarmStart` is true.
5. Return join and instructor paths for frontend/homepage buttons or manual operator use.
6. Add reset safety for this specific session.
7. Run codegen and checks.

## Verification

Run:

```bash
pnpm exec convex codegen
pnpm exec convex run stageDemo:seedFoodHackathon -- '{}'
pnpm exec convex run stageDemo:getFoodHackathonSession
pnpm run build
```

Manual checks:

- The generated session appears in the instructor dashboard.
- The returned join code opens the correct participant join page.
- The session starts in `private_until_released`.
- Preset categories are available before responses arrive.
- Real participant submissions appear live in the instructor dashboard.
- Warm-start mode only appears when explicitly requested.

## Acceptance Criteria

- There are two separate demo seeds:
  - Judge persona demo: `teach-anything-university-demo`, join code `SPARK`.
  - Live-stage food demo: `best-food-for-a-hackathon-live`, generated or explicitly supplied join code.
- The food demo creates a real live session suitable for projected QR joining.
- The food demo starts clean by default for real participants.
- Optional warm-start data exists but is opt-in.
- The instructor can run the live demo without manually filling the session creation form.
