# UI Phase 07: Demo Persona Switching & Live-Stage Seed

Covers the frontend work for backend Phase 11C (judge demo persona switching) and Phase 11D (hackathon food live-stage seed).

---

## Context

Two demo modes now exist in the backend:

1. **University Demo** (`teach-anything-university-demo`, code `SPARK`) — pre-seeded with 8 personas, categories, Fight Me debates, synthesis, semantic signals, and personal reports. Judges switch between personas to experience the platform from different viewpoints.

2. **Food Hackathon Live Stage** (`best-food-for-a-hackathon-live`) — a clean session for real live participation via QR code. Optional warm-start seeds 4 sample responses. Separate admin controls via `api.stageDemo.*`.

---

## Backend APIs Available

### Phase 11C (University Demo)

- `api.demo.listDemoPersonas` → `{ session: { id, slug, joinCode, title } | null, personas: [{ nickname, participantSlug, demoClientKey, categorySlug, courseIdea, inputPattern }] }`
- `api.demo.getDemoSession` → `{ id, slug, joinCode, title, phase, currentAct }` or `null`
- `api.demo.seed`, `api.demo.resetSession`, `api.demo.health`, `api.demo.setToggle`, `api.demo.listToggles` (already wired in admin-demo-page)

### Phase 11D (Food Hackathon)

- `api.stageDemo.seedFoodHackathon` → `{ sessionId, slug, joinCode, joinPath, instructorPath, participantCount, categoryCount, warmStartIncluded, reused }`
  - Args: `{ resetExisting?, includeWarmStart?, joinCode? }`
- `api.stageDemo.getFoodHackathonSession` → `{ id, slug, joinCode, title, openingPrompt, phase, currentAct, visibilityMode, participantCount, submissionCount, categoryCount, joinPath, instructorPath }` or `null`
- `api.stageDemo.resetFoodHackathonSession` → `{ sessionSlug, deletedSession, deleted, perTable, capped }`
  - Args: `{ confirmation: "RESET FOOD HACKATHON SESSION", deleteSession? }`

---

## Tasks

### A. Homepage Demo Entry Points

**A1. Restructure homepage with demo section**

- Keep existing "Join discussion" and "Instructor dashboard" CTAs
- Add a new "Demo" section below the hero, only shown when demo session exists
- Query `api.demo.getDemoSession` on the homepage
- If demo session exists, show a card with 3 entry points:
  - **"Try as yourself"** — navigates to `/join/SPARK` (uses the user's own clientKey)
  - **"Explore demo personas"** — navigates to `/demo/personas` (new route, see A2)
  - **"Instructor view"** — navigates to `/instructor/session/teach-anything-university-demo`
- If no demo session, hide the section entirely (no broken links)

**A2. Demo persona picker page** (`/demo/personas`)

- New route and page: `src/pages/demo-personas-page.tsx`
- Queries `api.demo.listDemoPersonas`
- Shows session title and join code at the top
- Grid of 8 persona cards, each showing:
  - Nickname (e.g. "Maya")
  - Course idea excerpt (first ~60 chars of `courseIdea`)
  - Category badge using `categorySlug`
  - "Enter as {nickname}" button
- Clicking a persona card:
  1. Saves the user's original clientKey to `localStorage` as `talktok-original-client-key` (for restoration)
  2. Overwrites `talktok-client-key` with the persona's `demoClientKey` (e.g. `demo-maya`)
  3. Also writes `talktok-participant:{sessionSlug}` with `{ sessionSlug, participantSlug: nickname.toLowerCase(), nickname, savedAt }`
  4. Navigates to `/session/teach-anything-university-demo`
- Include a "Join as yourself" option that preserves the user's real clientKey and goes to `/join/SPARK`

**A3. Demo persona identity bar**

- New component: `src/components/demo/demo-identity-bar.tsx`
- Thin bar at the top of the participant session page, only shown when:
  - Session slug matches `DEMO_SESSION_SLUG` ("teach-anything-university-demo"), AND
  - Current clientKey starts with `"demo-"`
- Shows: "Viewing as **{nickname}**" with a "Switch persona" link back to `/demo/personas` and a "Restore my identity" button
- "Restore my identity" reads `talktok-original-client-key`, writes it back to `talktok-client-key`, removes the stored participant entry, and reloads
- Mount this in `participant-session-page.tsx` at the top when conditions are met

**A4. Client identity helpers for demo switching**

- Add to `src/lib/client-identity.ts`:
  - `setDemoClientKey(demoKey: string)` — saves original key, overwrites with demo key
  - `restoreOriginalClientKey()` — restores saved original key if present
  - `isDemoClientKey()` — returns `true` if current key starts with `"demo-"`
  - `getDemoNickname()` — extracts nickname from `"demo-{name}"` key pattern
- Keep these functions pure (no navigation side effects)

### B. Live-Stage Demo Admin

**B5. Stage Demo card on admin demo page**

- Extend existing `src/pages/admin-demo-page.tsx` with a new Card below the existing cards
- Title: "Live Stage Demo"
- Query `api.stageDemo.getFoodHackathonSession`
- If session exists, show MetricTiles: slug, join code, phase, participants, submissions, categories
- If session exists, show quick-links: "Join path" (copyable URL), "Instructor view" (link)
- Seed button: calls `api.stageDemo.seedFoodHackathon`
- Toggles for seed options:
  - "Include warm-start responses" switch (`includeWarmStart`)
  - Optional join code input (leave blank for auto-generate)
- Show seed result after successful seed: join code, join path, instructor path, participant and category counts, warm-start status
- Reset section: same pattern as existing university demo reset — confirmation input "RESET FOOD HACKATHON SESSION", red border, Warning icon, calls `api.stageDemo.resetFoodHackathonSession`
- Show deletion summary after reset (deleted count, per-table breakdown, capped flag)

**B6. Stage demo route helper**

- Add `instructorAdminStageDemo` route if needed, or reuse the existing `/instructor/admin/demo` page since both demo types share the admin surface
- No new nav entry needed — both university and stage demos live under the existing "Demo" admin nav item

### C. Participant Experience Polish

**C7. Demo-aware stream tab**

- In `stream-tab.tsx`, when session slug is the demo slug and clientKey is a demo key, show a subtle label on each peer card indicating the persona name (derived from the response's participant nickname)
- This helps judges track which persona said what during a walkthrough

**C8. Demo-aware Fight Me tab**

- On the Fight Me tab, when in demo mode, if pre-seeded debates exist, surface them prominently
- Show completed debate pairs (e.g. "Sam vs Rina: Algorithms vs Memes") with view/debrief links
- No backend changes — existing Fight Me components already render debates from real data

**C9. Demo-aware My Zone tab**

- When viewing as a demo persona, My Zone should show that persona's position shifts, personal report, and history
- Existing wiring should already work since the clientKey is switched — verify and adjust if any data is missing

### D. Quality & Safety

**D10. Demo slug gating**

- All persona switching UI (identity bar, persona picker, clientKey override) must be gated behind `DEMO_SESSION_SLUG`
- The persona picker page should show an error/redirect if no demo session is seeded
- Never allow clientKey override for non-demo sessions

**D11. Original key preservation**

- Verify that navigating away from the demo (e.g. going to homepage or joining a different session) doesn't leave the user stuck with a demo clientKey
- The identity bar's "Restore my identity" must always be accessible
- Consider adding a safety check: if `isDemoClientKey()` is true and the user is on a non-demo session, auto-restore

---

## File Changes Summary

| File                                        | Change                                         |
| ------------------------------------------- | ---------------------------------------------- |
| `src/pages/home-page.tsx`                   | Add conditional demo section with 3 CTAs       |
| `src/pages/demo-personas-page.tsx`          | **New** — persona picker grid                  |
| `src/components/demo/demo-identity-bar.tsx` | **New** — top bar for persona switching        |
| `src/lib/client-identity.ts`                | Add demo switching helpers                     |
| `src/lib/routes.ts`                         | Add `demoPersonas` route                       |
| `src/lib/constants.ts`                      | No changes (DEMO_SESSION_SLUG already correct) |
| `src/router.tsx`                            | Add `/demo/personas` route                     |
| `src/pages/admin-demo-page.tsx`             | Add Stage Demo card with seed/reset/status     |
| `src/pages/participant-session-page.tsx`    | Mount DemoIdentityBar conditionally            |
| `src/components/stream/stream-tab.tsx`      | Minor: persona label in demo mode              |

---

## Out of Scope

- Backend changes (separate developer)
- D3/WebGL semantic visualizations (card-based MVP already shipped)
- Auth/login (not in current roadmap)
- Mobile-specific layouts

---

## Acceptance Criteria

1. Homepage shows demo CTAs only when demo session is seeded
2. Persona picker displays all 8 personas with course idea + category
3. Clicking a persona overrides clientKey and enters the session as that persona
4. Identity bar shows current persona and offers switch/restore actions
5. Restoring identity returns the user's original clientKey
6. Stage demo can be seeded/reset from the admin page with warm-start toggle
7. Demo clientKey override is impossible on non-demo sessions
8. No regressions on existing join, session, or instructor flows
