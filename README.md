# TalkTok

TalkTok is a live discussion intelligence platform for classrooms, workshops, and conference Q&A.

It is not a traditional forum or generic chat room. Participants join quickly by QR code or session code, submit one or more ideas, receive private AI feedback, and later see the group discussion synthesized into categories, arguments, and reflection reports.

## Product Direction

TalkTok is designed around live facilitation:

- Participants use a mobile-first flow with acts: `Submit`, `Discover`, `Challenge`, and `Synthesize`.
- Instructors run a command center for category management, live presence, follow-up prompts, synthesis, and AI operations.
- AI supports private feedback, response clustering, category synthesis, recategorization requests, originality analysis, and structured debate.
- `Fight Me` mode lets participants argue against AI or an opposing view in a lightweight 1v1 debate flow.
- Final reports give participants a private reflection on reasoning, originality, responsiveness, and contribution trace.

## Core MVP Scope

- QR/session-code join with nickname identity
- Multiple top-level submissions per participant
- Follow-up replies and emoji reactions
- Private AI feedback after submissions
- Hybrid categorisation using instructor presets and AI-generated categories
- Instructor category controls: rename, merge, split, pin, lock, and follow up
- Category synthesis with expandable quotes and contributor trace
- Presence, typing telemetry, paste/composition signals, and aggregate activity pulse
- Fight Me mode with AI/opposing-view challenges
- End-of-session consolidated summary and personal analysis
- Instructor-side prompt editor, model setup, LLM telemetry, and cost tracking

## Tech Stack

- VitePlus
- React
- TanStack Router
- Convex
- Convex components for rate limiting, presence, work queues, action caching, retries, sharded counters, batch processing, and smart tags
- Phosphor Icons
- Pretext for display-oriented text surfaces

## Development

Install dependencies:

```bash
vp install
```

Start Convex in one terminal:

```bash
npx convex dev
```

Start the frontend in another terminal:

```bash
vp dev
```

Run checks:

```bash
vp check
vp test
```

Build:

```bash
vp build
```

## Convex Setup

The app is wired so it can render before Convex is connected. Running `npx convex dev` creates the development deployment and writes `VITE_CONVEX_URL` into `.env.local`.

Convex AI guidance files are installed in `convex/_generated/ai/`. Before changing Convex backend code, read:

```txt
convex/_generated/ai/guidelines.md
```

## Repository Notes

Planning documents and design handoff files are intentionally kept out of Git in `docs/` for now. The public repository metadata should stay concise and implementation-facing.
