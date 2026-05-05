# RBAC Review — Example Test Fixtures

These files contain intentional RBAC anti-patterns for testing the `rbac-review` skill.

## Usage

```
/rbac-review .claude/skills/rbac-review/example/
```

## Expected Findings

The skill should flag:

| # | Severity | Check | File | Issue |
|---|----------|-------|------|-------|
| 1 | Critical | 1 | `ClusterSettingsRoutes.tsx` | No `accessAllowedRouteHoC` — page is unprotected |
| 2 | Critical | 3 | `ClusterSettingsPage.tsx` | Uses `isAdmin` to gate Create button instead of `useAccessAllowed` |
| 3 | Critical | 3 | `ClusterSettingsTable.tsx` | Uses `isAdmin` to gate kebab actions instead of `useKebabAccessAllowed` |
| 4 | Critical | 2 | `ClusterSettingsTable.tsx` | Fail-open `useState(true)` for delete permission |
| 5 | Warning | 5 | `useClusterSecrets.ts` | Unconditional fetch without permission check — will 403 for limited users |
| 6 | Info | 6 | `ClusterSettingsTable.tsx` | Direct fetch to K8s API for delete bypasses standard utilities |

If the skill misses any of these or produces false positives, the skill instructions need tuning.
