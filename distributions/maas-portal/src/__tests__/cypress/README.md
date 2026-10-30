# MaaS Portal Cypress Tests

These mocked browser tests exercise the assembled portal: navigation, API keys, subscriptions, playground interactions, observability, and Grid feature-flag behavior. Cypress intercepts supply service responses; unmatched fetch/XHR requests fail the test.

BFF behavior is covered by the MaaS and GenAI modules' own tests. The portal suite does not start BFFs or verify deployed authentication, persistent API-key writes, real inference, or live metrics.

## Run Locally

Use the repository's Node.js and pnpm versions with installed dependencies. No cluster connection, Go toolchain, or real credentials are required. Linux also needs the system libraries required by the installed Cypress browser.

Run mock tests from the repository root:

```bash
pnpm --filter @odh-dashboard/maas-portal-distribution test:cypress-ci
```

To collect code coverage locally:

```bash
COVERAGE=true pnpm --filter @odh-dashboard/maas-portal-distribution test:cypress-ci
```

This instruments the production build for testing and collects Istanbul JSON and LCOV reports in `results/coverage/`. Normal production builds remain uninstrumented. Reports include bundled first-party sources exercised by the portal, including its shared modules; tests and mock factories are excluded.

For interactive mock debugging, work from `distributions/maas-portal`:

```bash
pnpm run cypress:server:build
pnpm run cypress:server
# In another terminal in the same directory:
pnpm run cypress:open:mock
# Or run a single spec against the running server:
pnpm run cypress:run:mock --spec src/__tests__/cypress/cypress/tests/mocked/grid.cy.ts
```

## Extend Browser Coverage

1. Add a spec under [cypress/tests/mocked/](cypress/tests/mocked/), or extend the relevant existing spec. The default spec pattern discovers it automatically.
2. Reuse module-owned page objects: `@odh-dashboard/gen-ai/testing/pages`, `@odh-dashboard/observability/testing/pages`, and `@odh-dashboard/cypress/cypress/pages/modelsAsAService`. Add missing feature selectors to their owning objects. Keep only portal navigation and portal-specific states in the [local page objects](cypress/pages/); use `portal.visit()` for the distribution prefix. Perform actions in the test. Prefer existing test IDs or accessible roles; avoid DOM structure selectors.
3. Add API intercepts to the appropriate [support helper](cypress/support/) before visiting the page. Keep the unmatched-request guard enabled.
4. Reuse package-owned mock factories. Shared data comes from [MaaS fixtures](../../../../../packages/cypress/cypress/__mocks__/maasFixtures.ts), [GenAI fixtures](../../../../../packages/gen-ai/frontend/src/__mocks__/genAiFixtures.ts), and [observability fixtures](../../../../../packages/observability/src/__mocks__/observabilityFixtures.ts). Portal-specific compositions can stay in [the local mocks](cypress/__mocks__/).
5. Use `setupPortalMocks({ grid: true })` for Grid UI scenarios. See [grid.cy.ts](cypress/tests/mocked/grid.cy.ts) for checks with the flag on and off, including reload. Wait for requests or observable UI state instead of fixed delays.

## CI, Verification, And Diagnostics

The [Test workflow](../../../../../.github/workflows/test.yml) includes the portal in its shared `Cypress-Mock-Tests` matrix. The [application planner](../../../../../scripts/cypress/plan-mock-test-applications.js) uses the distribution impact selector to select the portal mock suite for changes to the portal, its transitive workspace dependencies, or relevant build/test infrastructure. Recognized documentation-only and unrelated changes can skip the browser suite; uncertain impact runs conservatively.

For selected changes, a workspace matrix entry runs `test:cypress-ci` from this distribution and uploads its results. It builds the portal locally with coverage instrumentation, without restoring dashboard federation assets. Portal coverage joins the existing Cypress artifacts and combined coverage report. A successful portal run updates the separate `cypress-mock-maas-portal` Codecov flag, including on portal-only changes. Complete dashboard runs update `cypress-mock` independently. Skipped suites use carryforward coverage. When no application needs testing, one no-op matrix entry succeeds. The final `Tests` check requires all of its dependencies to succeed. Coverage still depends on assertions for the changed behavior; selection alone cannot detect an untested regression.

After changing test selection or CI orchestration, run this from the repository root:

```bash
pnpm run test:cypress-orchestration
```

The orchestration suite checks application selection, runner routing, coverage merging, and shared-job eligibility. To register another standalone application, see the [shared Cypress application configuration](../../../../../docs/testing.md#application-runners).

Artifacts are relative to this Cypress directory: `results/junit/`, `results/screenshots/`, and `results/videos/`, and `results/coverage/`. CI uploads the results directory even on failure.

An unmocked request failure usually means the scenario setup is missing an intercept.
