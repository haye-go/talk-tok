# Route Registry

This file is the code-side route contract for engineering and UI handoff.

Routes must use readable words and short codes. Do not expose Convex document IDs in URLs.

| Route                                        | Surface     | Purpose                                               |
| -------------------------------------------- | ----------- | ----------------------------------------------------- |
| `/`                                          | Public      | Entry and foundation preview                          |
| `/join`                                      | Participant | Join-code entry screen                                |
| `/join/:sessionCode`                         | Participant | QR/session-code join flow                             |
| `/session/:sessionSlug`                      | Participant | Main participant session shell                        |
| `/session/:sessionSlug/fight/:fightSlug`     | Participant | Fight Me thread                                       |
| `/session/:sessionSlug/review`               | Participant | End-of-session personal review                        |
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
- Future Convex queries should resolve slugs and codes to internal document IDs.
- UI components should receive data through props and avoid hardcoding route strings.
