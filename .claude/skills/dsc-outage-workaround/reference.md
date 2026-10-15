# DSC Outage Reference

## Governance

The [Process Exception for Stable Merges During DSC Outages](https://docs.google.com/document/d/1ZksqSIcNFrCIZkTpqOlY0qO9_B7BbizbS7g9lXQQnr8/edit?tab=t.0) permits a temporary environmental workaround when a nightly failure is conclusively isolated to a DSC infrastructure issue rather than a dashboard code regression.

Permitted workaround scope:

- Foundational DSC issues, such as a missing RBAC rule, missing chart, or incorrect resource label.
- Narrowly scoped cluster or configuration repairs.

Prohibited workaround scope:

- Widespread multi-component failures.
- Code synchronization or build-pipeline failures.
- Changes that alter dashboard application behavior.

After remediation:

1. Re-run the relevant E2E suite.
2. Record a pass only when the suite passes.
3. Use the partial-failure exception only when all core tests pass and the remaining failures are directly caused by the workaround.
4. Log a blocking bug and record approval from the authority named in the linked policy.
5. Record the approver, approval link, exact affected test scope, and causal evidence.
6. Proceed with a fast-forward-only merge to stable if all governance conditions are met.

## Known issue: Feast TLS RBAC

### Symptoms

- `DataScienceCluster/default-dsc` is `Ready=False`.
- `DataReady=False`, reason `DeploymentsNotReady`.
- `FeastOperator/default-feastoperator` is `Ready=False`.
- `feast-operator-controller-manager` is in `CrashLoopBackOff`.

### Error

```text
ERROR setup TLS bootstrap failed
unable to read APIServer TLS profile:
failed to get APIServer "/cluster":
apiservers.config.openshift.io "cluster" is forbidden
```

### Root cause

The inner Feast operator needs `get`, `list`, and `watch` on:

```text
apiservers.config.openshift.io
```

The rendered Feast ClusterRole does not include that permission.

### Diagnosis commands

```bash
DSC_NAME="${DSC_NAME:-default-dsc}"
APPS_NAMESPACE="${APPS_NAMESPACE:-redhat-ods-applications}"

oc get dsc "$DSC_NAME" \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{"; reason="}{.reason}{"; message="}{.message}{"\n"}{end}'

oc get feastoperator default-feastoperator -n "$APPS_NAMESPACE" \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{"; reason="}{.reason}{"; message="}{.message}{"\n"}{end}'

oc get deployment feast-operator-controller-manager \
  -n "$APPS_NAMESPACE" -o wide

oc get pods -n "$APPS_NAMESPACE" \
  -l control-plane=controller-manager -o wide

oc auth can-i get apiservers.config.openshift.io/cluster \
  --as="system:serviceaccount:${APPS_NAMESPACE}:feast-operator-controller-manager"
```

### Workaround

```bash
DSC_NAME="${DSC_NAME:-default-dsc}"
APPS_NAMESPACE="${APPS_NAMESPACE:-redhat-ods-applications}"

oc create clusterrole feast-operator-apiservers-workaround \
  --verb=get,list,watch \
  --resource=apiservers.config.openshift.io

oc create clusterrolebinding feast-operator-apiservers-workaround \
  --clusterrole=feast-operator-apiservers-workaround \
  --serviceaccount="${APPS_NAMESPACE}:feast-operator-controller-manager"

oc rollout restart deployment/feast-operator-controller-manager \
  -n "$APPS_NAMESPACE"

oc rollout status deployment/feast-operator-controller-manager \
  -n "$APPS_NAMESPACE" --timeout=180s
```

### Validation

```bash
DSC_NAME="${DSC_NAME:-default-dsc}"
APPS_NAMESPACE="${APPS_NAMESPACE:-redhat-ods-applications}"

oc get dsc "$DSC_NAME" \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

oc get platform default \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

oc get feastoperator default-feastoperator -n "$APPS_NAMESPACE" \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

Expected:

```text
True
True
True
```

### Rollback

```bash
oc delete clusterrolebinding feast-operator-apiservers-workaround
oc delete clusterrole feast-operator-apiservers-workaround
```

Only roll back after the permanent Feast module operator fix is deployed.

## Adding a new known issue

Add a new section with:

1. Symptom
2. Exact error
3. Root cause
4. Diagnostic commands
5. Narrow workaround
6. Validation
7. Rollback
8. Governance constraints

Do not add a workaround that:

- Modifies dashboard source code.
- Changes application behavior.
- Requires broad cluster-wide permissions.
- Masks a multi-component failure.
