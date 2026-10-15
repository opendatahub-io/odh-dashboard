---
name: dsc-outage-workaround
description: "Diagnose and safely remediate DataScienceCluster (DSC) infrastructure outages that block stable merges. Use when a nightly or stable merge is blocked by DSC NotReady, a module deployment failure, or a known environmental issue such as missing Feast TLS RBAC."
argument-hint: "<diagnose|fix feast-rbac|verify> [--namespace redhat-ods-applications] [--dsc-name default-dsc] [--dry-run]"
---

# DSC Outage Workaround

Resolve a DataScienceCluster (DSC) infrastructure failure that blocks a stable merge, without masking a dashboard code regression.

## Scope

Use this skill only when:

- A nightly or stable merge is blocked by a DSC infrastructure or environmental failure.
- The failure is conclusively isolated to a foundational DSC issue.
- A narrowly scoped, documented workaround can restore the environment.
- The user has explicitly authorized cluster changes, or the requested command is read-only.

Do **not** use this skill when:

- The failure is a dashboard code regression.
- The failure affects widespread multi-component behavior.
- The root cause is a code synchronization or build-pipeline failure.
- The required workaround would change application behavior rather than repair a foundational cluster resource.

## Inputs

- Command: `diagnose`, `fix feast-rbac`, or `verify`
- DSC name: default `default-dsc`
- Applications namespace: default `redhat-ods-applications`

## Prerequisites

- `oc` CLI is installed and logged in to the target cluster.
- The current user can read DSC, Platform, deployments, pods, logs, and RBAC.
- For `fix feast-rbac`, the current user can create ClusterRoles and ClusterRoleBindings and restart the Feast deployment.

## Safety rules

1. Run `diagnose` before applying any fix.
2. Never apply a workaround unless the diagnosis matches a known, narrowly scoped playbook.
3. Record the exact resource names, commands, and validation output.
4. Do not print or persist authentication tokens.
5. After remediation, validate `DataScienceCluster`, `Platform`, and the affected module.
6. Re-run the relevant end-to-end tests before deciding whether the stable merge can proceed.
7. If tests remain failed for reasons directly caused by the workaround, do not treat the run as fully passing unless the documented partial-failure exception applies.

## Execution

### Step 1: Diagnose

From the repository root, run:

```bash
python3 .claude/skills/dsc-outage-workaround/scripts/dsc_workaround.py diagnose
```

If the namespace or DSC name differs, add:

```bash
--namespace <namespace> --dsc-name <dsc-name>
```

The helper returns JSON containing:

- Cluster server
- DSC and Platform condition summaries
- Failing DSC modules
- Feast deployment, pod, log, and RBAC state
- A recommended fix when the known Feast issue is detected

### Step 2: Confirm scope

Before applying a fix, verify:

- The DSC is `Ready=False`.
- The failing module is isolated to one DSC component.
- The affected operator has a concrete infrastructure error.
- The dashboard repository itself has not introduced the failure.
- The proposed workaround matches a known playbook in `reference.md`.

### Step 3: Apply the fix

For the known Feast TLS RBAC issue, run:

```bash
python3 .claude/skills/dsc-outage-workaround/scripts/dsc_workaround.py fix feast-rbac --yes
```

To inspect the patch without changing the cluster, run:

```bash
python3 .claude/skills/dsc-outage-workaround/scripts/dsc_workaround.py fix feast-rbac --dry-run
```

The helper:

1. Creates `ClusterRole/feast-operator-apiservers-workaround`
2. Creates `ClusterRoleBinding/feast-operator-apiservers-workaround`
3. Restarts `deployment/feast-operator-controller-manager`
4. Waits for the Feast rollout
5. Waits for DSC and Platform readiness

### Step 4: Verify

Run:

```bash
python3 .claude/skills/dsc-outage-workaround/scripts/dsc_workaround.py verify
```

Require:

- `DataScienceCluster/<name>` → `Ready=True`
- `Platform/default` → `Ready=True`
- Affected module condition → `Ready=True`
- Affected deployment → available

### Step 5: Run E2E tests

Run the relevant dashboard E2E suite against the remediated environment.

If the suite passes, record the run as a pass.

If only tests directly impacted by the workaround fail, apply the documented partial-failure exception only when all core tests pass and the failed tests are demonstrably caused by the workaround.

### Step 6: Merge decision

Proceed with the fast-forward-only stable merge only when:

- The DSC workaround is validated.
- Relevant E2E tests pass, or the partial-failure exception is justified.
- A blocking bug and formal exception approval are recorded.
- Any code-freeze governance requirements are satisfied.

## Manual fallback

If the helper is unavailable, use the commands in `reference.md`.

## Output

Report:

```md
## DSC Outage Workaround

**Cluster:** <server>
**DSC:** <name>
**Diagnosis:** <known issue or unknown>
**Workaround applied:** <resource names or none>
**Validation:**
- DSC Ready: <true|false>
- Platform Ready: <true|false>
- Module Ready: <true|false>
**E2E result:** <pass|fail|partial>
**Merge decision:** <proceed|blocked>
```

## Rollback

For the Feast workaround, delete the temporary RBAC resources only after the permanent operator fix is deployed:

```bash
oc delete clusterrolebinding feast-operator-apiservers-workaround
oc delete clusterrole feast-operator-apiservers-workaround
```

## Portability

This skill uses only shell commands, `oc`, and Python. It does not depend on Claude-specific or OpenAI-specific APIs and can run in any agent environment with those tools available.
