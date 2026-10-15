# DSC Outage Reference

## Governance

The approved policy permits a temporary environmental workaround when a nightly failure is conclusively isolated to a DSC infrastructure issue rather than a dashboard code regression.

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
4. Log a blocking bug and formal exception approval.
5. Proceed with a fast-forward-only merge to stable if all governance conditions are met.

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
oc get dsc default-dsc -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{"; reason="}{.reason}{"; message="}{.message}{"\n"}{end}'

oc get feastoperator default-feastoperator -n redhat-ods-applications \
  -o jsonpath='{range .status.conditions[*]}{.type}{"="}{.status}{"; reason="}{.reason}{"; message="}{.message}{"\n"}{end}'

oc get deployment feast-operator-controller-manager \
  -n redhat-ods-applications -o wide

oc get pods -n redhat-ods-applications \
  -l control-plane=controller-manager -o wide

oc auth can-i get apiservers.config.openshift.io/cluster \
  --as=system:serviceaccount:redhat-ods-applications:feast-operator-controller-manager
```

### Workaround

```bash
oc apply -f - <<'EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: feast-operator-apiservers-workaround
rules:
- apiGroups: ["config.openshift.io"]
  resources: ["apiservers"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: feast-operator-apiservers-workaround
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: feast-operator-apiservers-workaround
subjects:
- kind: ServiceAccount
  name: feast-operator-controller-manager
  namespace: redhat-ods-applications
EOF

oc rollout restart deployment/feast-operator-controller-manager \
  -n redhat-ods-applications

oc rollout status deployment/feast-operator-controller-manager \
  -n redhat-ods-applications --timeout=180s
```

### Validation

```bash
oc get dsc default-dsc \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

oc get platform default \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

oc get feastoperator default-feastoperator -n redhat-ods-applications \
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
