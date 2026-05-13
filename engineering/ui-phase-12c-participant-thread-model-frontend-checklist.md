# Participant Thread Model Frontend Checklist

Date: 2026-05-12
Scope: Execution checklist for the frontend implementation of the revised participant threaded message model.

Use this together with:

- `engineering/ui-phase-12-participant-threaded-message-model-plan.md`
- `engineering/ui-phase-12b-participant-threaded-message-execution-plan.md`

## Goal

Restructure the participant-facing workspace so that:

- `Contribute` and `Explore` share one message/thread grammar
- `Contribute` keeps an always-available compact composer
- `Explore` supports `Latest`, `By category`, and `Synthesis`
- replies nest below messages
- one selected question scopes each tab

## Shared Foundation

### Question context

- [ ] Keep one compact question bar visible on every participant tab.
- [ ] Ensure the question bar supports:
  - [ ] current question preview
  - [ ] expand-to-read full prompt
  - [ ] released-question switcher when multiple released questions exist
- [ ] Ensure released-question ordering is consistent:
  - [ ] current question first
  - [ ] remaining released questions newest first
- [ ] Remove repeated full-size question cards from tab bodies unless the state explicitly needs one.
- [ ] Make question surface styling visually distinct from the app header.

### Shared message/thread card

- [ ] Define one shared participant message card model for:
  - [ ] own top-level message
  - [ ] peer top-level message
  - [ ] nested reply
  - [ ] compact collapsed state
  - [ ] expanded state with replies
- [ ] Keep the structural order consistent:
  - [ ] author
  - [ ] timestamp
  - [ ] message body
  - [ ] category badge if visible
  - [ ] compact action/count row
  - [ ] collapsible replies
- [ ] Ensure own-message and peer-message variants differ by emphasis only, not layout model.

### Compact interaction controls

- [ ] Reduce the visual weight of `Reply`.
- [ ] Reduce the visual weight of `Fight`.
- [ ] Reduce the visual weight of upvote/reaction controls.
- [ ] Prefer compact icon-plus-count or small chip controls over full-size CTA buttons inside the feed.
- [ ] Ensure controls remain touch-safe on mobile.

### Nested replies

- [ ] Support collapsed reply count under each message.
- [ ] Support expand/collapse replies inline.
- [ ] Make replies visually nested under the parent message.
- [ ] Keep reply composer behavior smaller and lighter than the top-level `Contribute` composer.

## `Contribute` Tab

### Top area

- [ ] Remove the generic “your contributions” summary card pattern.
- [ ] Add a compact status row near the top.
- [ ] Show only participant-relevant presence metrics:
  - [ ] typing
  - [ ] submitted
- [ ] Do not show `idle` in participant presence UI.

### Composer

- [ ] Keep the top-level composer always visible at the top of `Contribute`.
- [ ] Default it to a collapsed compact height.
- [ ] Expand it on focus.
- [ ] Keep it expanded when text exists.
- [ ] Collapse it again on blur only when empty.
- [ ] Reveal secondary controls only when expanded:
  - [ ] tone selector if still used
  - [ ] word count
  - [ ] submit action

### Message list

- [ ] Replace the “primary contribution plus earlier points” presentation with a message list for the selected question.
- [ ] Order top-level own messages newest first.
- [ ] Render replies nested below their parent message.
- [ ] Show compact metadata directly on the message card.
- [ ] Keep the card visually aligned with `Explore`.

### Own-message actions

- [ ] Keep only compact own-message actions in the default view.
- [ ] Prefer:
  - [ ] `Add follow-up`
  - [ ] `Open insights`
- [ ] Remove heavy default actions such as:
  - [ ] `View in Explore` on every card
  - [ ] `Go to Fight` on every card

### Insights

- [ ] Move AI feedback into an expandable panel per own message.
- [ ] Move category placement detail into the expandable panel.
- [ ] Move re-categorisation request UI into the expandable panel.
- [ ] Do not show analysis-first content expanded by default for the latest message.

## `Explore` Tab

### Top controls

- [ ] Keep the top summary compact.
- [ ] Include only high-value room context:
  - [ ] response count
  - [ ] category count if useful
  - [ ] synthesis available state if released
- [ ] Remove the large participant presence bar from the top of `Explore`.
- [ ] Remove unnecessary stacked support panels before the stream.

### Mode switch

- [ ] Add an explicit view-mode switch:
  - [ ] `Latest`
  - [ ] `By category`
  - [ ] `Synthesis`
- [ ] Make the current mode visually obvious.
- [ ] Preserve participant choice locally.

### `Latest` mode

- [ ] Show top-level peer messages newest first for the selected question.
- [ ] Nest replies directly beneath the relevant parent message.
- [ ] Remove duplicate author presentation outside the card.
- [ ] Keep the room readable before surfacing higher-order synthesis.

### `By category` mode

- [ ] Render category sections as separate containers.
- [ ] Show category name and message count in each section header.
- [ ] Render message threads within each category section.
- [ ] Preserve nested replies under each parent message.

### `Synthesis` mode

- [ ] Show class synthesis only when released.
- [ ] Render category synthesis cards.
- [ ] Each synthesis card should support:
  - [ ] short summary
  - [ ] key points
  - [ ] optional opposing view summary
  - [ ] supporting comment count
- [ ] Collapse long supporting comments behind `View supporting comments`.
- [ ] Do not force synthesis above raw room content in other modes.

### Category filter

- [ ] Keep category filter as a secondary support control.
- [ ] Ensure it behaves appropriately by mode:
  - [ ] narrows feed in `Latest`
  - [ ] jumps to/isolates sections in `By category`
  - [ ] jumps between category cards in `Synthesis`
- [ ] Avoid making category filter the only exploration model.

## `Fight` Tab

- [ ] Keep question context scoped to the selected question.
- [ ] Ensure any message excerpts shown in `Fight` use the same message/thread visual grammar where practical.
- [ ] Keep rules and timing visible before a participant commits to a new fight.
- [ ] Keep the current obligation more prominent than history.

## `Me` Tab

- [ ] Reframe `Me` as archive and reflection, not a second active workbench.
- [ ] Keep the personal report block near the top.
- [ ] Add or preserve question-grouped contribution history.
- [ ] Avoid re-rendering the same active workflow chrome used in `Contribute`.
- [ ] Keep fight history and settings lower in the page hierarchy.

## Desktop Adaptation

- [ ] Keep the same tab logic as mobile.
- [ ] Use extra space for persistent context, not duplication.
- [ ] Let desktop keep more support detail open only when it does not compete with the main task.
- [ ] Avoid reintroducing:
  - [ ] repeated large question cards
  - [ ] duplicated report/history content
  - [ ] oversized action toolbars

## Likely Frontend Files To Touch

- [ ] `src/pages/participant-workspace-page.tsx`
- [ ] `src/components/layout/participant-shell.tsx`
- [ ] `src/components/layout/participant-question-bar.tsx`
- [ ] `src/components/submission/response-composer.tsx`
- [ ] shared thread-card components under `src/components/messages/*` or equivalent
- [ ] `src/components/contribute/contribution-thread-card.tsx`
- [ ] `src/components/stream/stream-tab.tsx`
- [ ] `src/components/stream/response-stream-item.tsx`
- [ ] `src/components/stream/presence-bar.tsx`
- [ ] `src/components/reactions/reaction-bar.tsx`
- [ ] `src/components/myzone/my-zone-tab.tsx`
- [ ] `src/components/fight/*` as needed for visual consistency

## Validation

### Mobile

- [ ] First screenful of `Contribute` clearly answers what the participant should do next.
- [ ] Composer does not waste vertical space while idle.
- [ ] `Explore` reaches room content quickly.
- [ ] Reply/fight/upvote controls no longer dominate the feed.
- [ ] Replies expand inline without disorienting layout jumps.
- [ ] Multiple released questions remain understandable.

### Desktop

- [ ] The product still feels like the same app as mobile.
- [ ] Context is richer without becoming a dashboard of duplicated panels.
- [ ] The selected question remains clear.
- [ ] `Latest`, `By category`, and `Synthesis` remain understandable in larger layouts.

## Done Criteria

- [ ] `Contribute` feels like posting into a threaded discussion, not managing contribution records.
- [ ] `Explore` feels like reading the room, not navigating a toolbar-heavy dashboard.
- [ ] Own messages and peer messages share one coherent visual language.
- [ ] Replies, upvotes, and category context are consistent across tabs.
- [ ] Multiple-question handling is clear and question-scoped rather than mixed.
