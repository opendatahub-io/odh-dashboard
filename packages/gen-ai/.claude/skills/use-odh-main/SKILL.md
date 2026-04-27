---
name: use-odh-main
description: >-
  Patch the RHOAI or ODH operator ClusterServiceVersion so selected components use
  ODH images from a floating tag (default quay.io/opendatahub/<component>:main),
  patch operator RELATED_IMAGE env values in the CSV, restart the operator, wait
  for reconciliation, and verify deployments/pods. Requires oc, jq, and
  cluster-admin-capable access. Use when the user wants /use-odh-main behavior,
  ODH main image overrides on RHOAI, or to list CSV relatedImages (--list).
---

# Use ODH Main — CSV image overrides (RHOAI / ODH)

## Scope

This skill is **staged under** `packages/gen-ai/.claude/skills/` for **gen-ai team testing**. It is **not** listed in the repo-root `AGENTS.md` until promoted to `.claude/skills/use-odh-main/`.

## Upstream

Adapted from: [acp-workflows `use-odh-main.md`](https://github.com/vmrh21/acp-workflows/blob/main/workflows/rhoai-manager/.claude/commands/use-odh-main.md).

## When to apply

Use when the user asks to:

- Override specific operator components to **`quay.io/opendatahub/<component>:main`** (or another registry/tag)
- Run behavior equivalent to **`/use-odh-main`** (slash command in other tooling)
- **List** component images from the current CSV without patching (`--list`)

## Prerequisites

1. **RHOAI or ODH** operator already installed on the cluster.
2. **`oc`** logged in with privileges sufficient to **patch CSVs** in the operator namespace (typically cluster-admin).
3. **`jq`** installed locally.
4. Warn the user: this **mutates live CSV state**; catalog-driven upgrades **replace** the CSV and **clear** overrides.

## Agent instructions

1. Confirm prerequisites (or ask the user to confirm cluster context).
2. Run the workflow **in order** using the shell blocks below. Combine into a single script only if the user wants one file; otherwise run stepwise so output is visible.
3. After `--list`, **stop** after Step 3’s list branch.
4. If any step warns that env vars could not be patched, surface the **manual `oc set image` fallback** from Troubleshooting.

---

## Command usage (equivalent flags)

- `COMPONENTS...` — image/repo component names (e.g. `odh-mod-arch-automl`, `odh-dashboard-rhel9`)
- `--list` — print `relatedImages` and exit
- `--registry REGISTRY` — default `quay.io/opendatahub`
- `--tag TAG` — default `main`

---

## Step 1: Parse input arguments

```bash
COMPONENTS=()
REGISTRY="quay.io/opendatahub"
TAG="main"
LIST_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --list)
      LIST_ONLY=true
      ;;
    --registry)
      shift
      REGISTRY="$1"
      ;;
    --tag)
      shift
      TAG="$1"
      ;;
    *)
      COMPONENTS+=("$arg")
      ;;
  esac
done

if [[ "$LIST_ONLY" == "false" && ${#COMPONENTS[@]} -eq 0 ]]; then
  echo "ERROR: No components specified."
  echo "Usage: use-odh-main <component1> [component2] ..."
  echo "Example: use-odh-main odh-mod-arch-automl odh-mod-arch-autorag"
  echo "Use --list to see available component images in the current CSV."
  exit 1
fi
```

## Step 2: Verify cluster access and detect operator

```bash
command -v oc &>/dev/null || { echo "ERROR: oc command not found"; exit 1; }
command -v jq &>/dev/null || { echo "ERROR: jq command not found"; exit 1; }
oc whoami &>/dev/null || { echo "ERROR: Not logged into an OpenShift cluster"; exit 1; }

echo "Logged in as: $(oc whoami)"
echo "Cluster: $(oc whoami --show-server)"

OPERATOR_NS=""
CSV_NAME=""
OPERATOR_DEPLOY=""

if oc get csv -n redhat-ods-operator 2>/dev/null | grep -q rhods-operator; then
  OPERATOR_NS="redhat-ods-operator"
  CSV_NAME=$(oc get csv -n "$OPERATOR_NS" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null | grep rhods-operator)
  OPERATOR_DEPLOY="rhods-operator"
  APPS_NS="redhat-ods-applications"
  echo "Detected RHOAI operator: $CSV_NAME in $OPERATOR_NS"
elif oc get csv -n openshift-operators 2>/dev/null | grep -q opendatahub-operator; then
  OPERATOR_NS="openshift-operators"
  CSV_NAME=$(oc get csv -n "$OPERATOR_NS" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null | grep opendatahub-operator)
  OPERATOR_DEPLOY="opendatahub-operator-controller-manager"
  APPS_NS="opendatahub"
  echo "Detected ODH operator: $CSV_NAME in $OPERATOR_NS"
else
  echo "ERROR: Neither RHOAI nor ODH operator found. Install one first."
  exit 1
fi
```

## Step 3: List current CSV relatedImages

```bash
echo ""
echo "=== Current relatedImages in CSV: $CSV_NAME ==="
echo ""

oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json | \
  jq -r '.spec.relatedImages[] | "\(.name)  \(.image)"' | \
  sort

echo ""
```

If `--list` was specified, stop after:

```bash
if [[ "$LIST_ONLY" == "true" ]]; then
  echo "Use use-odh-main <component-image-name> to override specific images."
  echo "The component-image-name is the image portion (e.g., odh-mod-arch-automl)."
  exit 0
fi
```

## Step 4: Match components to CSV relatedImages

```bash
CSV_JSON=$(oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json)

MATCHED=()
UNMATCHED=()

for COMPONENT in "${COMPONENTS[@]}"; do
  RELATED_NAME=$(echo "$CSV_JSON" | jq -r --arg comp "$COMPONENT" \
    '.spec.relatedImages[] | select(.image | contains($comp)) | .name' 2>/dev/null | head -1)

  if [[ -z "$RELATED_NAME" ]]; then
    RELATED_NAME=$(echo "$CSV_JSON" | jq -r --arg comp "$COMPONENT" \
      '.spec.relatedImages[] | select(.name | gsub("-"; "_") | contains($comp | gsub("-"; "_"))) | .name' 2>/dev/null | head -1)
  fi

  if [[ -n "$RELATED_NAME" ]]; then
    MATCHED+=("$COMPONENT|$RELATED_NAME")
    echo "Matched: $COMPONENT -> relatedImage name: $RELATED_NAME"
  else
    UNMATCHED+=("$COMPONENT")
    echo "WARNING: No relatedImage found matching: $COMPONENT"
  fi
done

if [[ ${#MATCHED[@]} -eq 0 ]]; then
  echo ""
  echo "ERROR: No components matched any relatedImages in the CSV."
  echo "Use --list to see available component image names."
  exit 1
fi

if [[ ${#UNMATCHED[@]} -gt 0 ]]; then
  echo ""
  echo "WARNING: The following components were not found and will be skipped:"
  for u in "${UNMATCHED[@]}"; do
    echo "  - $u"
  done
fi
```

## Step 5: Build new image references

```bash
echo ""
echo "=== Preparing Image Overrides ==="
echo ""

PATCHES=()

for entry in "${MATCHED[@]}"; do
  COMPONENT="${entry%%|*}"
  RELATED_NAME="${entry##*|}"

  NEW_IMAGE="${REGISTRY}/${COMPONENT}:${TAG}"

  CURRENT_IMAGE=$(echo "$CSV_JSON" | jq -r --arg name "$RELATED_NAME" \
    '.spec.relatedImages[] | select(.name == $name) | .image' 2>/dev/null)

  echo "Component:     $COMPONENT"
  echo "  relatedImage: $RELATED_NAME"
  echo "  Current:      $CURRENT_IMAGE"
  echo "  New:          $NEW_IMAGE"
  echo ""

  PATCHES+=("$RELATED_NAME|$NEW_IMAGE|$CURRENT_IMAGE")
done

echo "Target registry: $REGISTRY"
echo "Target tag:      $TAG"
echo ""
```

## Step 6: Patch CSV relatedImages

```bash
echo "=== Patching CSV relatedImages ==="

for patch_entry in "${PATCHES[@]}"; do
  IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"

  INDEX=$(echo "$CSV_JSON" | jq -r --arg name "$REL_NAME" \
    '[.spec.relatedImages[] | .name] | to_entries[] | select(.value == $name) | .key')

  if [[ -n "$INDEX" ]]; then
    oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type=json \
      -p "[{\"op\": \"replace\", \"path\": \"/spec/relatedImages/$INDEX/image\", \"value\": \"$NEW_IMG\"}]"
    echo "Patched relatedImage[$INDEX] ($REL_NAME) -> $NEW_IMG"
  else
    echo "WARNING: Could not find index for $REL_NAME, skipping relatedImage patch"
  fi
done

echo ""
```

Re-fetch CSV JSON after patches before Step 7 if subsequent logic depends on fresh state (recommended):

```bash
CSV_JSON=$(oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json)
```

## Step 7: Patch operator deployment env vars in the CSV

The operator reads component images from **`env`** entries in the CSV’s embedded deployment spec (often `RELATED_IMAGE_*` names). Match by **old image value** first, then derived name.

```bash
echo "=== Patching Operator Deployment Env Vars in CSV ==="

for patch_entry in "${PATCHES[@]}"; do
  IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"

  ENV_INDEX=$(echo "$CSV_JSON" | jq -r --arg old "$OLD_IMG" \
    '[.spec.install.spec.deployments[0].spec.template.spec.containers[0].env[] | .value] | to_entries[] | select(.value == $old) | .key' 2>/dev/null | head -1)

  if [[ -n "$ENV_INDEX" ]]; then
    ENV_NAME=$(echo "$CSV_JSON" | jq -r \
      ".spec.install.spec.deployments[0].spec.template.spec.containers[0].env[$ENV_INDEX].name")

    oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type=json \
      -p "[{\"op\": \"replace\", \"path\": \"/spec/install/spec/deployments/0/spec/template/spec/containers/0/env/$ENV_INDEX/value\", \"value\": \"$NEW_IMG\"}]"
    echo "Patched env var $ENV_NAME -> $NEW_IMG"
  else
    DERIVED_ENV="RELATED_IMAGE_$(echo "$REL_NAME" | tr '[:lower:]-' '[:upper:]_' | sed 's/_IMAGE$//')"
    ENV_INDEX=$(echo "$CSV_JSON" | jq -r --arg env "$DERIVED_ENV" \
      '[.spec.install.spec.deployments[0].spec.template.spec.containers[0].env[] | .name] | to_entries[] | select(.value == $env) | .key' 2>/dev/null | head -1)

    if [[ -n "$ENV_INDEX" ]]; then
      oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type=json \
        -p "[{\"op\": \"replace\", \"path\": \"/spec/install/spec/deployments/0/spec/template/spec/containers/0/env/$ENV_INDEX/value\", \"value\": \"$NEW_IMG\"}]"
      echo "Patched env var $DERIVED_ENV -> $NEW_IMG"
    else
      echo "WARNING: Could not find env var for $REL_NAME — operator may not pick up the override automatically"
      echo "  You may need to patch the component deployment directly (see Troubleshooting)"
    fi
  fi
done

echo ""
```

## Step 8: Restart operator and wait for rollout

```bash
echo "=== Restarting Operator to Apply New Images ==="

sleep 10

oc rollout restart deployment "$OPERATOR_DEPLOY" -n "$OPERATOR_NS" 2>/dev/null || {
  echo "Could not restart operator deployment directly, trying alternative names..."
  oc rollout restart deployment -n "$OPERATOR_NS" -l olm.owner="$CSV_NAME" 2>/dev/null || true
}

echo "Waiting for operator rollout to complete..."

TIMEOUT=180
INTERVAL=10
ELAPSED=0

while [[ $ELAPSED -lt $TIMEOUT ]]; do
  READY=$(oc get deployment "$OPERATOR_DEPLOY" -n "$OPERATOR_NS" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  DESIRED=$(oc get deployment "$OPERATOR_DEPLOY" -n "$OPERATOR_NS" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

  if [[ "$READY" -ge "$DESIRED" && "$READY" -gt 0 ]]; then
    echo "Operator deployment ready ($READY/$DESIRED)"
    break
  fi

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
  echo "Waiting for operator... ($READY/$DESIRED ready, ${ELAPSED}s/${TIMEOUT}s)"
done

if [[ "$READY" -lt "$DESIRED" ]]; then
  echo "WARNING: Operator not fully ready after ${TIMEOUT}s"
fi
```

## Step 9: Wait for component reconciliation

```bash
echo ""
echo "=== Waiting for Component Reconciliation ==="
echo ""

sleep 30

ALL_DEPLOYS_JSON=$(oc get deployments -n "$APPS_NS" -o json 2>/dev/null)

TIMEOUT=300
INTERVAL=15
ELAPSED=0

while [[ $ELAPSED -lt $TIMEOUT ]]; do
  ALL_DONE=true
  ALL_DEPLOYS_JSON=$(oc get deployments -n "$APPS_NS" -o json 2>/dev/null)

  for patch_entry in "${PATCHES[@]}"; do
    IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"

    DEPLOY_USING=$(echo "$ALL_DEPLOYS_JSON" | jq -r --arg img "$NEW_IMG" \
      '.items[] | select(
        (.spec.template.spec.containers[]?.image == $img) or
        (.spec.template.spec.initContainers[]?.image == $img)
      ) | .metadata.name' 2>/dev/null | head -1)

    if [[ -z "$DEPLOY_USING" ]]; then
      ALL_DONE=false
    fi
  done

  if [[ "$ALL_DONE" == "true" ]]; then
    echo "All overridden components reconciled."
    break
  fi

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
  echo "Waiting for component deployments to update... (${ELAPSED}s/${TIMEOUT}s)"
done
```

## Step 10: Verify pod / deployment images

```bash
echo ""
echo "=== Verification: Pod Image Check ==="
echo ""

PASS=0
FAIL=0

ALL_DEPLOYS_JSON=$(oc get deployments -n "$APPS_NS" -o json 2>/dev/null)

for patch_entry in "${PATCHES[@]}"; do
  IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"
  COMPONENT_SHORT=$(echo "$NEW_IMG" | sed 's|.*/||' | sed 's|:.*||')

  echo "--- $COMPONENT_SHORT ---"

  MATCH=$(echo "$ALL_DEPLOYS_JSON" | jq -r --arg img "$NEW_IMG" '
    .items[] |
    . as $deploy |
    (
      (.spec.template.spec.containers[] | select(.image == $img) | {deploy: $deploy.metadata.name, container: .name, image: .image}),
      (.spec.template.spec.initContainers[]? | select(.image == $img) | {deploy: $deploy.metadata.name, container: .name, image: .image})
    ) | "\(.deploy)|\(.container)|\(.image)"
  ' 2>/dev/null | head -1)

  if [[ -z "$MATCH" ]]; then
    MATCH=$(echo "$ALL_DEPLOYS_JSON" | jq -r --arg comp "$COMPONENT_SHORT" '
      .items[] |
      . as $deploy |
      .spec.template.spec.containers[] |
      select(.image | contains($comp)) |
      "\($deploy.metadata.name)|\(.name)|\(.image)"
    ' 2>/dev/null | head -1)
  fi

  if [[ -z "$MATCH" ]]; then
    echo "  WARNING: No container found using $COMPONENT_SHORT"
    echo "  The operator may not have reconciled yet."
    FAIL=$((FAIL + 1))
    continue
  fi

  IFS='|' read -r DEPLOY_NAME CONTAINER_NAME ACTUAL_IMAGE <<< "$MATCH"

  POD_NAME=$(oc get pods -n "$APPS_NS" -l app="$DEPLOY_NAME" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  POD_STATUS=""
  CONTAINER_READY=""

  if [[ -n "$POD_NAME" ]]; then
    POD_STATUS=$(oc get pod "$POD_NAME" -n "$APPS_NS" \
      -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
    CONTAINER_READY=$(oc get pod "$POD_NAME" -n "$APPS_NS" \
      -o jsonpath="{.status.containerStatuses[?(@.name==\"$CONTAINER_NAME\")].ready}" 2>/dev/null || echo "unknown")
  fi

  if [[ "$ACTUAL_IMAGE" == "$NEW_IMG" ]]; then
    echo "  PASS: Deployment $DEPLOY_NAME, container $CONTAINER_NAME"
    echo "    Image: $ACTUAL_IMAGE"
    echo "    Pod: ${POD_STATUS:-Unknown}, container ready: ${CONTAINER_READY:-unknown}"
    PASS=$((PASS + 1))
  else
    echo "  PENDING: Deployment $DEPLOY_NAME, container $CONTAINER_NAME"
    echo "    Expected: $NEW_IMG"
    echo "    Actual:   $ACTUAL_IMAGE"
    echo "    Pod: ${POD_STATUS:-Unknown}"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "=== Verification Summary ==="
echo "  PASS: $PASS"
echo "  PENDING/FAIL: $FAIL"
```

## Step 11: Check for image pull errors

```bash
echo ""
echo "=== Checking for Image Pull Errors ==="

PULL_ERRORS=$(oc get pods -n "$APPS_NS" -o json 2>/dev/null | \
  jq -r '.items[] | select(.status.containerStatuses[]?.state.waiting.reason == "ImagePullBackOff" or .status.containerStatuses[]?.state.waiting.reason == "ErrImagePull") | .metadata.name' 2>/dev/null)

if [[ -n "$PULL_ERRORS" ]]; then
  echo "WARNING: Pods with image pull errors detected:"
  for pod in $PULL_ERRORS; do
    IMAGE=$(oc get pod "$pod" -n "$APPS_NS" -o jsonpath='{.spec.containers[0].image}' 2>/dev/null)
    echo "  $pod -> $IMAGE"
  done
  echo ""
  echo "This may indicate the image tag does not exist on the registry."
  echo "Verify the images exist:"
  for patch_entry in "${PATCHES[@]}"; do
    IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"
    echo "  skopeo inspect docker://$NEW_IMG"
  done
else
  echo "No image pull errors detected."
fi
```

## Step 12: Summary

```bash
echo ""
echo "=========================================="
echo "  Image Override Summary"
echo "=========================================="
echo ""
echo "Operator:  $CSV_NAME"
echo "Namespace: $OPERATOR_NS"
echo "Registry:  $REGISTRY"
echo "Tag:       $TAG"
echo ""
echo "Overridden Components:"

for patch_entry in "${PATCHES[@]}"; do
  IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"
  echo "  $REL_NAME"
  echo "    Was: $OLD_IMG"
  echo "    Now: $NEW_IMG"
done

echo ""

if [[ $FAIL -eq 0 ]]; then
  echo "All components verified — pods are pulling the expected tag-based images."
else
  echo "$FAIL component(s) not yet verified."
  echo "The operator may still be reconciling; re-check deployments and pods."
fi

echo ""
echo "NOTE: These overrides persist until the next operator upgrade replaces this CSV."
echo "Catalog-driven operator updates reset pinned images; re-apply overrides if needed."
```

---

## Important notes

- **CSV patching** is invasive; only use on clusters where that is acceptable.
- **`quay.io/opendatahub/<component>:<tag>`** must exist and be pullable (or use `--registry`).
- Works for **RHOAI** (`redhat-ods-operator`) and **ODH** (`openshift-operators`) as in Step 2.

## Troubleshooting

| Problem | What to do |
|--------|------------|
| **ImagePullBackOff** | `skopeo inspect docker://$NEW_IMG` (or `crane` / registry UI) to confirm the tag exists. |
| **Deployment not updating** | If Step 7 warned about env vars: `oc set image deployment/<deploy> <container>=${REGISTRY}/${COMPONENT}:${TAG} -n "$APPS_NS"` (use real names from `oc get deploy -n "$APPS_NS" -o yaml`). |
| **DSC degraded** | Inspect operator and component logs, e.g. `oc logs -n "$APPS_NS" "deployment/$DEPLOY_NAME" -c "$CONTAINER_NAME" --tail=50`. |
