# AI planning and validation

Event context includes type, date/time zone, guests, budget and bounded preferences. The user is warned to exclude contact details; the service does not transmit the full guest roster. Context and document text are untrusted data, never instructions or tool authority.

`src/infrastructure/ai/service.ts` builds versioned prompts and shares a total deadline across attempts. The OpenRouter adapter verifies a configured model's capabilities/pricing, requires strict structured output, disables optional reasoning only when supported, denies data collection and disallows provider fallback. The release fixes a free Dots model and enforces zero prompt/completion price on the request; capacity can still throttle or disappear. Gemini uses the same transport/validation contract, but current release evidence records authentication failure rather than successful generation.

Responses pass finish-reason/shape/size, JSON, schema and domain checks. IDs must be unique, task dependencies valid and acyclic, event type consistent and money canonical. Invalid/refused/truncated output is rejected; there is no silent fixture replacement or permissive JSON repair. AI prices and free-text narratives remain suggestions requiring human review, not verified quotations or authoritative arithmetic.

Draft generation records provenance and allowlisted diagnostics separately from accepted planning state. Users edit/select records, then the database authorizes and atomically saves the accepted subset against the expected event version. Failing generation does not apply planning records. Successful production wedding/birthday/community evidence and all rate limits/timeouts are in [the dated verification record](../hackathon/AI_RELEASE_VERIFICATION_2026-10-29.md).

Quotation extraction has separate source-span rules and a genuine component smoke, but its flag remains false. Do not describe it as a fully verified hosted workflow. No paid requests or privacy-policy relaxation are authorized by documentation examples.
