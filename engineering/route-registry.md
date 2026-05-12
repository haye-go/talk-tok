# Route Registry

This file is the code-side route contract for engineering and UI handoff.

Routes must use readable words and short codes. Do not expose Convex document IDs in URLs.

| Route                                        | Surface     | Purpose                                               |
| -------------------------------------------- | ----------- | ----------------------------------------------------- |
| `/`                                          | Public      | Entry and foundation preview                          |
| `/join`                                      | Participant | Join-code entry screen                                |
| `/join/:sessionCode`                         | Participant | QR/session-code join flow                             |
| `/session/:sessionSlug`                      | Participant | Shared participant workspace shell                    |
| `/session/:sessionSlug?tab=explore`          | Participant | Shared workspace with tab-addressed learner surface   |
| `/session/:sessionSlug/fight/:fightSlug`     | Participant | Fight thread rendered inside the shared workspace     |
| `/session/:sessionSlug/review`               | Participant | Report detail rendered inside the shared workspace    |
| `/demo/personas`                             | Public      | Demo persona chooser                                  |
| `/instructor`                                | Instructor  | Instructor session dashboard                          |
| `/instructor/session/new`                    | Instructor  | Create/edit session shell                             |
| `/instructor/session/:sessionSlug`           | Instructor  | Live command center                                   |
| `/instructor/session/:sessionSlug/projector` | Projector   | Display-only room/projector mode                      |
| `/instructor/templates`                      | Instructor  | Session templates                                     |
| `/instructor/admin/models`                   | Admin       | Providers and model assignment                        |
| `/instructor/admin/prompts`                  | Admin       | Prompt template editor                                |
| `/instructor/admin/retrieval`                | Admin       | Retrieval/context controls                            |
| `/instructor/admin/protection`               | Admin       | Rate limits, moderation, telemetry, budget guardrails |
| `/instructor/admin/observability`            | Admin       | LLM usage, costs, latency, errors                     |
| `/instructor/admin/demo`                     | Admin       | Demo seed and reset controls                          |

## Implementation Notes

- `src/lib/routes.ts` is the source for route builders.
- `routeRegistry` in `src/lib/routes.ts` should stay aligned with this file.
- Participant tabs are addressed through `?tab=` on `/session/:sessionSlug`, not through separate shell routes.
- `fight/:fightSlug` and `review` are child-route detail states inside the same participant workspace shell.
- Future Convex queries should resolve slugs and codes to internal document IDs.
- UI components should receive data through props and avoid hardcoding route strings.
