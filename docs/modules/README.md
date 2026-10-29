# Feature-module contracts

Use [implementation status](../IMPLEMENTATION_STATUS.md) for the current evidence layer. Flags default off for P1 in a new local template; the owner-approved release enables the tested modules. Enabled UI is not a substitute for database authorization.

| Module                      | Guide                                         | Source entry points                                                                                           |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Core planning and changes   | [Architecture](../ARCHITECTURE.md)            | `src/domain/money.ts`, `tasks.ts`, `replan.ts`; `src/components/planner.tsx`, `planning.tsx`, `resources.tsx` |
| AI generation/acceptance    | [AI and validation](AI.md)                    | `src/domain/ai-contract.ts`; `src/infrastructure/ai/`; transactional draft acceptance                         |
| Event functions             | [Functions](EVENT_FUNCTIONS.md)               | `src/domain/event-functions.ts`; function migration                                                           |
| Guests and RSVP             | [Guests/teams](GUESTS_AND_TEAMS.md)           | `src/domain/guests.ts`; `src/application/guest-http.ts`                                                       |
| Roles and assignments       | [Guests/teams](GUESTS_AND_TEAMS.md)           | `src/domain/teams.ts`; `src/application/team-http.ts`                                                         |
| Finance and private sources | [Finance/documents](FINANCE_AND_DOCUMENTS.md) | `vendor-finance.ts`, `documents.ts`; finance/document HTTP services                                           |
| Workspace/data lifecycle    | [Workspace/data](WORKSPACE_AND_DATA.md)       | `workspace-tools.ts`; dashboard/entitlement/lifecycle migrations                                              |
| Disabled commercial billing | [Billing contract](BILLING.md)                | Private reconciliation foundation; public webhook fails closed                                                |

Payments here mean user-entered financial records, not payment execution. RSVP capabilities do not send invitations. AI document extraction is disabled pending full hosted review acceptance. P2 marketplace, messaging and advanced integrations are roadmap work only.
