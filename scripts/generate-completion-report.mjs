// Redacted checkpoint report. Never loads environment values or raw test stdout.
// Run only after the named commands have actually executed; this is not a test runner.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const read = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const pkg = read("package.json");
const unit = read(".runtime/unit-results.json");
const native = read(".runtime/native-results.json");
const browser = read(".runtime/browser-results.json");
const publicLive = read(".runtime/live-public-results.json");
const concurrency = read(".runtime/concurrency-summary.json");
const env = read(".runtime/environment-audit.json");
const smoke = read(".runtime/live-provider-smoke.json");
const audit = read(".runtime/production-audit.json");
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
function vitest(r) {
  return {
    tests: r.numTotalTests,
    passed: r.numPassedTests,
    failed: r.numFailedTests,
    skipped: r.numPendingTests,
    durationMs: Math.max(...r.testResults.map((t) => t.endTime)) - r.startTime,
  };
}
function playwright(r) {
  return {
    tests:
      r.stats.expected + r.stats.unexpected + r.stats.skipped + r.stats.flaky,
    passed: r.stats.expected,
    failed: r.stats.unexpected,
    skipped: r.stats.skipped,
    flaky: r.stats.flaky,
    durationMs: r.stats.duration,
  };
}
const tests = [
  {
    category: "Domain, API, AI doubles and embedded PostgreSQL",
    command:
      "npm test -- --reporter=default --reporter=json --outputFile=.runtime/unit-results.json",
    environment:
      "Windows Node24; provider/identity doubles plus PGlite synthetic Auth roles",
    ...vitest(unit),
    status: "PASS",
    evidence: ".runtime/unit-results.json",
    scope:
      "10 domain, 3 time-zone, 5 HTTP, 5 API contract, 33 legacy AI contract, 30 provider, 43 PostgreSQL tests. No live provider calls.",
  },
  {
    category: "Genuine multi-session PostgreSQL",
    command:
      "npm run test:concurrency -- --reporter=default --reporter=json --outputFile=.runtime/native-results.json",
    environment:
      concurrency.version + "; independent TCP sessions, synthetic Auth roles",
    ...vitest(native),
    status: "PASS",
    evidence: ".runtime/native-results.json; .runtime/concurrency-summary.json",
    scope:
      "Actual blocking/competing transactions, locks, rollback, tenant denial, receipt replay, generation cap and already-used RPC migration upgrade. Not hosted Supabase.",
  },
  {
    category: "Offline browser regression",
    command: "npm run test:e2e",
    environment:
      "Chromium; production Next3002 credentials blank; synthetic planner3100",
    ...playwright(browser),
    status: "PASS",
    evidence:
      ".runtime/browser-results.json; playwright-report/; test-results/",
    scope:
      "Five widths320/375/768/1024/1440, 35 planner module scans plus5 landing scans, axe/overflow, keyboard, selective acceptance, manual workflow, outage, replan and refresh using fixtures.",
  },
  {
    category: "Configured read-only public browser",
    command: "npm run test:live:public",
    environment:
      "Chromium; production Next3004 with actual environment; no account or AI calls",
    ...playwright(publicLive),
    status: "PASS",
    evidence: ".runtime/live-public-results.json",
    scope:
      "Health200, public landing, anonymous protected route and unauthorized event write401. Not a signed Auth or persistence test.",
  },
  {
    category: "Initial genuine provider smokes",
    command: "npm run test:providers:smoke",
    environment:
      "Real direct Gemini and OpenRouter, synthetic birthday20guests",
    tests: 2,
    passed: 0,
    failed: 2,
    skipped: 0,
    durationMs: null,
    status: "FAILED",
    evidence:
      ".runtime/live-provider-smoke.json (latest per provider); this report preserves attempt history",
    scope:
      "Gemini authorization failure ~190ms. Initial OpenRouter router-catalogue handling rejected absent concrete router record; code corrected and regression-tested.",
  },
  {
    category: "OpenRouter after router-catalogue correction",
    command: "npm run test:providers:smoke -- -t openrouter",
    environment: "Real OpenRouter; bounded synthetic request",
    tests: 2,
    passed: 0,
    failed: 1,
    skipped: 1,
    durationMs: null,
    status: "FAILED",
    evidence:
      ".runtime/live-provider-smoke.json (latest overwrites previous OpenRouter run)",
    scope:
      "Planning deadline20.018s. Gemini filtered out; not passing. Shared allocation policy then corrected to give healthy primary full remaining time.",
  },
  {
    category: "Final OpenRouter bounded retest",
    command: "npm run test:providers:smoke -- -t openrouter",
    environment: "Real OpenRouter; corrected shared deadline",
    tests: 2,
    passed: 0,
    failed: 1,
    skipped: 1,
    durationMs: null,
    status: "FAILED",
    evidence: ".runtime/live-provider-smoke.json",
    scope:
      "Planning timeout; latest measured latency " +
      smoke.openrouter.latencyMs +
      "ms. No validated payload/model/tokens. Stop unchanged retries. Future smoke config sets zero retries/no fallback.",
  },
  ...[
    ["Hosted Auth/database/provider integration", "npm run test:live"],
    ["Authenticated real browser journey", "npm run test:e2e:live"],
    ["24-case live evaluation", "npm run test:ai:live"],
  ].map(([category, command]) => ({
    category,
    command,
    environment: "Actual ignored environment; preflight only",
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: null,
    status: "BLOCKED",
    evidence: "scripts/preflight-live.mjs; docs/FOUNDER_ACTIONS_REQUIRED.md",
    scope:
      "Nonzero preflight exit; no tests, provider call or remote mutation executed. Missing staging accounts/confirmation or matching successful smoke/evaluation budget.",
  })),
  {
    category: "Fresh install",
    command: "npm ci",
    environment: "Windows Node24.16.0 npm11.9.0; final updated lockfile",
    tests: null,
    passed: null,
    failed: null,
    skipped: null,
    durationMs: null,
    status: "PASS",
    evidence: "package-lock.json; execution log",
    scope:
      "506 packages installed; exact locked dependencies; no missing production install dependency.",
  },
  ...[
    ["Formatter", "npm run format:check"],
    ["ESLint", "npm run lint"],
    ["TypeScript", "npm run typecheck"],
    ["Production build", "npm run build"],
    ["Client secret exposure", "npm run security:client"],
    ["OpenAPI generation", "npm run api:generate"],
    ["Database type generation", "npm run db:types"],
  ].map(([category, command]) => ({
    category,
    command,
    environment: "Windows Node24.16.0",
    tests: null,
    passed: null,
    failed: null,
    skipped: null,
    durationMs: null,
    status: "PASS",
    evidence:
      category === "Database type generation"
        ? "src/generated/database.types.ts"
        : category === "OpenAPI generation"
          ? "docs/api/openapi.yaml"
          : "execution log",
    scope:
      category === "Production build"
        ? "Actual optimized Next.js webpack build, TypeScript, static/server routes"
        : category === "Client secret exposure"
          ? "Actual configured private values plus sentinel/provider patterns absent from .next/static"
          : "Command completed successfully; no assertion count claimed.",
  })),
  {
    category: "Production dependency advisories",
    command: "npm audit --omit=dev --json",
    environment:
      "npm registry; network-enabled execution after sandbox DNS denial",
    tests: null,
    passed: null,
    failed: null,
    skipped: null,
    durationMs: null,
    status: audit.metadata?.vulnerabilities?.total === 0 ? "PASS" : "FAILED",
    evidence: ".runtime/production-audit.json",
    scope: JSON.stringify(audit.metadata?.vulnerabilities),
  },
];
const features = [
  [
    "FR-001",
    "Registration/login/logout/recovery and protected sessions",
    [
      "app/auth/actions/route.ts",
      "app/auth/callback/route.ts",
      "proxy.ts",
      "src/infrastructure/supabase/server.ts",
    ],
    "Supabase Auth users/sessions",
    "/auth/actions; /auth/callback; /api/v1/me",
    "src/components/auth-form.tsx",
    "tests/contract/api.test.ts; tests/live-public/guard.spec.ts; tests/live-e2e/journey.spec.ts",
    "Controlled/anonymous guards PASS; actual signed cookie lifecycle BLOCKED",
    "EXT-03/04: real login, confirmation/recovery/refresh not verified",
  ],
  [
    "FR-002",
    "Personal owner workspace",
    [
      "app/onboarding/page.tsx",
      "src/application/repository.ts",
      "supabase/migrations/20261026142503_p0_core.sql",
    ],
    "workspaces/workspace_members; private.provision + owner RLS",
    "POST /api/v1/workspaces/personal",
    "onboarding and planner navigation",
    "tests/integration/database.test.ts; tests/concurrency/transactions.native.ts",
    "SQL idempotency/ownership and independent tenants PASS",
    "EXT-03/04: hosted provisioning not verified",
  ],
  [
    "FR-003",
    "Create all three event types",
    [
      "src/domain/contracts.ts",
      "src/components/planner.tsx",
      "app/api/v1/[...segments]/route.ts",
    ],
    "events; guarded create command",
    "POST /api/v1/events",
    "EventWizard",
    "tests/integration/database.test.ts; tests/e2e/planner-ui.spec.ts",
    "All types/date persistence SQL PASS; synthetic wizard PASS",
    "EXT-03/04: real account journey",
  ],
  [
    "FR-004",
    "List/detail/edit persistent events",
    [
      "src/components/planner.tsx",
      "src/application/repository.ts",
      "app/api/v1/[...segments]/route.ts",
    ],
    "events.version, row locks, RLS",
    "GET events; GET/PATCH events/:id",
    "Events/Overview/Event settings",
    "tests/contract/api.test.ts; tests/integration/database.test.ts; tests/concurrency/transactions.native.ts",
    "Persistence, strict DTOs, version races and tenant denial PASS",
    "EXT-03/04: target PostgREST not verified",
  ],
  [
    "FR-005",
    "Real Gemini structured draft and personalized ideas",
    [
      "src/infrastructure/ai/gemini-provider.ts",
      "src/infrastructure/ai/service.ts",
      "src/domain/ai-contract.ts",
      "src/infrastructure/gemini.ts",
    ],
    "ai_usage_records/ai_drafts; reserve/complete/save commands",
    "POST events/:id/plan-generations; Google Gemini API",
    "src/components/planning.tsx AiPage",
    "tests/ai/adapter.test.ts; tests/ai/providers.test.ts; tests/live-smoke/providers.live.ts",
    "63 AI-double tests PASS; genuine Gemini FAILED authorization",
    "EXT-01/06: live valid generation/usefulness not verified",
  ],
  [
    "FR-006",
    "Review/edit/select and atomically accept draft",
    [
      "src/components/planning.tsx",
      "src/domain/ai-contract.ts",
      "supabase/migrations/20261026142503_p0_core.sql",
    ],
    "ai_drafts; budget_items/tasks/task_dependencies/vendor_requirements; receipts",
    "POST events/:id/plan-acceptances",
    "DraftReview",
    "tests/integration/database.test.ts; tests/e2e/planner-ui.spec.ts; tests/concurrency/transactions.native.ts",
    "Selected insertion, price/title edits, DAG/receipt race PASS",
    "EXT-01/02/03/04: genuine generated draft browser acceptance",
  ],
  [
    "FR-007",
    "Exact estimated budgets, pricing bases and overrun",
    [
      "src/domain/money.ts",
      "src/components/resources.tsx",
      "supabase/migrations/20261026142503_p0_core.sql",
    ],
    "budget_items; money/FK/check constraints; events.budget_minor",
    "budget-items CRUD and budget summary",
    "BudgetPage",
    "tests/unit/domain.test.ts; tests/integration/database.test.ts; tests/concurrency/transactions.native.ts",
    "Golden INR values, overflow, exact totals and locks PASS",
    "Hosted persistence unverified; no actual P1 payment/commitment claims",
  ],
  [
    "FR-008",
    "Manual vendor checklist with category/status/deadline/estimate",
    ["src/components/resources.tsx", "src/domain/contracts.ts"],
    "vendor_requirements; owner RLS and guarded put/delete",
    "vendor-requirements CRUD",
    "VendorsPage",
    "tests/integration/database.test.ts; tests/e2e/planner-ui.spec.ts",
    "SQL isolation/grants and synthetic manual UI PASS",
    "No verified supplier availability, booking or price integration",
  ],
  [
    "FR-009",
    "Tasks/status/priority/deadlines and dependency timeline",
    [
      "src/domain/tasks.ts",
      "src/domain/dates.ts",
      "src/components/resources.tsx",
    ],
    "tasks/task_dependencies; assert_dag and same-event FK",
    "tasks CRUD",
    "TasksPage/TimelinePage",
    "tests/unit/domain.test.ts; tests/unit/dates.test.ts; tests/integration/database.test.ts; tests/e2e/planner-ui.spec.ts",
    "DAG cycles, FK swaps, deadline/time-zone rules and UI PASS",
    "Hosted persistence not verified; agency assignments remain P1",
  ],
  [
    "FR-010",
    "Non-mutating deterministic replan preview",
    [
      "src/domain/replan.ts",
      "src/components/planning.tsx",
      "supabase/migrations/20261026180040_combined_change_financial_bounds.sql",
    ],
    "replan_proposals; current authorized snapshot/version",
    "POST events/:id/replan-proposals",
    "ReplanPage diff/warnings",
    "tests/unit/domain.test.ts; tests/integration/database.test.ts",
    "Combined guest/price final bounds, exact delta and nonmutation PASS",
    "Venue capacity unknown is an explicit unresolved warning, never fabricated",
  ],
  [
    "FR-011",
    "Approval/staleness/locks/idempotency and reversal",
    [
      "src/domain/replan.ts",
      "supabase/migrations/20261026142503_p0_core.sql",
      "src/components/planning.tsx",
    ],
    "event/proposal row locks; audit_events/idempotency_receipts; exact transaction",
    "proposal approvals/rejections",
    "Proposal review explicit selection/approval",
    "tests/integration/database.test.ts; tests/concurrency/transactions.native.ts",
    "Actual competing commits/replay, rollback and stale row-lock waits PASS",
    "EXT-03/04: target platform integration; reversal is fresh reviewed proposal",
  ],
  [
    "FR-012",
    "Audit history",
    [
      "src/components/planner.tsx",
      "src/application/repository.ts",
      "supabase/migrations/20261026142503_p0_core.sql",
    ],
    "audit_events owner read-only; transaction-coupled audit",
    "GET event history",
    "History with pagination",
    "tests/integration/database.test.ts; tests/concurrency/transactions.native.ts",
    "Denied direct writes and one audit/version per committed mutation PASS",
    "Retention/purge/backup recovery needs operator policy",
  ],
  [
    "FR-013",
    "Responsive accessible dashboard/modules/account UI",
    [
      "app/globals.css",
      "src/components/planner.tsx",
      "src/components/planning.tsx",
      "src/components/resources.tsx",
      "src/components/ui.tsx",
    ],
    "authorized event snapshots and /me",
    "P0 routes from Section36",
    "Overview/create/budget/tasks/timeline/vendors/planning/review/settings",
    "tests/e2e/planner-ui.spec.ts; tests/e2e/public.spec.ts",
    "14 browser tests PASS at five widths; axe/overflow and keyboard",
    "Fixture tests do not replace real authenticated journey/manual screen-reader review",
  ],
  [
    "FR-014",
    "Failure recovery and manual planning during AI outage",
    [
      "src/infrastructure/ai/service.ts",
      "src/infrastructure/ai/types.ts",
      "src/infrastructure/supabase/fetch.ts",
      "src/components/ui.tsx",
    ],
    "quota/active-generation lease; receipts; atomic mutations",
    "safe API envelopes and bounded provider calls",
    "ErrorNotice/loading/cancel/retry controls",
    "tests/ai/adapter.test.ts; tests/ai/providers.test.ts; tests/unit/http.test.ts; tests/e2e/planner-ui.spec.ts",
    "Timeout/cancel/output rejection, no automatic mock, uncertain-key replay and synthetic outage PASS",
    "Actual provider success and DB/network recovery still need staging verification",
  ],
  [
    "USR-OR-001",
    "OpenRouter unified provider/fallback/provenance",
    [
      "src/infrastructure/ai/openrouter-provider.ts",
      "src/infrastructure/ai/service.ts",
      "src/infrastructure/config.ts",
      "supabase/migrations/20261026165848_ai_provider_provenance.sql",
    ],
    "safe draft/usage provider fields; workspace active lease",
    "OpenRouter models/chat completions; shared plan API",
    "Provider disclosure in planning/settings, actual-model draft header",
    "tests/ai/providers.test.ts; tests/integration/database.test.ts; tests/concurrency/transactions.native.ts; tests/live-smoke/providers.live.ts",
    "HTTP double success/errors/capability/provenance/fallback and SQL metadata PASS; genuine plan timeout",
    "EXT-02/06: no live actual model or valid output",
  ],
];
const featureRows = features.map(
  ([id, name, files, database, api, ui, testFiles, outcome, issue]) => ({
    requirementId: id,
    name,
    implementationFiles: files,
    databaseDependencies: database,
    apiDependencies: api,
    uiComponents: ui,
    testFiles: testFiles.split("; "),
    testOutcome: outcome,
    status: "IMPLEMENTED",
    releaseEligible: false,
    remainingIssue: issue,
  }),
);
const blockers = [
  [
    "EXT-01",
    "Gemini authorization failure",
    "Live smoke AI_AUTHENTICATION_FAILED; about190ms",
    "Genuine direct Gemini planning",
    "External authorization/model-access dependency",
    "One bounded direct synthetic smoke; no unchanged repeated requests",
    "Verify configured Google project/API/key/model access/quota securely",
    "Run one filtered Gemini smoke after external change",
  ],
  [
    "EXT-02",
    "OpenRouter planning deadline exceeded",
    "Latest smoke AI_UNAVAILABLE category timeout; " +
      smoke.openrouter.latencyMs +
      "ms",
    "Genuine routed structured planning",
    "External routing/latency/access, actual cause not proven",
    "Catalogue router omission fixed/tested; two bounded actual planning retests still timed out",
    "Approve a privacy-compatible structured-output model/access/deadline policy; inspect account",
    "Run one filtered OpenRouter smoke after configuration change",
  ],
  [
    "EXT-03",
    "Configured Supabase management access denied",
    "Connected management get_project denied; read-only settings200 and anonymous schema401",
    "Hosted schema/Auth/PostgREST/RLS/persistence",
    "External project designation/permissions",
    "Compared project identity safely; unrelated inactive project untouched; publishable read-only probes only",
    "Designate and grant access to isolated UtsavOS staging; inspect then apply migrations",
    "Identify project and inspect migration history before any mutation",
  ],
  [
    "EXT-04",
    "Synthetic signed sessions absent",
    "Live preflight lists both synthetic users and LIVE_STAGING_CONFIRMED",
    "Real Auth/session/full persistent browser journey",
    "External confirmed staging accounts",
    "Preflight executed and blocked with zero tests; live suites prepared",
    "Confirm two isolated staging identities and callback/recovery settings in ignored environment",
    "Run test:live then test:e2e:live after matching model smoke",
  ],
  [
    "EXT-05",
    "Local Supabase runtime absent",
    "Earlier supabase start DockerLifecycleInspectError; Docker/Podman absent",
    "Platform pgTAP/GoTrue/PostgREST parity",
    "External local/CI runtime",
    "Native PostgreSQL17.10 races now PASS independently; platform CI committed not executed",
    "Provide Docker-capable local stack or execute platform CI",
    "Run local start/reset --local/test db on disposable stack",
  ],
  [
    "EXT-06",
    "Live evaluation success gate not reached",
    "No validated provider payload; corpus preflight budget/smoke blocked",
    "24-case useful/factual AI reliability acceptance",
    "External provider access and explicit request budget",
    "Synthetic contract corpus passed; real corpus deliberately not attempted",
    "Successful provider smoke, approved24 requests/provider, human output review",
    "Set LIVE_AI_PROVIDER and allowed budget then run corpus per provider",
  ],
  [
    "EXT-07",
    "No designated/verified hosting release target",
    "No deployment ID or live application URL exists",
    "Staging/public release and operations",
    "External hosting/region/operator decisions",
    "Native production build and local public guard verified; no cloud publication",
    "Assign correct staging project, secrets, origin, Auth allowlists and operational owners",
    "Deploy designated staging only after remaining P0 gates; verify actual journey",
  ],
].map(
  ([id, failure, evidence, capability, type, attempts, resolution, next]) => ({
    id,
    exactFailure: failure,
    evidence,
    affectedCapability: capability,
    type,
    actionsAttempted: attempts,
    requiredResolution: resolution,
    nextExecutableStep: next,
  }),
);
const changes = [
  [
    "ADR-018",
    "Only initial canonical environment names; original25s/one-retry policy",
    "Safe documented aliases; shared1–45s deadline/default20s; max3 shared attempts",
    "Use supplied configuration without secret exposure and preserve bounded latency",
    [
      "src/infrastructure/config.ts",
      "proxy.ts",
      "src/infrastructure/supabase/fetch.ts",
      "src/components/ui.tsx",
    ],
    "Nonempty alias conflicts fail; SDK retries off; no browser secret",
  ],
  [
    "ADR-019",
    "Gemini-only generation",
    "Direct Gemini plus OpenRouter, shared validation/explicit fallback and safe provenance",
    "Explicit new user P0 release requirement",
    [
      "src/infrastructure/ai/",
      "src/infrastructure/gemini.ts",
      "src/components/planning.tsx",
      "supabase/migrations/20261026165848_ai_provider_provenance.sql",
    ],
    "Legacy wrapper/rows preserved; new nullable metadata; pooled public RPC rebound; private core revoked",
  ],
  [
    "ADR-020",
    "PGlite-only local transaction proof; independent concurrency blocked",
    "Native PostgreSQL17.10 loopback independent sessions in dev tests",
    "Verify real locks/races without unavailable Docker",
    [
      "tests/concurrency/transactions.native.ts",
      "vitest.concurrency.config.ts",
      "package-lock.json",
    ],
    "Development dependency only; no runtime DB change or auth bypass",
  ],
  [
    "ADR-021",
    "Separate live suites but insufficient launch/artifact guards",
    "Explicit staging/account/smoke/budget preflight; isolated ports/artifact directories",
    "Avoid unintended mutation/cost and cross-run trace deletion",
    [
      "scripts/preflight-live.mjs",
      "playwright.config.ts",
      "playwright.live.config.ts",
      "playwright.public-live.config.ts",
      "vitest.ai-live.config.ts",
    ],
    "Blocked preflight remains nonzero; no passing skips; actual production auth stays enforced",
  ],
  [
    "ADR-022",
    "SQL cap checked guest subtotal before simultaneous price changes",
    "Exact numeric intermediate; final cap after all changes",
    "Valid combined proposals must match domain arithmetic",
    [
      "supabase/migrations/20261026180040_combined_change_financial_bounds.sql",
      "tests/integration/database.test.ts",
    ],
    "Baseline migration immutable; stored bigint/HTTP strings unchanged; authorization/receipt/audit core preserved",
  ],
].map(([adr, original, revised, reason, files, compatibility]) => ({
  adr,
  originalDecision: original,
  revisedDecision: revised,
  reason,
  files,
  compatibilityImpact: compatibility,
}));
const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  releaseClassification: "P0 IMPLEMENTED BUT RELEASE BLOCKED",
  A_executive_summary: {
    verdict: "P0 IMPLEMENTED BUT RELEASE BLOCKED",
    milestone: "7 — Verification/release IN PROGRESS; external gates BLOCKED",
    completed: [
      "Preserved existing P0; added Gemini/OpenRouter service and safe environment aliases",
      "Exact financial combined-change bug fixed in forward migration",
      "Real native multi-session concurrency and controlled provider/security regressions",
      "Live provider attempts, read-only platform probes and configured public guard verification",
      "Release/continuation documentation without credentials",
    ],
    notClaimed: [
      "No successful live AI draft, signed target Supabase journey or deployment",
      "No live usefulness success rate or actual returned-model/token/cost observation",
      "No P1/P2 implementation or commercial readiness",
    ],
  },
  B_repository_audit: {
    workspace: process.cwd(),
    architecturePath: "DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md",
    architectureSha256: hash("DEEP_TECHNICAL_ARCHITECTURE_UTSAVOS_V2.md"),
    architectureInspection:
      "Complete V2 sections1–49 and appendices inspected; unchanged. No applicable AGENTS.md found.",
    initialState:
      "Existing implemented modular-monolith P0, initially untracked/unborn master; preserved rather than rebuilt",
    branch: git("branch", "--show-current"),
    baselineCheckpoint: "dbe84fe",
    checkpointNote:
      "Safe existing-P0 checkpoint predates new provider changes. This report describes the implementation working tree; subsequent Git checkpoint may include it. No remote push.",
    gitHeadAtReport: git("rev-parse", "HEAD"),
    remoteConfigured: !!git("remote"),
    unrelatedFiles:
      "Original architecture and user image preserved; image intentionally untracked.",
    runtime: { node: process.version, npm: "11.9.0" },
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
    lockfileSha256: hash("package-lock.json"),
    boundaries: [
      "Presentation: app and src/components",
      "Application: src/application",
      "Domain: src/domain independent of React/providers",
      "Persistence/security: Supabase owner RLS and guarded transactional RPC",
      "AI: src/infrastructure/ai; no tools/SQL mutations",
      "Observability: safe request IDs/outcome/latency/provenance, no prompts",
    ],
  },
  C_environment_diagnostic: {
    note: "Only names/presence/basic syntax/source/override metadata; valid format is not service authorization. No values, lengths, fragments or hashes of secrets.",
    ...env,
    normalization:
      "Duplicate AI_PROVIDER_MODE and AI_PROVIDER_MAX_RETRIES declarations removed preserving effective final values; duplicates now empty. Existing secrets unchanged and ignored.",
    compatibility:
      "SUPABASE_* aliases and GEMINI_MODEL_DEFAULT work; OPENROUTER_MODEL_DEFAULT works; conflicting aliases fail. VITE_AUTH_PROVIDER unused. Service-role key present but not used by ordinary app or probes.",
  },
  D_feature_implementation_matrix: featureRows,
  E_gemini_integration: {
    adapter: "src/infrastructure/ai/gemini-provider.ts",
    compatibilityWrapper: "src/infrastructure/gemini.ts",
    requestedModel: smoke.gemini.requestedModel,
    actualVerifiedModel: null,
    liveOutcome: smoke.gemini,
    structuredOutput:
      "Google SDK JSON schema plus Zod and semantic/domain validation; controlled tests pass; no successful live structured output",
    semanticEvaluation:
      "24 synthetic contract cases plus adversarial cases pass with doubles; real usefulness/hallucination review NOT RUN",
    timeoutRetry:
      "Shared default20s/max45s; retries0–2 at application layer, SDK attempts1. Authentication/refusal/invalid output do not retry/reroute. Final configured primary is Gemini; fallback defaults none.",
    usageObservations: {
      actualModel: null,
      inputTokens: null,
      outputTokens: null,
      reportedCost: null,
    },
    limitations:
      "Authorization failure does not establish whether key, project entitlement, model permission or quota setup is responsible. Must resolve and obtain real valid output.",
  },
  F_openrouter_integration: {
    adapter: "src/infrastructure/ai/openrouter-provider.ts",
    sdk: "openai7.44.0 with fixed official OpenRouter baseURL",
    requestedModel: smoke.openrouter.requestedModel,
    actualVerifiedModel: null,
    liveOutcome: smoke.openrouter,
    structuredCompatibility:
      "Catalogue structured_outputs required. Documented free router omission handled with free compatible candidate check; strict JSON schema and require_parameters enabled. Provider fallbacks disabled/data_collection deny.",
    errors:
      "HTTP-double cases for401/403/402/404/429/503, capability, no content, malformed/refusal/tools, timeout/cancellation; shared schema/domain rejection PASS",
    fallback:
      "Controlled explicitly enabled Gemini→OpenRouter success, ineligible errors do not reroute, bounded exhaustion/cancellation/deadline tests PASS. No actual cross-provider fallback success claimed.",
    usageObservations: {
      actualModel: null,
      inputTokens: null,
      outputTokens: null,
      reportedCost: null,
    },
    limitations:
      "Free router remains non-deterministic model/latency; actual structured planning exceeded deadline. Catalogue compatibility is not proof of a live successful completion.",
  },
  G_supabase: {
    correctProjectIdentified: false,
    management:
      "Configured project management lookup denied permission. Unrelated inactive LoadGuard3D untouched.",
    readOnlyProbes: {
      authSettingsStatus: 200,
      anonymousRestSchemaStatus: 401,
      interpretation:
        "Only reachability/endpoint request outcome; no Auth/session/RLS/schema claim",
    },
    migrations: {
      local:
        "All3 applied fresh in PGlite and native PostgreSQL; pooled-entry upgrade verified",
      targetHosted: "UNKNOWN / NOT APPLIED BY THIS SESSION",
      files: [
        "20261026142503_p0_core.sql",
        "20261026165848_ai_provider_provenance.sql",
        "20261026180040_combined_change_financial_bounds.sql",
      ],
    },
    authentication:
      "Production anonymous guard PASS; genuine registration/login/refresh/recovery/logout lifecycle BLOCKED",
    workspaceProvisioning:
      "Synthetic SQL idempotent owner provisioning PASS; signed target platform BLOCKED",
    isolation:
      "Synthetic usersA/B RLS negative read/write/RPC and concurrent owner/attacker tests PASS; target PostgREST/JWT BLOCKED",
    concurrency,
    platformRequirements:
      "Management identity/access, two confirmed staging accounts, migrations/grants inspection, actual GoTrue/PostgREST/pgTAP, deployed integration",
  },
  H_test_report: tests,
  I_security: {
    checks: [
      "Owner RLS across all tenant tables; direct writes/helper execution denied",
      "Cross-event FK and task-DAG checks; row locks/versions/transaction rollback",
      "Exact money/bounds; stale/duplicate approvals and idempotency conflicts",
      "Strict request DTO, Origin, bounded body, session guards",
      "Provider JSON/schema/semantic validation, injection fixtures, no tool/SQL execution",
      "Actual configured private values/patterns absent from client output; environment ignored",
      "Production npm advisories0; no authorization/lint/test bypass",
    ],
    fixes: [
      "Rejected privileged Supabase key aliases and conflicting environment settings",
      "Bounded Supabase/AI/UI I/O and explicit cancellation",
      "Explicit fallback policy/provider disclosure and safe provenance",
      "Active workspace AI reservation serialization",
      "Final-state exact financial bounds; pooled RPC migration compatibility",
      "Separated browser artifact directories after trace deletion collision",
    ],
    secretExposureAssessment:
      "No intentional secret output or client exposure observed in executed checks. Raw .env and live account files remain ignored. No raw provider error/prompt logging. Scanner is limited, not a full secret/security audit.",
    remainingRisks: [
      "Target Auth/JWT/PostgREST/grants unverified",
      "Real model usefulness and unsupported factual output unverified",
      "No load/p95, backup restore, penetration/compliance or retention guarantee",
      "Manual screen-reader/device review not completed",
    ],
    productionBlockingFindings:
      "External live Auth/platform/provider gates unverified; release NO-GO. No unresolved critical domain/SQL defect observed in executed tests.",
  },
  J_deployment: {
    localDevelopment:
      "Existing Next app runs; isolated test servers verified and stopped by harness",
    productionBuild: "PASS — actual optimized Next16.4.3 webpack build",
    hosting:
      "Native Next Vercel-compatible Node24; route60s; exact APP_BASE_URL, secure secrets, Auth allowlists, private schema unexposed",
    staging: "NOT DEPLOYED",
    public: "NOT DEPLOYED",
    liveUrl: null,
    health:
      "Local production /api/health/live200 and unauthenticated guards PASS; no hosted health",
    externalActions:
      "EXT-01 through EXT-07; docs/DEPLOYMENT.md and docs/FOUNDER_ACTIONS_REQUIRED.md",
  },
  K_stage_status: {
    P0: "IMPLEMENTED BUT RELEASE BLOCKED; mandatory real provider/platform/Auth/end-to-end gates not satisfied",
    P1: "NOT STARTED; FR-015–021 commercial beta gated by P0",
    P2: "NOT STARTED; advanced operations/integrations/marketplace gated; no unsupported integrations attempted",
  },
  L_remaining_blockers: blockers,
  M_architecture_changes: changes,
  N_continuation_packet: {
    state:
      "Baseline checkpointdbe84fe preserved; current source includes unified AI, three migrations, native tests, isolated browsers and safe live preflight. Default checks pass; failed provider attempts and unknown target platform block release.",
    inspectFirst: [
      "docs/FOUNDER_ACTIONS_REQUIRED.md",
      "docs/IMPLEMENTATION_STATUS.md",
      "docs/TEST_REPORT.md",
      "docs/DEPLOYMENT.md",
      "src/infrastructure/config.ts",
      "src/infrastructure/ai/service.ts",
      "supabase/migrations/",
      "tests/live-smoke/",
      "tests/live/",
      "tests/live-e2e/",
    ],
    nextTasks: [
      "Resolve external provider/model access without printing secrets; one filtered smoke per changed provider",
      "Identify isolated Supabase staging using authorized management access; inspect then migrate, never remote reset",
      "Configure two confirmed synthetic users; run platform/actual Auth/persistence/tenant tests",
      "Evaluate24 live cases/provider with allowed budget and human review",
      "Run real authenticated browser journey and deployed staging verification",
      "Only after full P0 gate passes begin AppendixF P1",
    ],
    nextCommands: [
      "npm run test:providers:smoke -- -t gemini",
      "npm run test:providers:smoke -- -t openrouter",
      "npm run test:live",
      "npm run test:ai:live",
      "npm run build",
      "npm run test:e2e:live",
    ],
    risks:
      "Do not confuse fixture/native layers with hosted proof, rerun unchanged costly failures, mutate unrelated projects, expose service-role keys, use remote reset, or label P0 release verified prematurely.",
    newSession:
      "Read this packet and status, inspect git status without resetting, preserve ignored secrets and unrelated image, verify changed external state first. Reuse current checkout. Run only relevant checks after changes; regenerate reports from actual evidence.",
  },
  O_final_verdict: {
    classification: "P0 IMPLEMENTED BUT RELEASE BLOCKED",
    P1: "NOT STARTED",
    P2: "NOT STARTED",
    deployment: "NOT DEPLOYED / EXTERNAL BLOCKER",
    liveGemini: "GENUINELY ATTEMPTED — FAILED AUTHORIZATION",
    liveOpenRouter: "GENUINELY ATTEMPTED — NO VALIDATED PLAN; TIMEOUT",
    liveSupabase:
      "READ-ONLY REACHABILITY ATTEMPTED; PROJECT IDENTITY/AUTH/PERSISTENCE UNVERIFIED",
    releaseEligible: false,
  },
};
const esc = (x) =>
  String(x ?? "not measured")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
function render(value, depth = 0) {
  if (Array.isArray(value))
    return value
      .map((v) => (typeof v === "object" ? render(v, depth) : `- ${v}`))
      .join("\n");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => {
        const label = k
          .replaceAll("_", " ")
          .replace(/([a-z])([A-Z])/g, "$1 $2");
        return typeof v === "object" && v !== null
          ? `\n${"#".repeat(Math.min(4, 3 + depth))} ${label}\n\n${render(v, depth + 1)}\n`
          : `- **${label}:** ${v ?? "not observed / not available"}`;
      })
      .join("\n");
  return String(value ?? "not observed");
}
const titles = [
  "A. Executive summary",
  "B. Repository audit",
  "C. Environment diagnostic",
  "D. Feature implementation matrix",
  "E. Gemini integration",
  "F. OpenRouter integration",
  "G. Supabase report",
  "H. Test report",
  "I. Security report",
  "J. Deployment report",
  "K. P0/P1/P2 status",
  "L. Remaining blockers",
  "M. Architecture changes",
  "N. Work continuation packet",
  "O. Final verdict",
];
const sections = Object.entries(report).filter(([k]) => /^[A-O]_/.test(k));
let md = `# UtsavOS completion and production-readiness report\n\nGenerated ${report.generatedAtUtc}. **P0 IMPLEMENTED BUT RELEASE BLOCKED.** This is an evidence checkpoint, not a release certificate. No credentials or recoverable secret fragments are included.\n`;
for (let i = 0; i < sections.length; i++) {
  const [key, value] = sections[i];
  md += `\n## ${titles[i]}\n\n`;
  if (key.startsWith("C_")) {
    md += `${value.note}\n\n| Variable | Present | Nonempty | Basic format | Source | Other source files |\n| --- | --- | --- | --- | --- | --- |\n`;
    md += value.variables
      .map(
        (v) =>
          `| ${v.name} | ${v.present} | ${v.nonempty} | ${v.format} | ${v.source ?? "none"} | ${v.overriddenIn.join(", ") || "none"} |`,
      )
      .join("\n");
    md += `\n\n${value.normalization}\n\n${value.compatibility}\n\nProject safety: ${value.projectSafety}.\n`;
  } else if (key.startsWith("D_")) {
    md +=
      "Every row is IMPLEMENTED at source level and NOT release eligible until applicable external gates pass. Named PASS results apply only to the tested layer. No P1/P2 feature was attempted.\n\n";
    for (const f of value)
      md += `### ${f.requirementId} — ${f.name}\n\n- Files: ${f.implementationFiles.map((p) => `[${p}](../${p})`).join(", ")}\n- Database: ${f.databaseDependencies}\n- API: ${f.apiDependencies}\n- UI: ${f.uiComponents}\n- Tests: ${f.testFiles.join(", ")}\n- Outcome: ${f.testOutcome}\n- Status: ${f.status}; release eligible: false\n- Remaining: ${f.remainingIssue}\n\n`;
  } else if (key.startsWith("H_")) {
    md +=
      "| Category | Status | Tests | Passed | Failed | Skipped | Duration ms |\n| --- | --- | --- | --- | --- | --- | --- |\n";
    md += value
      .map(
        (t) =>
          `| ${esc(t.category)} | ${t.status} | ${esc(t.tests)} | ${esc(t.passed)} | ${esc(t.failed)} | ${esc(t.skipped)} | ${esc(t.durationMs)} |`,
      )
      .join("\n");
    for (const t of value)
      md += `\n\n### ${t.category}\n\nCommand: \`${t.command}\`. Environment: ${t.environment}.\n\n${t.scope}\n\nEvidence: ${t.evidence}.`;
  } else md += render(value);
  md += "\n";
}
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/CODEX_COMPLETION_REPORT.json",
  JSON.stringify(report, null, 2) + "\n",
);
writeFileSync("docs/CODEX_COMPLETION_REPORT.md", md);
writeFileSync(
  "docs/evidence/verification.json",
  JSON.stringify(
    {
      generatedAtUtc: report.generatedAtUtc,
      baseline: "dbe84fe",
      unit: vitest(unit),
      native: vitest(native),
      browser: playwright(browser),
      configuredPublicBrowser: playwright(publicLive),
      concurrency,
      liveProviderOutcomes: smoke,
      environmentDiagnostic: env,
      productionAudit: audit.metadata?.vulnerabilities,
      architectureSha256: report.B_repository_audit.architectureSha256,
      lockfileSha256: report.B_repository_audit.lockfileSha256,
      releaseEligible: false,
    },
    null,
    2,
  ) + "\n",
);
const table =
  "| Requirement | Files | Tested evidence / remaining |\n| --- | --- | --- |\n" +
  featureRows
    .map(
      (f) =>
        `| ${f.requirementId}: ${f.name} | ${f.implementationFiles.join(", ")} | ${f.testOutcome}; ${f.remainingIssue} |`,
    )
    .join("\n");
writeFileSync(
  "docs/IMPLEMENTATION_STATUS.md",
  `# Implementation status\n\n2026-10-26. Milestone7: **IN PROGRESS; external release gates BLOCKED**. P0: **IMPLEMENTED BUT RELEASE BLOCKED**. P1/P2: **NOT STARTED**, gated. Architecture V2 unchanged; complete source audit done; original image preserved. Safe pre-provider checkpoint: dbe84fe. Inspect Git history/status for subsequent implementation checkpoint.\n\n${table}\n\nVERIFIED means only the named layer: ${unit.numPassedTests} default tests, ${native.numPassedTests} native independent-session tests, ${browser.stats.expected} offline browser tests and ${publicLive.stats.expected} read-only configured public test. Actual Auth/JWT/PostgREST, successful model outputs, full real browser journey, corpus usefulness and deployment remain unverified. Build/lint/types/client secret scan pass. Production audit reports0 vulnerabilities.\n\n## Implemented changes\n\n- Safe configuration aliases, ignored credential handling, exact duplicate normalization, bounded Supabase/UI I/O.\n- Direct Gemini plus OpenRouter, shared strict validation/deadline/cancel/retry/fallback, disclosure and safe actual-model/usage metadata.\n- Forward migrations for provenance/active generation cap and combined guest/price final-state arithmetic.\n- Native PostgreSQL TCP races, migration upgrade, provider failure tests and five-width responsive/axe checks.\n- Live preflight, provider-specific cost-bounded corpus and isolated browser servers/artifacts.\n\n## Known defects / limitations\n\nNo unresolved critical domain/SQL defect observed in executed checks. Target platform authorization and model usefulness remain unknown. No production-ready or paid-beta verdict. Native test roles are synthetic; fixture UI is labeled. No load/restore/manual screen-reader guarantee. A process killed during generation leaves its60-second lease to expire.\n\nResolved regressions: final combined financial subtotal cap, free-router catalogue omission, primary deadline allocation, client provider-info reload, pooled SQL wrapper upgrade, concurrent browser trace artifact collision. Earlier sandbox denied native loopback/build writes/npm DNS; allowed reruns passed without disabling checks.\n\n## External blockers and next executable tasks\n\n${blockers.map((b) => `- **${b.id}:** ${b.exactFailure}. Next: ${b.nextExecutableStep}.`).join("\n")}\n\nSee [completion report](CODEX_COMPLETION_REPORT.md) for requirement-to-file/API/DB/UI/test mapping, [test report](TEST_REPORT.md), [external actions](FOUNDER_ACTIONS_REQUIRED.md), [decisions](DECISIONS.md) ADR-018–022 and [deployment](DEPLOYMENT.md). Never mutate an unidentified/unrelated project or re-run unchanged costly provider failures.\n`,
);
writeFileSync(
  "docs/TEST_REPORT.md",
  `# Test report\n\n2026-10-26. Windows, Node24.16.0, npm11.9.0. Source checkpoint baseline dbe84fe plus documented implementation changes. Exact lockfile retained. Synthetic seed/corpusv1. Real credentials were used only for bounded synthetic provider smokes and read-only target/public checks; no customer data or remote mutation.\n\n| Category | Command | Result | Scope |\n| --- | --- | --- | --- |\n${tests.map((t) => `| ${esc(t.category)} | \`${t.command}\` | ${t.status}${t.tests !== null ? `: ${t.passed}/${t.tests} passed, ${t.failed} failed, ${t.skipped} skipped` : ""} | ${esc(t.scope)} |`).join("\n")}\n\n## Verification boundaries\n\nDefault Vitest: ${JSON.stringify(vitest(unit))}. PGlite executes actual PostgreSQL migrations/RLS/grants, transactions and exact money against synthetic roles; it does not verify GoTrue or signed JWTs. AI/API tests inject doubles and do not represent live generation.\n\nNative PostgreSQL: ${JSON.stringify(vitest(native))}; ${concurrency.version}. Independent TCP sessions race event writes, duplicate approvals, stale proposal blocked row locks, budget locks, draft insertion, tenant denial and workspace AI leases. Pooled RPC used before migration resolves the new wrapper afterward. All three migrations execute; core direct execution remains revoked.\n\nOffline browser: ${JSON.stringify(playwright(browser))}; five widths320/375/768/1024/1440, seven planner modules each (35 scans) plus5 public layouts. Axe WCAG A/AA/2.1AA, no horizontal overflow, dialog focus/Escape, fixture manual planning/AI outage/selective acceptance/proposal approval/refresh. These do not prove real database/Auth/AI integration. Configured public browser: ${JSON.stringify(playwright(publicLive))}; read-only health and anonymous guards only.\n\nActual Gemini failed authorization; actual OpenRouter timed out with no validated result. Requested models and safe latency/category evidence are in [verification.json](evidence/verification.json). Actual model/tokens/cost unknown. Initial router-catalogue code defect was fixed/tested; two planning retests still hit deadline. No further unchanged retries. The24-case real evaluation did not run; no95% model success target claimed.\n\n## Failures diagnosed and corrected\n\n- Guest-adjusted SQL intermediate subtotal could exceed cap before a simultaneous price reduction: forward migration computes exact numeric intermediate and enforces final cap. Regression preview and approval both yield2paise for1×9e12→2×1.\n- OpenRouter free router may be absent from concrete model list: support documented router only when compatible free candidates exist and enforce structured parameters. No compatibility success claim from catalogue alone.\n- Dividing primary time across potential retries shortened healthy calls: full remaining primary deadline unless explicit fallback reserves time. Tests verify total deadline and eligible fallback.\n- Public SQL function could retain old private core resolution after rename: explicitly recreate invoker wrapper and verify on a previously used native connection.\n- Browser trace ENOENT after simultaneous suites shared output directory: separate artifact directories, same14 tests rerun PASS. No test disabled.\n- New test initially passed wrong money helper arguments and migration-upgrade test omitted required base version: corrected tests, rerun129+11 PASS.\n- Sandbox denied loopback EACCES, generated build directory EPERM and npm DNS: reran these authorized checks with proper permissions; native/build/audit passed. Failed attempts are not claimed as passes.\n\n## Remaining gates\n\nActual target project identity/migrations, signed Auth/session/recovery, PostgREST/RLS/pgTAP, genuine valid Gemini and OpenRouter outputs,24-case usefulness review, real authenticated end-to-end journey and deployed staging remain BLOCKED. Three live commands exit nonzero at preflight with0 tests, no remote mutation/cost. Local container runtime absent. Remote CI not executed. No load/p95, backup restore/RPO/RTO, manual screen-reader or compliance assessment claimed. P1/P2 not started.\n\nIgnored raw reports: .runtime/unit-results.json, native-results.json, concurrency-summary.json, browser-results.json, live-public-results.json, live-provider-smoke.json, production-audit.json. Durable redacted evidence: [verification.json](evidence/verification.json), [full JSON report](CODEX_COMPLETION_REPORT.json). Screenshots in docs/screenshots and browser reports are synthetic UI evidence only.\n\n**P0 release: NO-GO.** Next steps: [external actions](FOUNDER_ACTIONS_REQUIRED.md), [deployment](DEPLOYMENT.md).\n`,
);
console.log(
  `Redacted reports written: ${unit.numPassedTests} regression, ${native.numPassedTests} native, ${browser.stats.expected} browser, ${publicLive.stats.expected} public; release remains BLOCKED.`,
);
