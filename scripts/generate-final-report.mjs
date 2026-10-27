// Builds a redacted checkpoint from executed evidence. Does not execute tests or load secrets.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const read = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const unit = read(".runtime/final-unit-results.json"),
  native = read(".runtime/final-native-results.json"),
  browser = read(".runtime/browser-results.json"),
  publicCheck = read(".runtime/live-public-results.json");
const diagnostic = read(".runtime/provider-diagnostic.json"),
  smoke = read(".runtime/live-provider-smoke.json"),
  concurrency = read(".runtime/concurrency-summary.json");
const previous = read("docs/CODEX_COMPLETION_REPORT.json");
if (
  !unit.success ||
  !native.success ||
  unit.numFailedTestSuites ||
  native.numFailedTestSuites ||
  unit.numPendingTests ||
  native.numPendingTests ||
  [browser, publicCheck].some(
    (r) =>
      r.stats.unexpected ||
      r.stats.skipped ||
      r.stats.flaky ||
      !r.stats.expected,
  )
)
  throw new Error(
    "Verification artifacts contain failures, skips or incomplete results; refusing a passing checkpoint report.",
  );
const vt = (r) => ({
  tests: r.numTotalTests,
  passed: r.numPassedTests,
  failed: r.numFailedTests,
  skipped: r.numPendingTests,
  durationMs: Math.max(...r.testResults.map((t) => t.endTime)) - r.startTime,
});
const pw = (r) => ({
  tests:
    r.stats.expected + r.stats.unexpected + r.stats.skipped + r.stats.flaky,
  passed: r.stats.expected,
  failed: r.stats.unexpected,
  skipped: r.stats.skipped,
  flaky: r.stats.flaky,
  durationMs: r.stats.duration,
});
const blocks = [
  {
    id: "EXT-01",
    service: "Gemini",
    original: "Generation AI_AUTHENTICATION_FAILED",
    rootCause:
      "Authentication-level failure confirmed by configured-model GET HTTP401; exact credential/project restriction not disclosed",
    diagnostics:
      "One read-only model metadata request,389ms; official v1beta endpoint and header checked; no model substitution or repeated generation",
    changes:
      "Safe diagnostic categories and whitelisted reason parser; separate401/403 and DNS/TLS/network handling",
    verification: "BLOCKED — no valid live draft; metadata401",
    requiredAccess:
      "Authorized Google key/project/API access to selected model",
    action:
      "In Google AI Studio/API key and Cloud API credentials settings verify the configured key belongs to the intended project and its API restrictions permit Generative Language. Verify API enabled/model entitlement/quota; securely replace configuration only if needed. Never paste the key in chat.",
    prerequisite: "Authorized Google account/project owner access",
    risk: "Credential handling; no purchase authorized",
    autonomous:
      "Read-only diagnosis complete; cannot grant absent external authorization",
    command:
      "npm run test:providers:smoke -- -t gemini (once after external change)",
    status: "BLOCKED",
  },
  {
    id: "EXT-02",
    service: "OpenRouter",
    original: "Free router exceeded20s without a valid draft",
    rootCause:
      "Key accepted200; compatible free catalogue exists. Fixed free-model completion404/no permitted endpoint under current policy; exact exclusion not established",
    diagnostics:
      "Read-only key200/393ms and catalogue200/785ms;6 free structured candidates. One liquid/lfm-2.5-2.6b:free smoke failed ~1.23s; one nvidia/nemotron-3.5-super-vl:free smoke failed ~1.37s. Both one attempt,45s deadline, no fallback/data-collection relaxation",
    changes:
      "Process overrides now win over env files; unavailable model distinguished from no approved routing endpoint; routing errors never retry/reroute",
    verification:
      "BLOCKED — no actual model, validated payload or usage returned",
    requiredAccess:
      "Account-permitted structured-output route compatible with retained privacy policy",
    action:
      "In OpenRouter model endpoints, account privacy and key/provider restrictions identify a permitted structured-output endpoint with data_collection=deny. Preserve privacy; select an approved fixed route. If no free compatible route exists, account owner must decide access/budget; do not purchase or silently enable training.",
    prerequisite:
      "Approved route/account policy and explicit spend allowance for any paid model",
    risk: "Third-party routing and potential inference cost",
    autonomous:
      "Free metadata/two bounded tests completed; no further unchanged retries or paid calls",
    command:
      "Set both model aliases consistently in secure environment, then npm run test:providers:smoke -- -t openrouter",
    status: "BLOCKED",
  },
  {
    id: "EXT-03",
    service: "Supabase",
    original: "Configured management project lookup denied",
    rootCause:
      "Connected Supabase principal lacks access to configured project; isolated UtsavOS staging designation unverified",
    diagnostics:
      "Current list shows only unrelated inactive LoadGuard3D; configured get_project still denies permission. Historical Auth settings200/REST schema401 are reachability only",
    changes:
      "Four migrations verified locally; no remote write or service-role bypass",
    verification:
      "BLOCKED — target identity, migration history and PostgREST unverified",
    requiredAccess:
      "Correct isolated UtsavOS staging project and management membership",
    action:
      "In the intended Supabase organization invite/authorize the connected account, or securely configure the actual designated staging URL/publishable key. Reconnect the correct account. Inspect project identity, migration history and grants; dry-run then apply four reviewed migrations through history. Never remote-reset.",
    prerequisite: "Project owner designation and management access",
    risk: "Database integrity; cloud mutations forbidden until identity verified",
    autonomous:
      "Local migration verification complete; remote changes cannot proceed",
    command:
      "Authorized management get_project and migration history; local db:types; then reviewed staging migration dry-run",
    status: "BLOCKED",
  },
  {
    id: "EXT-04",
    service: "Supabase Auth",
    original: "No confirmed synthetic staging account pair",
    rootCause:
      ".env.live.local absent; staging confirmation and both account credentials missing",
    diagnostics:
      "Current live test and browser preflights execute0 tests and exit nonzero; production anonymous guard verified separately",
    changes:
      "Live environment precedence fixed; actual login/refresh/recovery/tenant checks remain prepared, not bypassed",
    verification:
      "BLOCKED — no signed target session or authenticated real journey",
    requiredAccess:
      "Two confirmed synthetic accounts in verified isolated project",
    action:
      "After EXT-03, create/confirm two dedicated synthetic users. Configure LIVE_USER_A_EMAIL/PASSWORD, LIVE_USER_B_EMAIL/PASSWORD and LIVE_STAGING_CONFIRMED=true in ignored .env.live.local. Configure exact localhost:3005 and staged callback/recovery origins, email confirmation and SMTP. Do not use customer identities.",
    prerequisite:
      "Verified staging schema/Auth settings and successful selected-model smoke for browser",
    risk: "Account credentials and synthetic staging records",
    autonomous: "No account provisioning until project identity verified",
    command:
      "npm run test:live; npm run test:e2e:live; manually verify signup/confirmation/recovery/refresh/expiry",
    status: "BLOCKED",
  },
  {
    id: "EXT-05",
    service: "Local Supabase/CI",
    original: "DockerLifecycleInspectError; Docker/Podman absent",
    rootCause:
      "Neither CLI on PATH nor known installed executable paths available; no operational local container stack",
    diagnostics:
      "Current PATH/common-path checks negative; no repeated doomed Supabase startup.13 native independent TCP tests pass",
    changes:
      "Preserved platform CI and native tests, added P0/P1 shared-version races",
    verification: "BLOCKED — GoTrue/PostgREST/pgTAP parity unverified",
    requiredAccess: "Docker-capable local machine or repository CI",
    action:
      "Provide an operational supported container runtime or run committed supabase-platform CI job in an authorized repository. There is currently no Git remote, so this checkout cannot dispatch its CI autonomously.",
    prerequisite: "Disposable LOCAL stack or designated repository/CI access",
    risk: "Local reset must never target linked/customer data",
    autonomous:
      "Native verification done; runtime installation/remote CI unavailable",
    command:
      "npx supabase start; npx supabase db reset --local; npx supabase test db (LOCAL ONLY)",
    status: "BLOCKED",
  },
  {
    id: "EXT-06",
    service: "AI evaluation",
    original: "24-case real-model corpus not executed",
    rootCause:
      "No provider smoke succeeds; no approved24-request budget configured",
    diagnostics:
      "Corpus preflight blocks with0 cases; synthetic contracts and adversarial doubles pass",
    changes:
      "Separate provider evidence records and validation-stage diagnostics",
    verification: "BLOCKED — no model reliability/usefulness metrics",
    requiredAccess: "Successful smoke and approved request budget per provider",
    action:
      "Resolve each provider, set LIVE_AI_PROVIDER and LIVE_EVAL_REQUEST_BUDGET>=24 in ignored environment, run separately. Review actual outputs for cultural/task usefulness, conflicting actions, vendor/capacity claims, financial correctness, time zones and observed usage. Schema checks do not replace judgment.",
    prerequisite: "EXT-01/02 resolved plus explicitly permitted quota/budget",
    risk: "Provider charges/quota and privacy; synthetic inputs only",
    autonomous: "No corpus calls while smoke/budget gate fails",
    command: "npm run test:ai:live (one provider at a time)",
    status: "BLOCKED",
  },
  {
    id: "EXT-07",
    service: "Vercel/deployment",
    original: "No designated verified staging deployment",
    rootCause:
      "No .vercel link or Git remote; authorized personal and available team project search returns no UtsavOS target",
    diagnostics:
      "Vercel account/team discovery and scoped utsav project searches empty; no unrelated target accessed",
    changes:
      "Production build/secret scan and local public guard pass; deployment runbook includes fourth migration/P1 preview flag",
    verification:
      "BLOCKED — no deployment ID, public URL, hosted health or callbacks",
    requiredAccess:
      "Designated authorized UtsavOS staging target and correct service configuration",
    action:
      "Designate/link the actual UtsavOS Vercel-compatible staging project/team and environment; assign region/operator, configure secrets, exact APP_BASE_URL and Auth callbacks. Deploy only that target after critical service gates. Verify real health/login/persistence/tenant/proposal journeys. No plan change or domain purchase.",
    prerequisite:
      "Correct hosting target and verified Supabase/provider settings",
    risk: "Publication and potential hosting cost; no unrelated projects",
    autonomous:
      "Local build complete; no target can be safely selected or deployed",
    command:
      "Target-specific reviewed deployment, inspect logs/health; run deployed authenticated journey",
    status: "BLOCKED",
  },
];
const commands = [
  {
    command:
      "npm test -- --reporter=default --reporter=json --outputFile=.runtime/final-unit-results.json",
    environment:
      "Local Node24.16.0; domain/HTTP/provider doubles and PGlite Auth stubs",
    ...vt(unit),
    result: "PASS",
    evidence: ".runtime/final-unit-results.json",
  },
  {
    command:
      "npm run test:concurrency -- --reporter=default --reporter=json --outputFile=.runtime/final-native-results.json",
    environment:
      concurrency.version +
      "; loopback independent TCP sessions with synthetic Auth roles",
    ...vt(native),
    result: "PASS",
    evidence:
      ".runtime/final-native-results.json; .runtime/concurrency-summary.json",
  },
  {
    command: "npm run test:e2e",
    environment:
      "Chromium; real production public pages plus visibly synthetic planner/function harness",
    ...pw(browser),
    result: "PASS",
    evidence: ".runtime/browser-results.json; playwright-report; test-results",
  },
  {
    command: "npm run test:live:public",
    environment:
      "Production Next3004 with actual configuration; anonymous/read-only",
    ...pw(publicCheck),
    result: "PASS",
    evidence: ".runtime/live-public-results.json",
  },
  {
    command: "node scripts/diagnose-providers.mjs",
    environment:
      "Real read-only provider metadata; per-request10s deadline; no retry/fallback/generation",
    tests: null,
    passed: null,
    failed: null,
    skipped: null,
    result: "DIAGNOSTIC: Gemini401; OpenRouter key/catalogue200",
    evidence: "docs/evidence/final-verification.json",
  },
  {
    command: "npm run test:providers:smoke -- -t openrouter",
    environment:
      "Real liquid/lfm-2.5-2.6b:free; explicit shell aliases;45s deadline; zero retries/fallback; privacy deny",
    tests: 2,
    passed: 0,
    failed: 1,
    skipped: 1,
    result:
      "FAILED — AI_MODEL_UNAVAILABLE before improved route classifier; ~1229ms",
    evidence:
      "This report retains first fixed-model attempt; latest smoke record overwritten by next model",
  },
  {
    command: "npm run test:providers:smoke -- -t openrouter",
    environment:
      "Real nvidia/nemotron-3.5-super-vl:free; same bounds/privacy, improved classification",
    tests: 2,
    passed: 0,
    failed: 1,
    skipped: 1,
    result: "FAILED — AI_ROUTE_UNAVAILABLE; ~1367ms",
    evidence:
      ".runtime/live-provider-smoke.json; docs/evidence/openrouter-evaluation.json",
  },
  ...["npm run test:live", "npm run test:e2e:live", "npm run test:ai:live"].map(
    (command) => ({
      command,
      environment: "Real-config preflight only",
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      result: "BLOCKED, nonzero; no test/provider call/remote mutation",
      evidence: "scripts/preflight-live.mjs and external register",
    }),
  ),
  ...[
    "npm run lint",
    "npm run typecheck",
    "npm run format:check",
    "npm run api:generate",
    "npm run db:types",
    "npm run build",
    "npm run security:client",
  ].map((command) => ({
    command,
    environment: "Windows Node24.16.0; actual source/build",
    tests: null,
    passed: null,
    failed: null,
    skipped: null,
    result: "PASS",
    evidence: command.includes("api:generate")
      ? "docs/api/openapi.yaml (24 paths)"
      : command.includes("db:types")
        ? "src/generated/database.types.ts"
        : "Executed command output; safe evidence checkpoint",
  })),
];
const p0 = previous.D_feature_implementation_matrix.map((f) => ({
  ...f,
  status: "IMPLEMENTED / TESTED LOCALLY; STAGING BLOCKED",
  testOutcome:
    "Current P0 regression/SQL/native/browser checks pass at their stated layers; actual Auth/platform/provider gates remain blocked",
  releaseEligible: false,
}));
const p1 = [
  {
    id: "FR-015",
    feature: "Multiple functions, independent schedules and resource links",
    status: "IMPLEMENTED / TESTED LOCALLY; PREVIEW OFF BY DEFAULT",
    files: [
      "src/domain/event-functions.ts",
      "src/components/event-functions.tsx",
      "app/api/v1/[...segments]/route.ts",
      "supabase/migrations/20261026183745_p1_event_functions.sql",
      "docs/modules/EVENT_FUNCTIONS.md",
    ],
    tests: [
      "tests/integration/event-functions.test.ts (10)",
      "tests/concurrency/transactions.native.ts (2 P1 races)",
      "tests/contract/api.test.ts (gate/schema case)",
      "tests/e2e/functions.spec.ts (6)",
    ],
    remaining:
      "Hosted Auth/RLS/PostgREST and real browser verification; commercial eligibility not claimed",
  },
  ...[
    ["FR-016", "Guest/household management and scoped RSVP invitations"],
    ["FR-017", "Professional teams, roles, delegation and collaboration"],
    [
      "FR-018",
      "Vendor quotations, confirmed commitments, deposits and actual payment records",
    ],
    [
      "FR-019",
      "Private quote upload and AI extraction with confidence/source spans",
    ],
    [
      "FR-020",
      "Subscription billing, entitlements, commercial usage limits and professional dashboard",
    ],
    ["FR-021", "Structured export, correction/deletion and recovery lifecycle"],
    ["APP-F-08", "Basic event-day task coordination"],
  ].map(([id, feature]) => ({
    id,
    feature,
    status: "NOT STARTED",
    files: [],
    tests: [],
    remaining:
      "Independent implementation remains; explicit permission/domain/API/UI/test contract required before exposure. External storage/billing/sends and business policies need authorized service access as applicable.",
  })),
];
const p2 = [
  "Advanced event-day operations/dashboard",
  "Contingency planning and constraint simulation",
  "Scheduled notifications/WhatsApp integrations",
  "Supplier listings/marketplace integrations",
  "Advanced usage analytics/event intelligence",
  "Native mobile application (conditional on proven need)",
].map((feature) => ({
  feature,
  status: feature.includes("mobile")
    ? "DEFERRED — V2 conditional"
    : "NOT STARTED",
  files: [],
  tests: [],
  remaining:
    "No implementation or integration claim. Define explicit acceptance contract; preserve financial/authorization invariants; obtain external credentials/agreements when applicable.",
}));
const r = {
  schemaVersion: 1,
  clientDate: "2026-10-27",
  timeZone: "Asia/Calcutta",
  generatedAtUtc: new Date().toISOString(),
  A_executive_verdict: {
    implementation:
      "P0 implementation locally verified; P1 FR-015 implemented as isolated preview; full product incomplete",
    releaseEligible: false,
    gates: {
      A: "P0 CODE COMPLETE / TESTED LOCALLY (not real-service acceptance)",
      B: "STAGING BLOCKED",
      C: "PUBLIC PRODUCTION NOT READY",
    },
    majorWork: [
      "Read-only provider root-cause diagnostics and safer failure classifications",
      "Fixed live test environment precedence to honor shell/secret-manager overrides",
      "Two actual fixed free-model tests without weakening privacy",
      "Complete owner-scoped P1 functions with schema/API/UI/audit/receipt/version/FK controls",
      "Extended local SQL/native/browser security, accessibility and concurrency checks",
    ],
    remaining:
      "EXT-01–07 persist with new evidence. Remaining P1/P2 implementation and production operations are not complete.",
  },
  B_git_history: {
    startingCommit: "15be61c",
    verifiedImplementationCommit: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    changedImplementationFiles: git(
      "diff",
      "--name-only",
      "15be61c",
      "HEAD",
    ).split("\n"),
    documentationCommit:
      "Commit containing this report: git log -1 --format=%H -- docs/CODEX_FINAL_COMPLETION_REPORT.json",
    uncommittedAtSourceCheckpoint:
      "Only original unrelated user image; report package added afterward and committed separately",
    remoteConfigured: !!git("remote"),
    pushed: false,
    historyRewritten: false,
    secretFilesCommitted: false,
  },
  C_blocker_resolution: blocks,
  D_gemini_evidence: {
    requestedModel: diagnostic.gemini.requestedModel,
    actualModel: null,
    currentModelMetadata: diagnostic.gemini,
    genuinePlanning:
      "Historical direct generation failed authentication; no unchanged generation repeated this session",
    structuredValidity: null,
    inputTokens: null,
    outputTokens: null,
    cost: null,
    evaluation: {
      casesRun: 0,
      automatedLiveMetrics: null,
      humanReview: "NOT RUN",
    },
    remaining:
      "HTTP401 authentication blocks model-access proof; exact credential restriction not disclosed. Do not change model to hide auth failure.",
  },
  E_openrouter_evidence: {
    requestedModels: [
      "openrouter/free (historical)",
      "liquid/lfm-2.5-2.6b:free",
      "nvidia/nemotron-3.5-super-vl:free",
    ],
    actualRoutedModel: null,
    metadata: diagnostic.openrouter,
    latestGenuineSmoke: smoke.openrouter,
    structuredValidity: null,
    inputTokens: null,
    outputTokens: null,
    cost: null,
    fallback:
      "None in live tests; policy/authorization/TLS/routing/validation failures cannot automatically reroute. Eligible fallback tested only with controlled doubles.",
    remaining:
      "Key and capability metadata work, but no permitted tested completion route. Privacy retained. No live model usefulness result.",
  },
  F_supabase_evidence: {
    confirmedProjectIdentity: false,
    currentManagement:
      "Permission denied again; only unrelated inactive LoadGuard3D visible and untouched",
    migrationInventory: [
      "20261026142503_p0_core.sql",
      "20261026165848_ai_provider_provenance.sql",
      "20261026180040_combined_change_financial_bounds.sql",
      "20261026183745_p1_event_functions.sql",
    ],
    migrationHistoryHosted: "NOT INSPECTED — unauthorized",
    remoteAppliedChanges: [],
    localMigrationResult: "All4 executed in PGlite/native PostgreSQL",
    authentication:
      "Anonymous guards pass; actual signup/login/logout/refresh/recovery BLOCKED",
    realTargetPersistence: "UNVERIFIED",
    RLS: "Synthetic A/B policies, denied direct writes, RPCs/FKs verified locally; target JWT/PostgREST BLOCKED",
    hostedConcurrency: "NOT RUN",
    nativeConcurrency: concurrency,
  },
  G_frontend_evidence: {
    routes: [
      "/",
      "/login",
      "/reset-password",
      "protected /app",
      "onboarding/create/events overview",
      "event budget/tasks/timeline/vendors/AI draft/replan/approval/history",
      "settings (source inspected)",
      "P1 event functions preview",
    ],
    scope:
      "Actual production public/anonymous checks plus synthetic HTTP planner/function harness; no real signed-account journey",
    interactions: [
      "P0 create/manual budget/task/vendor/outage/replan/refresh",
      "AI edited selective acceptance payload",
      "P1 create/edit/resource assignment/refresh/unassign/archive",
      "Dialog keyboard/Escape/focus restoration",
    ],
    widths: [320, 375, 768, 1024, 1440],
    accessibility:
      "axe WCAG2A/AA/2.1AA and overflow assertions pass; function editor also scanned at all5 widths. Manual screen-reader/device review not performed.",
    defectFixed:
      "Resource checkbox reverted while save pending; added explicit pending selection, busy status, rollback on failed save and retained original assertions",
    knownLimits:
      "P1 staging preview off by default; settings/Auth real-data lifecycle unverified",
  },
  H_automated_testing: {
    commands,
    regressions: [
      "New SQL JSON operator precedence error fixed with explicit parentheses; all SQL cases pass",
      "Node contract import extension fixed for API generator",
      "Generated RPC argument Json type mismatch fixed without casts/security bypass",
      "P1 pending-checkbox browser defect fixed; original20-test suite then passes",
    ],
    historicalOnly:
      "Previous npm ci/audit0 and129/11/14 results remain historical; no dependency changes or fresh install required this session",
  },
  I_security_assessment: {
    authorization:
      "Authenticated owner checks independently in every P1 SQL entry; anonymous/nonmember denied; no auth bypass",
    isolation:
      "Composite workspace/event/function FKs plus resource event filters and owner RLS; tenant B denied in tests",
    transactionalFinance:
      "Shared event lock/version; P1 cannot alter monetary/deadline/vendor facts. Locked resources reject linking. Native P0/P1 race and same-key duplicate receipt tests pass; golden financial regressions retained.",
    secrets:
      "Ignored actual environment never displayed/committed; safe diagnostics whitelist fields; staged and client-known-secret scans pass; no raw provider errors persisted",
    validation:
      "Strict Zod DTO/domain schema and DB checks; bounded payloads; exact Origin/idempotency; AI JSON/schema/semantic/size stages reject without reroute",
    risks: [
      "Target GoTrue/JWT/PostgREST/grants unverified",
      "No real valid model output or usefulness evaluation",
      "No load/penetration/compliance/restore/manual screen-reader certification",
      "Full P1/P2 and operational privacy/retention processes incomplete",
    ],
  },
  J_deployment: {
    target:
      "No designated UtsavOS target accessible; available account/team searches empty",
    deploymentId: null,
    url: null,
    status: "NOT DEPLOYED",
    health:
      "Local production public health200 and anonymous401/redirect verified; no hosted health",
    logs: "Local build/API safe logs only",
    callbacks:
      "Target Auth confirmation/recovery/refresh unverified; required allowlists in action register",
    environment:
      "No .vercel link or Git remote; actual environment remains ignored. FEATURE_EVENT_FUNCTIONS defaults false.",
    rollback:
      "Disable preview flag to withdraw P1 UI/API exposure. Preserve additive schema/history. Revert code via new commit or known deployment; forward-fix financial DB state, never remote-reset/drop referenced data.",
    remaining: "EXT-03/04/07 and production ownership/backups/monitoring",
  },
  K_P0_completion: p0,
  L_P1_completion: p1,
  M_P2_completion: p2,
  N_commercial_readiness: {
    actualOnboarding: "Code implemented; genuine account journey not verified",
    professionalWorkflows:
      "Functions locally tested; agency/guest/role/finance/subscription flows incomplete",
    privacyRetention:
      "Data minimization/disclosure and no provider privacy relaxation; operator policy, jurisdiction, deletion/export/retention process unresolved",
    support:
      "No assigned support/incident owner or break-glass operation verified",
    AIUsage:
      "Database20/workspace/day,5s burst and60s active lease; bounded retries/deadlines. Provider usage/cost parsing implemented, no actual completion usage observed.",
    billing: "NOT IMPLEMENTED; no plan/purchase or revenue readiness",
    costMonitoring:
      "Safe usage metadata foundation only; no verified actual-cost dashboard or commercial margin",
    customerLimitations:
      "No booking, vendor availability, payment execution, notification delivery or privacy/compliance promise; cannot onboard paying users as production-ready",
  },
  O_final_action_register: blocks,
  P_continuation: {
    firstFiles: [
      "docs/EXTERNAL_ACTION_REGISTER.md",
      "docs/IMPLEMENTATION_STATUS.md",
      "docs/modules/EVENT_FUNCTIONS.md",
      "src/infrastructure/ai/diagnostic.ts",
      "src/infrastructure/ai/types.ts",
      "scripts/live-env.ts",
      "supabase/migrations/20261026183745_p1_event_functions.sql",
    ],
    externalOrder: [
      "Resolve Gemini auth and an approved OpenRouter route; run one smoke only after material change",
      "Verify isolated Supabase identity, inspect/dry-run/apply4 migrations without remote reset",
      "Configure two synthetic accounts; run real Auth/persistence/tenant/transaction tests",
      "After successful provider smoke and allowed24-request budget run separate corpora plus qualitative review",
      "Designate authorized hosting target, verify deployed real journey and operations",
    ],
    independentNextTasks: [
      "Extend FR-015 adversarial/real staging tests and platform pgTAP coverage before rollout",
      "Implement FR-016 guest/household/function-consistent attendance and hashed expiring/revocable invitation tokens with manual share (no unsolicited sends)",
      "Then explicit role/delegation contracts for FR-017 before agency collaboration",
      "Continue remaining AppendixF modules independently with separate migrations/contracts/tests; leave unfinished surfaces hidden",
      "Define advanced P2 acceptance contracts only after protecting P0 regression gates",
    ],
    commandsAfterCodeChanges: [
      "npm run format:check",
      "npm run lint",
      "npm run typecheck",
      "npm test",
      "npm run test:concurrency",
      "npm run api:generate",
      "npm run db:types",
      "npm run build",
      "npm run security:client",
      "npm run test:e2e",
    ],
    precautions:
      "Read current Git/status; preserve15be61c/a98fdec history and original image, do not overwrite ignored environment. Do not regenerate older historical reports with today's state. No paid requests/purchases, customer data, unrelated cloud projects, remote resets or unchanged retry loops.",
    completion:
      "This session is a saved engineering checkpoint. Remaining independent P1/P2 work is explicitly incomplete; external blockers do not justify claiming full product completion.",
  },
};
function render(v, depth = 0) {
  if (Array.isArray(v))
    return v
      .map((x) => (typeof x === "object" ? render(x, depth) : `- ${x}`))
      .join("\n");
  if (v && typeof v === "object")
    return Object.entries(v)
      .map(([k, x]) =>
        typeof x === "object" && x !== null
          ? `\n${"#".repeat(Math.min(4, 3 + depth))} ${k.replace(/_/g, " ")}\n\n${render(x, depth + 1)}\n`
          : `- **${k}:** ${x ?? "not observed / not available"}`,
      )
      .join("\n");
  return String(v ?? "not observed");
}
const titles = [
  "A. Executive verdict",
  "B. Git history",
  "C. Blocker resolution",
  "D. Gemini evidence",
  "E. OpenRouter evidence",
  "F. Supabase evidence",
  "G. Frontend evidence",
  "H. Automated testing",
  "I. Security assessment",
  "J. Deployment",
  "K. P0 completion",
  "L. P1 completion",
  "M. P2 completion",
  "N. Commercial readiness",
  "O. Final action register",
  "P. Continuation instructions",
];
let md = `# UtsavOS final engineering checkpoint\n\n2026-10-27 · Asia/Kolkata. **P0 IMPLEMENTED BUT RELEASE BLOCKED. P1 PARTIALLY IMPLEMENTED. P2 NOT STARTED.**\n\nThis report preserves evidence boundaries. Code complete, staging verified and public production ready are separate gates. No credential values or raw provider errors are included.\n`;
Object.entries(r)
  .filter(([k]) => /^[A-P]_/.test(k))
  .forEach(([, v], i) => {
    md += `\n## ${titles[i]}\n\n${render(v)}\n`;
  });
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/CODEX_FINAL_COMPLETION_REPORT.json",
  JSON.stringify(r, null, 2) + "\n",
);
writeFileSync("docs/CODEX_FINAL_COMPLETION_REPORT.md", md);
const evidence = {
  clientDate: r.clientDate,
  generatedAtUtc: r.generatedAtUtc,
  implementationCommit: r.B_git_history.verifiedImplementationCommit,
  unit: vt(unit),
  native: vt(native),
  browser: pw(browser),
  configuredPublic: pw(publicCheck),
  diagnostic,
  latestSmoke: smoke,
  concurrency,
  releaseEligible: false,
};
writeFileSync(
  "docs/evidence/final-verification.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
for (const [provider, evaluation] of [
  ["gemini", r.D_gemini_evidence],
  ["openrouter", r.E_openrouter_evidence],
])
  writeFileSync(
    `docs/evidence/${provider}-evaluation.json`,
    JSON.stringify(
      {
        provider,
        clientDate: r.clientDate,
        liveCorpusStatus: "BLOCKED",
        casesExecuted: 0,
        automatedSchemaMetrics: null,
        qualitativeHumanReview: "NOT RUN",
        evidence: evaluation,
      },
      null,
      2,
    ) + "\n",
  );
writeFileSync(
  "docs/EXTERNAL_ACTION_REGISTER.md",
  `# External action register\n\n2026-10-27. No secret values should be pasted in chat. Credentials belong in ignored environment files or approved secret storage. All current actions below remain BLOCKED; new diagnostic evidence replaces repeated speculative retries. No external purchase/migration/deployment was made.\n\n${blocks.map((b) => `## ${b.id} — ${b.service}\n\n- Required access/configuration: ${b.requiredAccess}\n- Evidence: ${b.diagnostics}\n- Root cause boundary: ${b.rootCause}\n- Exact owner action: ${b.action}\n- Prerequisite: ${b.prerequisite}\n- Risk: ${b.risk}\n- Can execute autonomously now: ${b.autonomous}\n- Verification: ${b.command}\n- Status: ${b.status}\n`).join("\n")}\n`,
);
writeFileSync(
  "docs/IMPLEMENTATION_STATUS.md",
  `# Implementation status\n\n2026-10-27 (Asia/Kolkata). Starting checkpoint15be61c preserved; tested implementation **${r.B_git_history.verifiedImplementationCommit}**. Current milestone7 external release gate **BLOCKED**; independent milestone8 FR-015 **IMPLEMENTED / TESTED LOCALLY, preview off by default**. Full product incomplete.\n\n## Gate assessment\n\n- A: P0 code locally verified.\n- B: Staging BLOCKED: Gemini401, no approved OpenRouter route, target Supabase access/accounts absent, no deployment.\n- C: Public production NOT READY: B plus operational/privacy/retention/support/recovery requirements.\n\n## New verified implementation\n\nProvider diagnostic.ts + diagnose-providers.mjs distinguish authentication/authorization/model/routing/quota/DNS/TLS/network/timeout safely. Live environment loader honors process overrides. Actual metadata Gemini401; OpenRouter key/catalogue200; two bounded fixed free generation attempts fail404/no route. No privacy relaxation, purchases or unchanged retries.\n\nFR-015 functions: domain/event-functions.ts; components/event-functions.tsx; API functions routes; fourth migration20261026183745; resource consistency FKs; owner RLS; shared P0 lock/version; audit/receipts; protected links; create/edit/archive and schedules. FEATURE_EVENT_FUNCTIONS=false by default. See modules/EVENT_FUNCTIONS.md. No team/billing/RSVP capability implied.\n\n## Requirement mapping\n\n| Requirement | Source / evidence | State |\n| --- | --- | --- |\n${p0.map((f) => `| ${f.requirementId} ${f.name} | ${f.implementationFiles.join(", ")} | IMPLEMENTED; local tested layers pass; staging blocked |`).join("\n")}\n| FR-015 functions | domain/component, API, fourth migration;10 SQL,2 native race,6 browser and API gate cases | IMPLEMENTED / TESTED LOCALLY; flag off; hosted blocked |\n| Remaining FR-016–021 / AppendixF | Not implemented; see final report L | NOT STARTED |\n| P2 backlog | No advanced operations/integrations exposed | NOT STARTED / conditional mobile DEFERRED |\n\n## Tests and defects\n\n${unit.numPassedTests} regression tests PASS; ${native.numPassedTests} native TCP tests PASS; ${browser.stats.expected} browser tests PASS; ${publicCheck.stats.expected} configured read-only public test PASS. Lint/types/format/build/client-secret scan and generated24-path API/database types pass. New SQL operator precedence/ESM import/typed RPC errors fixed; P1 pending checkbox now preserves selection during save and rolls back on failure. All original assertions retained. Actual signed Auth/PostgREST/provider output/corpus/deployment remain unverified.\n\n## Exact continuation\n\nFirst resolve external register in order for real-service acceptance. Independent next module: FR-016 guest/household/function-consistent attendance + hashed expiring/revocable invitation tokens/manual share, then FR-017 authorization before collaboration. Remaining P1/P2 code is not exhausted or completed. Preserve existing financial/tenant/version/receipt checks. Read final report P before resuming.\n\n[Current report](CODEX_FINAL_COMPLETION_REPORT.md) · [Tests](TEST_REPORT.md) · [Actions](EXTERNAL_ACTION_REGISTER.md) · [Decisions](DECISIONS.md) · [Deployment](DEPLOYMENT.md). Older CODEX_COMPLETION_REPORT files are historical, not regenerated. No known critical local domain/SQL defect remains in tested scope; target platform and commercial readiness remain unknown.\n`,
);
writeFileSync(
  "docs/TEST_REPORT.md",
  `# Test report\n\n2026-10-27. Tested implementation${r.B_git_history.verifiedImplementationCommit}; Node24.16.0 on Windows. No dependency changes. Historical evidence from15be61c is retained separately; current counts below are executed results, not copied claims.\n\n| Command / category | Outcome | Passed | Failed | Skipped | Duration ms |\n| --- | --- | --- | --- | --- | --- |\n${commands.map((t) => `| ${t.command.replaceAll("|", "/")} | ${t.result.replaceAll("|", "/")} | ${t.passed ?? "n/a"} | ${t.failed ?? "n/a"} | ${t.skipped ?? "n/a"} | ${t.durationMs ?? "not measured"} |`).join("\n")}\n\n## Scope and artifacts\n\nPGlite executes four migrations and actual SQL transaction/RLS/grant checks with synthetic auth.uid roles. Native PostgreSQL17.10 uses independent TCP connections:13 scenarios including all prior races and2 new P1/P0 races. Neither verifies actual GoTrue/JWT/PostgREST. Default AI and API tests use controlled doubles.\n\nBrowser20 tests: original14 P0 plus6 P1. Five widths320/375/768/1024/1440;35 P0 planner scans,5 landing scans,5 function pages and5 function editor dialog scans. Axe/overflow/focus checks pass in those contexts. P1 create/edit/link/refresh/unlink/archive tested against synthetic API; real account persistence remains blocked. Production read-only check verifies health/anonymous route/API denial only. Manual screen-reader/device testing not done.\n\nThe first P1 browser run failed one of20 tests because checkbox controlled state reverted while awaiting save. Implementation now has explicit pending state/busy feedback and rollback; unchanged20-test suite passes. SQL JSON operator precedence, Node extension and generated Json RPC type mismatches were corrected; final156 regression tests pass. No assertions disabled.\n\nGemini metadata GET401/389ms; no unchanged generation repeated. OpenRouter key200/393ms, catalogue200/785ms. Two fixed free smokes (45s,1attempt,no fallback,privacy retained): liquid failed~1229ms; nvidia failed~1367ms with AI_ROUTE_UNAVAILABLE. Each filtered run has1failed/1skipped; Gemini skip is not a pass. No successful generated model/tokens/cost observed; live corpus0 cases. All three staged suites exit nonzero at preflight with0 tests and no remote mutation.\n\nIgnored raw artifacts: .runtime/final-unit-results.json, final-native-results.json, browser-results.json, live-public-results.json, provider-diagnostic.json, live-provider-smoke.json. Durable redacted ledger: [final-verification.json](evidence/final-verification.json); separate [Gemini](evidence/gemini-evaluation.json) / [OpenRouter](evidence/openrouter-evaluation.json) evaluation records; [full report](CODEX_FINAL_COMPLETION_REPORT.json).\n\nNo CI dispatch, hosted migration/Auth/RLS, real authenticated browser journey, cloud deployment, load/restore or compliance result exists. P0 release remains NO-GO. P1 functions locally tested only; remaining P1/P2 implementation incomplete.\n`,
);
writeFileSync(
  "docs/FOUNDER_ACTIONS_REQUIRED.md",
  `# Founder actions required\n\n2026-10-27. The current exact actions and evidence are in [EXTERNAL_ACTION_REGISTER.md](EXTERNAL_ACTION_REGISTER.md), replacing the prior speculative setup list. No credentials belong in chat.\n\n- EXT-01: Gemini configured-model metadata returns401. Correct intended project/key/API authorization securely; no model substitution to hide it.\n- EXT-02: OpenRouter key/catalogue work, but tested fixed free models have no permitted completion route. Preserve privacy; approve compatible endpoint/access/budget without an automatic purchase.\n- EXT-03: Grant connected management access to the designated isolated UtsavOS Supabase project. No remote changes until identity verified; four migrations ready locally.\n- EXT-04: Configure/confirm two synthetic staging identities and exact callback/recovery settings, then execute real Auth/data/tenant/browser tests.\n- EXT-05: Provide Docker-capable LOCAL stack or designated Git/CI repository; native transaction tests do not replace platform parity.\n- EXT-06: After successful provider smoke, allow24 requests/provider and review real corpus/usefulness.\n- EXT-07: Designate authorized UtsavOS hosting target/environment; no project link or matching account/team target exists. Verify real deployment after service gates.\n\nP1 functions have continued independently and are off by default. Remaining independent P1/P2 work is incomplete and does not require pretending these external gates passed. See [current report](CODEX_FINAL_COMPLETION_REPORT.md).\n`,
);
console.log(
  `Final redacted checkpoint written: ${unit.numPassedTests} regression, ${native.numPassedTests} native, ${browser.stats.expected} browser; staging remains BLOCKED.`,
);
