---
name: rbac-review
description: Reviews code changes for proper RBAC enforcement. Catches missing SSAR permission gates, fail-open patterns, assumed access from isAdmin, and pages that break for limited-access users. Use when reviewing PRs, auditing permissions, or checking RBAC compliance.
---

# RBAC Evaluation Review — ODH Dashboard

Evaluates code changes for proper RBAC enforcement. The dashboard serves users with varying Kubernetes RBAC permissions determined by their cluster roles — not by any dashboard-internal user classification.

**Core principle:** Dashboard admins and regular users must be treated identically — every operation requires an explicit SSAR check for the specific verb+resource being accessed. The deprecated `isAdmin` boolean must not be used to assume capabilities. The only user who bypasses checks is a cluster admin (all SSAR pass), and since developers typically test as cluster-admin, they get a false sense that everything works. The skill catches code that will break for any limited-access user.

## Inputs

The user may provide:

- **A Jira ticket key** (e.g. `RHOAIENG-12345`) — the feature being implemented. Provides context on which resources and operations the code must gate.
- **No code arguments** — review files changed versus `main` by running `git diff main --name-only -- '*.ts' '*.tsx' '*.go' '*.proto'`, **excluding** `**/upstream/**` and `**/__tests__/**` paths. This ensures frontend, backend, and BFF (Go) surfaces are all scanned for RBAC issues.
- **A file or directory path** — review only those files.
- **A PR number (`#N`)** — run `gh pr diff N` to get changed files and review those.
- **A branch name** — validate the ref, then diff against `main`.

## Phase 0: Gather feature context

If the user provided a Jira ticket key as an argument (e.g. `/rbac-review RHOAIENG-12345`), fetch the full Jira issue (via MCP or CLI). Extract from the response:

- **Summary** — what feature is being built
- **Description** — acceptance criteria, referenced resources, API groups, verbs
- **Labels** — `dashboard-area-*` labels hint at which subsystem is involved

Use this to build an **expected permission model**: which K8s resources and verbs the feature likely needs, and which user types should or should not have access. This model guides all subsequent checks — instead of only detecting generic anti-patterns, the review can flag specific **missing gates** for the resources/operations the feature introduces.

If no ticket was provided, proceed with generic checks only — the review still catches anti-patterns but cannot validate completeness against feature requirements.

## Phase 1: Load reference data

1. Read [reference.md](reference.md) — RBAC patterns, hooks, utilities, anti-patterns.
2. Skim `.claude/rules/security.md` for general security context.
3. If Phase 0 produced an expected permission model, keep it active as the primary lens for all checks.

## Phase 2: Classify changed code

For each changed file, determine the layer:

| Layer | Paths | Key concerns |
|-------|-------|--------------|
| **Frontend pages/components** | `frontend/src/pages/**`, `packages/*/src/**` | UI gating, disabled states, route protection |
| **Frontend data hooks** | `frontend/src/api/**`, `**/use*.ts` | Conditional fetching, SSAR before fetch |
| **Backend routes** | `backend/src/routes/**`, `packages/*/bff/**` | `secureRoute`/`secureAdminRoute`, namespace validation |
| **Models/types** | `**/models.ts`, `**/k8sTypes.ts` | New resources that need SSAR definitions |

## Phase 3: Run checks

### Check 1: Missing permission gates on new functionality

For any new page, route, button, kebab action, or data-fetching hook:

- **Frontend pages/routes** — Verify `accessAllowedRouteHoC`, `useAccessAllowed`, or `useAccessReview` + conditional rendering is applied. Routes with `flags: { required: [ADMIN_USER] }` in the extension system are protected at the plugin layer — flag as **Info** (should migrate to `accessAllowedRouteHoC`) rather than Critical. A new page with no SSAR gate at all is a **Critical** finding.
- **Buttons/actions** — Verify the action checks permissions (via `useAccessAllowed`, `useAccessReview`, `useKebabAccessAllowed`, or `AccessAllowed` render-prop). A mutation action without a permission check is **Warning**.
- **Backend routes** — Verify mutating endpoints are protected. `secureRoute` only enforces namespace/resource validation on parameterized requests (routes with `:namespace` or resource ID params); un-parameterized POST/PUT/PATCH/DELETE routes are only logged, not blocked. For un-parameterized mutating endpoints, require `secureAdminRoute` or an explicit backend SSAR check (`createSelfSubjectAccessReview`). An unprotected or insufficiently protected mutating endpoint is **Critical**.

### Check 2: Fail-open patterns

Flag code that defaults to "allowed" when permission checks fail or are missing:

- `checkAccess` catches returning `true` — this is an intentional fail-open for the UI. Verify that the **backend** still enforces the gate. If only frontend SSAR is used with no backend protection for a mutation, flag as **Critical**.
- Conditionals like `if (isAdmin || true)`, disabled checks behind feature flags that default to off, or `isAllowed` states initialized to `true` before the SSAR resolves — flag as **Critical**.
- Loading states that render privileged UI before SSAR completes — flag as **Warning**.

### Check 3: Assumed access / deprecated admin patterns

The `isAdmin` boolean means "can patch auths/default-auth" — it does NOT mean the user can do arbitrary operations. Code that treats `isAdmin` as a universal access pass skips the actual SSAR check and will break for users who are "dashboard admins" but lack specific permissions.

Flag usage of:

- `useUser().isAdmin` or Redux `state.user.isAdmin` to gate new features — **Critical** (assumes capabilities instead of checking them; use `useAccessAllowed` with `verbModelAccess` for the specific operation).
- Any pattern like `if (isAdmin) { fetchResource() }` without also checking whether the user can actually access that resource — **Critical**.
- `getClusterAdminUserList` or Group-based admin checks — **Warning** (deprecated).
- Direct import of `isUserAdmin` on the frontend — **Warning** (backend-only utility).

**Exception:** Routes gated via `flags: { required: [ADMIN_USER] }` in the extension system are NOT the same as using `isAdmin` directly — they are protected at the plugin layer (see Check 1). Flag as **Info** (deprecated-but-functional; recommend migration to `accessAllowedRouteHoC` with `verbModelAccess`).

### Check 4: Namespace and resource scoping

- **Backend**: Verify namespace validation in route handlers. Operations must be scoped to `dashboardNamespace` or `workbenchNamespace`. Note: `secureRoute` only enforces namespace validation on parameterized requests (see Check 1); un-parameterized mutating routes may still allow cross-namespace mutations. Treat un-scoped mutating endpoints as **Critical** unless the handler explicitly enforces `dashboardNamespace`/`workbenchNamespace`.
- **Frontend**: SSAR checks without a namespace default to the dashboard namespace (via `AccessReviewProvider`). Verify this is intentional when working with resources in other namespaces — **Warning** if ambiguous.
- **BFF (Go)**: Verify token forwarding and namespace validation in proxy calls. Missing auth header propagation is **Critical**.

### Check 5: Graceful degradation for limited-access users

The most common bug: a developer tests with cluster-admin, everything works. A limited user navigates to the same page, a GET request fails with 403, and the page breaks or shows an error instead of degrading gracefully.

For any page, data fetch, or UI state that depends on a resource:

- **Pages** — If a user lacks permission to `list`/`get` the primary resource, the page must either be hidden from navigation (via `accessReview` on the route/extension) or render a meaningful empty/denied state. Showing a broken page or unhandled error is **Critical**.
- **Conditional UI** — Features that only appear for users with specific permissions (e.g., a "Create" button requiring `create` verb) must use SSAR to determine visibility/disabled state. Assuming "dashboard admin can always create" is **Critical**.
- **Fallback states** — When a secondary data fetch fails due to permissions (e.g., loading cluster-wide metrics on a page that also works without them), the page must continue functioning with the available data. Treating the 403 as a fatal error is **Warning**.

Flag code that uses the deprecated `isAdmin` to gate features instead of checking the specific verb+resource — this creates a false binary where "admin" is assumed to have access without verification.

### Check 6: Data exposure in hooks

For data-fetching hooks that load sensitive or admin-only data:

- Verify the hook conditionally fetches based on permission (e.g., `shouldRunCheck` parameter, or wrapping in `useAccessAllowed`).
- Hooks that unconditionally fetch admin-only resources and rely solely on the backend to reject are acceptable **if** the backend enforces it, but flag as **Info** if the frontend could avoid the failed request.

## Phase 4: Generate report

```md
## RBAC Review — ODH Dashboard

### Feature Context (if Jira ticket provided)
- Ticket: RHOAIENG-XXXXX — <summary>
- Resources: <K8s resources the feature touches>
- Expected gates: <verb/resource pairs that need SSAR checks>
- Limited-user behavior: <what should happen when SSAR denies access>

### Summary
- Files reviewed: N
- Findings: N
- By severity: N critical, N warning, N info
- Permission model coverage: N/M expected gates implemented

### Critical (must fix before merge)
### Warning (should fix)
### Info (consider / acceptable with justification)

---

**[SEVERITY] Check N: Description**
- File: `path/to/file.ts`
- Line: NN
- Found: `the problematic code or pattern`
- Expected: `what the code should do`
- Why: Brief explanation of the RBAC risk
- User impact: Which user type is affected and how
```

Omit the "Feature Context" and "Permission model coverage" sections if no Jira ticket was provided. Instead, append a note at the end of the report:

```md
---

> **Note:** This review checked for generic RBAC anti-patterns only. For a more targeted review that validates permission coverage against feature requirements, re-run with a Jira ticket: `/rbac-review RHOAIENG-XXXXX`
```

### Severity classification

| Severity | Criteria |
|----------|----------|
| Critical | Missing backend auth on mutating endpoints; unprotected pages/routes; fail-open patterns that bypass Kubernetes RBAC; using `isAdmin` to assume capabilities; pages that break for limited users |
| Warning | Missing frontend permission gates on actions; ambiguous namespace scoping; loading-state privilege leaks; secondary fetches that 403 without fallback |
| Info | Unconditional data fetch that backend rejects (works but wasteful); patterns that function correctly but could be cleaner |

If there are no findings, confirm the changes have proper RBAC coverage and note any well-implemented patterns worth highlighting.
