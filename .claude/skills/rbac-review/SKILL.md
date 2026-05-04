---
name: rbac-review
description: Reviews code changes for proper RBAC enforcement across user types (cluster admin, dashboard admin, regular user). Catches missing permission gates, fail-open patterns, and assumptions of elevated access. Use when reviewing PRs, auditing permissions, or checking RBAC compliance.
---

# RBAC Evaluation Review — ODH Dashboard

Evaluates code changes for proper RBAC enforcement. The dashboard has three user types — cluster admin, dashboard admin, and regular user — each with different Kubernetes RBAC permissions. A common failure mode is that developers test with cluster-admin privileges, which hides access-control bugs that only surface for lower-privilege users.

## Inputs

The user may provide:

- **A Jira ticket key** (e.g. `RHOAIENG-12345`) — the feature being implemented. Provides context on which resources and operations the code must gate.
- **No code arguments** — review files changed versus `main` by running `git diff main --name-only`, filtering to `*.ts` and `*.tsx` files, **excluding** `**/upstream/**` and `**/__tests__/**` paths.
- **A file or directory path** — review only those files.
- **A PR number (`#N`)** — run `gh pr diff N` to get changed files and review those.
- **A branch name** — validate the ref, then diff against `main`.

## Phase 0: Gather feature context

Run the context script to prompt for a Jira ticket:

```bash
bash .claude/skills/rbac-review/scripts/gather-context.sh
```

The script prints a prompt to stderr and reads a Jira key from stdin. If the user provides one, it outputs a structured context block. If skipped (empty input), the script exits cleanly with no output.

**When a ticket is provided:** Use the `jira_get_issue` MCP tool (server: `user-atlassian`) to fetch the full issue. Extract from the response:

- **Summary** — what feature is being built
- **Description** — acceptance criteria, referenced resources, API groups, verbs
- **Labels** — `dashboard-area-*` labels hint at which subsystem is involved

Use this to build an **expected permission model**: which K8s resources and verbs the feature likely needs, and which user types should or should not have access. This model guides all subsequent checks — instead of only detecting generic anti-patterns, the review can flag specific **missing gates** for the resources/operations the feature introduces.

**When no ticket is provided:** Proceed with generic checks only — the review still catches anti-patterns but cannot validate completeness against feature requirements.

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

- **Frontend pages/routes** — Verify `accessAllowedRouteHoC` or `useAccessAllowed` + conditional rendering is applied. A new page without an SSAR gate is a **Critical** finding.
- **Buttons/actions** — Verify the action checks permissions (via `useAccessAllowed`, `useKebabAccessAllowed`, or `AccessAllowed` render-prop). A mutation action without a permission check is **Warning**.
- **Backend routes** — Verify mutating endpoints use `secureRoute` or `secureAdminRoute`. An unprotected mutating endpoint is **Critical**.

### Check 2: Fail-open patterns

Flag code that defaults to "allowed" when permission checks fail or are missing:

- `checkAccess` catches returning `true` — this is an intentional fail-open for the UI. Verify that the **backend** still enforces the gate. If only frontend SSAR is used with no backend protection for a mutation, flag as **Critical**.
- Conditionals like `if (isAdmin || true)`, disabled checks behind feature flags that default to off, or `isAllowed` states initialized to `true` before the SSAR resolves — flag as **Critical**.
- Loading states that render privileged UI before SSAR completes — flag as **Warning**.

### Check 3: Deprecated admin patterns

Flag usage of:

- `useUser().isAdmin` or Redux `state.user.isAdmin` for gating new features — **Warning** (deprecated; use `useAccessAllowed` with `verbModelAccess`).
- `getClusterAdminUserList` or Group-based admin checks — **Warning** (deprecated).
- Direct import of `isUserAdmin` on the frontend — **Warning** (backend-only utility).

### Check 4: Namespace and resource scoping

- **Backend**: Verify namespace validation in route handlers. Operations must be scoped to `dashboardNamespace` or `workbenchNamespace`. Un-scoped operations are **Critical**.
- **Frontend**: SSAR checks without a namespace default to the dashboard namespace (via `AccessReviewProvider`). Verify this is intentional when working with resources in other namespaces — **Warning** if ambiguous.
- **BFF (Go)**: Verify token forwarding and namespace validation in proxy calls. Missing auth header propagation is **Critical**.

### Check 5: User type coverage

For any permission-gated feature, verify the code handles all three user types:

| User Type | Expected Behavior |
|-----------|------------------|
| **Cluster admin** | Full access (all SSAR pass) |
| **Dashboard admin** | Admin features visible, but not cluster-scoped operations |
| **Regular user** | Only own resources; admin features hidden/disabled; graceful degradation |

Flag features that only consider "admin vs non-admin" without distinguishing dashboard admin from cluster admin — **Info** (consider whether the distinction matters for this feature).

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
- Target user types: <who should/shouldn't have access>

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

Omit the "Feature Context" and "Permission model coverage" sections if no Jira ticket was provided.

### Severity classification

| Severity | Criteria |
|----------|----------|
| Critical | Missing backend auth on mutating endpoints; unprotected admin routes; fail-open patterns that bypass Kubernetes RBAC; new pages with no access gate |
| Warning | Missing frontend permission gates on actions; deprecated admin patterns; ambiguous namespace scoping; loading-state privilege leaks |
| Info | Feature only considers admin/non-admin without finer distinction; unconditional data fetch that backend rejects; patterns that work but could be cleaner |

If there are no findings, confirm the changes have proper RBAC coverage and note any well-implemented patterns worth highlighting.
