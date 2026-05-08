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
3. If the user invokes **`use-odh-main` with no arguments**, run Step 1 only: the script prints **example commands** and exits (no cluster changes). Same examples are documented under **Example commands**; **`--help`** prints them and exits successfully.
4. After `--list`, **stop** after Step 3’s list branch.
5. If any step warns that env vars could not be patched, surface the **manual `oc set image` fallback** from Troubleshooting.

---

## Command usage (equivalent flags)

- `COMPONENTS...` — image/repo component names (e.g. `odh-mod-arch-automl`, `odh-dashboard-rhel9`)
- `--list` — print `relatedImages` and exit
- `--registry REGISTRY` — default `quay.io/opendatahub`
- `--tag TAG` — default `main`
- `--help` / `-h` — print the examples below and exit (success)

### Example commands

Run these as the argument list to the Step 1 script (or teach the user the same invocations). Names must match CSV `relatedImage` repository basenames; use `--list` first if unsure.

```text
# Discover image basenames in the current CSV (no cluster mutation)
use-odh-main --list

# Override one component to quay.io/opendatahub/<name>:main (defaults)
use-odh-main odh-dashboard-rhel9

# Override several gen-ai–related components at once
use-odh-main odh-mod-arch-automl odh-mod-arch-autorag

# Same defaults, explicit registry and tag
use-odh-main --registry quay.io/opendatahub --tag main odh-gen-ai-controller-rhel9

# Custom tag on the default registry layout
use-odh-main --tag nightly odh-dashboard-rhel9

# Help only (prints this style of usage and exits 0)
use-odh-main --help
```

If the user runs **`use-odh-main` with no arguments** (and not `--list` / `--help`), the Step 1 script **prints the same example block** and exits with a non-zero status so the agent does not continue without components.

### RHOAI: point the dashboard at ODH `main`

RHOAI CSVs usually pin the dashboard image under a repository basename like **`odh-dashboard-rhel9`** (see `--list`). Step 4 matches that **basename exactly**, and Step 5 sets the override to **`${REGISTRY}/${COMPONENT}:${TAG}`** (e.g. `quay.io/opendatahub/odh-dashboard-rhel9:main`).

- If that Quay repo/tag exists for your workflow, run with that basename, for example:  
  `use-odh-main --registry quay.io/opendatahub --tag main odh-dashboard-rhel9`
- Community builds often publish **`quay.io/opendatahub/odh-dashboard:main`** only. This skill does **not** remap `odh-dashboard-rhel9` → `odh-dashboard`; in that case use **`--list`** to confirm names, then either confirm the `-rhel9` image on Quay or apply a **one-off `oc patch` / `oc set image`** to the exact reference you need (see Troubleshooting).

---

## Step 1: Parse input arguments

```bash
COMPONENTS=()
REGISTRY="quay.io/opendatahub"
TAG="main"
LIST_ONLY=false
WANT_HELP=false

print_use_odh_main_examples() {
  cat <<'EOF'
Example commands (pass as script args, or run equivalent oc workflow):

  use-odh-main --list
  use-odh-main odh-dashboard-rhel9
  use-odh-main odh-mod-arch-automl odh-mod-arch-autorag
  use-odh-main --registry quay.io/opendatahub --tag main odh-gen-ai-controller-rhel9
  use-odh-main --tag nightly odh-dashboard-rhel9
  use-odh-main --help

Flags:
  --list              Print relatedImages from the CSV and exit
  --registry REGISTRY Default quay.io/opendatahub
  --tag TAG           Default main
  --help, -h          Print this message and exit 0

Components are CSV relatedImage repository basenames; run with --list to see names.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      WANT_HELP=true
      shift
      ;;
    --list)
      LIST_ONLY=true
      shift
      ;;
    --registry)
      if [[ $# -lt 2 ]]; then echo "ERROR: --registry requires a value"; exit 1; fi
      REGISTRY="$2"
      shift 2
      ;;
    --tag)
      if [[ $# -lt 2 ]]; then echo "ERROR: --tag requires a value"; exit 1; fi
      TAG="$2"
      shift 2
      ;;
    *)
      COMPONENTS+=("$1")
      shift
      ;;
  esac
done

# Deduplicate components (preserve order)
_COMPONENTS_DEDUPED=()
for _c in "${COMPONENTS[@]}"; do
  _dup=false
  for _e in "${_COMPONENTS_DEDUPED[@]}"; do
    if [[ "$_c" == "$_e" ]]; then _dup=true; break; fi
  done
  if [[ "$_dup" == "false" ]]; then _COMPONENTS_DEDUPED+=("$_c"); fi
done
COMPONENTS=("${_COMPONENTS_DEDUPED[@]}")

if [[ "$WANT_HELP" == "true" ]]; then
  print_use_odh_main_examples
  exit 0
fi

validate_image_ref_part() {
  local val="$1" what="$2"
  if [[ -z "$val" ]]; then echo "ERROR: $what is empty"; exit 1; fi
  if [[ "$val" == *$'\n'* || "$val" == *$'\r'* ]]; then echo "ERROR: $what must not contain newlines"; exit 1; fi
  if [[ "$val" == *'|'* ]]; then echo "ERROR: $what must not contain '|' (used as delimiter internally)"; exit 1; fi
  if [[ "$val" == *'"'* || "$val" == *'\'* ]]; then echo "ERROR: $what must not contain quotes or backslashes"; exit 1; fi
}

if [[ "$LIST_ONLY" == "false" ]]; then
  validate_image_ref_part "$REGISTRY" "--registry"
  validate_image_ref_part "$TAG" "--tag"
  for _c in "${COMPONENTS[@]}"; do
    validate_image_ref_part "$_c" "component name ($_c)"
  done
fi

if [[ "$LIST_ONLY" == "false" && ${#COMPONENTS[@]} -eq 0 ]]; then
  echo "ERROR: No components specified. Use --list to inspect the CSV, or pass one or more component basenames."
  echo ""
  print_use_odh_main_examples
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
  CSV_NAME=$(oc get csv -n "$OPERATOR_NS" -o json 2>/dev/null | jq -r '
    ([.items[] | select(.metadata.name | test("rhods-operator"))]
      | sort_by(.metadata.creationTimestamp) | reverse) as $all
    | ($all | map(select((.status.phase // "") == "Succeeded")) | .[0] // empty)
      // ($all[0] // empty)
    | .metadata.name // empty')
  OPERATOR_DEPLOY="rhods-operator"
  APPS_NS="redhat-ods-applications"
  echo "Detected RHOAI operator: $CSV_NAME in $OPERATOR_NS"
elif oc get csv -n openshift-operators 2>/dev/null | grep -q opendatahub-operator; then
  OPERATOR_NS="openshift-operators"
  CSV_NAME=$(oc get csv -n "$OPERATOR_NS" -o json 2>/dev/null | jq -r '
    ([.items[] | select(.metadata.name | test("opendatahub-operator"))]
      | sort_by(.metadata.creationTimestamp) | reverse) as $all
    | ($all | map(select((.status.phase // "") == "Succeeded")) | .[0] // empty)
      // ($all[0] // empty)
    | .metadata.name // empty')
  OPERATOR_DEPLOY="opendatahub-operator-controller-manager"
  APPS_NS="opendatahub"
  echo "Detected ODH operator: $CSV_NAME in $OPERATOR_NS"
else
  echo "ERROR: Neither RHOAI nor ODH operator found. Install one first."
  exit 1
fi

if [[ -z "$CSV_NAME" ]]; then
  echo "ERROR: Could not resolve a ClusterServiceVersion name in $OPERATOR_NS."
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
  # Match image repository basename exactly (avoids odh-dashboard matching odh-dashboard-oauth)
  RELATED_NAME=$(echo "$CSV_JSON" | jq -r --arg comp "$COMPONENT" '
    def image_repo: (. | split("/") | last | split(":")[0]);
    .spec.relatedImages[]? | select((.image | image_repo) == $comp) | .name' 2>/dev/null | head -1)

  if [[ -z "$RELATED_NAME" ]]; then
    RELATED_NAME=$(echo "$CSV_JSON" | jq -r --arg comp "$COMPONENT" '
      .spec.relatedImages[]?
      | select((.name | gsub("-"; "_")) == ($comp | gsub("-"; "_")))
      | .name' 2>/dev/null | head -1)
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

Build one JSON Patch payload so relatedImages updates apply atomically (avoids a half-updated CSV if a later `oc patch` fails).

```bash
echo "=== Patching CSV relatedImages ==="

REL_PATCH_OPS=$(jq -n '[]')

for patch_entry in "${PATCHES[@]}"; do
  IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"

  INDEX=$(echo "$CSV_JSON" | jq -r --arg name "$REL_NAME" \
    '[.spec.relatedImages[]? | .name] | to_entries[] | select(.value == $name) | .key' | head -1)

  if [[ -n "$INDEX" && "$INDEX" =~ ^[0-9]+$ ]]; then
    REL_PATCH_OPS=$(jq -n --argjson ops "$REL_PATCH_OPS" --argjson idx "$INDEX" --arg img "$NEW_IMG" \
      '$ops + [{op:"replace", path: ("/spec/relatedImages/" + ($idx | tostring) + "/image"), value: $img}]')
    echo "Queued relatedImage[$INDEX] ($REL_NAME) -> $NEW_IMG"
  else
    echo "WARNING: Could not find a unique numeric index for $REL_NAME, skipping relatedImage patch"
  fi
done

if [[ $(echo "$REL_PATCH_OPS" | jq 'length') -gt 0 ]]; then
  oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type=json -p "$REL_PATCH_OPS"
  echo "Applied relatedImages patch ($(echo "$REL_PATCH_OPS" | jq 'length') operation(s))."
else
  echo "WARNING: No relatedImages patch operations to apply."
fi

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

# Search all embedded deployments/containers (not only [0]) so this survives CSV layout changes.
ENV_PATCH_OPS=$(jq -n '[]')

for patch_entry in "${PATCHES[@]}"; do
  IFS='|' read -r REL_NAME NEW_IMG OLD_IMG <<< "$patch_entry"

  LOC=$(echo "$CSV_JSON" | jq -c --arg old "$OLD_IMG" '
    [.spec.install.spec.deployments // [] | to_entries[] |
      .key as $di |
      .value.spec.template.spec.containers // [] | to_entries[] |
      .key as $ci |
      (.value.env // []) | to_entries[] |
      select(.value.value == $old) |
      {di: $di, ci: $ci, ei: .key, envName: .value.name}
    ] | .[0] // empty' 2>/dev/null)

  if [[ -z "$LOC" || "$LOC" == "null" ]]; then
    DERIVED_ENV="RELATED_IMAGE_$(echo "$REL_NAME" | tr '[:lower:]-' '[:upper:]_' | sed 's/_IMAGE$//')"
    LOC=$(echo "$CSV_JSON" | jq -c --arg env "$DERIVED_ENV" '
      [.spec.install.spec.deployments // [] | to_entries[] |
        .key as $di |
        .value.spec.template.spec.containers // [] | to_entries[] |
        .key as $ci |
        (.value.env // []) | to_entries[] |
        select(.value.name == $env) |
        {di: $di, ci: $ci, ei: .key, envName: .value.name}
      ] | .[0] // empty' 2>/dev/null)
  fi

  if [[ -n "$LOC" && "$LOC" != "null" ]]; then
    DI=$(echo "$LOC" | jq -r '.di')
    CI=$(echo "$LOC" | jq -r '.ci')
    EI=$(echo "$LOC" | jq -r '.ei')
    ENV_NAME=$(echo "$LOC" | jq -r '.envName // empty')
    if [[ "$DI" =~ ^[0-9]+$ && "$CI" =~ ^[0-9]+$ && "$EI" =~ ^[0-9]+$ ]]; then
      ENV_PATCH_OPS=$(jq -n --argjson ops "$ENV_PATCH_OPS" --argjson loc "$LOC" --arg img "$NEW_IMG" '
        $ops + [{
          op: "replace",
          path: (
            "/spec/install/spec/deployments/" + ($loc.di | tostring)
            + "/spec/template/spec/containers/" + ($loc.ci | tostring)
            + "/env/" + ($loc.ei | tostring) + "/value"
          ),
          value: $img
        }]')
      echo "Queued env $ENV_NAME (deployments[$DI].containers[$CI].env[$EI]) -> $NEW_IMG"
    else
      echo "WARNING: Invalid env location for $REL_NAME (di=$DI ci=$CI ei=$EI); skipping"
    fi
  else
    echo "WARNING: Could not find env var for $REL_NAME — operator may not pick up the override automatically"
    echo "  You may need to patch the component deployment directly (see Troubleshooting)"
  fi
done

if [[ $(echo "$ENV_PATCH_OPS" | jq 'length') -gt 0 ]]; then
  oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type=json -p "$ENV_PATCH_OPS"
  echo "Applied operator env patch ($(echo "$ENV_PATCH_OPS" | jq 'length') operation(s))."
else
  echo "WARNING: No operator env patch operations to apply."
fi

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
      def image_repo: (. | split("/") | last | split(":")[0]);
      .items[] |
      . as $deploy |
      .spec.template.spec.containers[] |
      select(.image | image_repo == $comp) |
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

  POD_SELECTOR=$(oc get deployment "$DEPLOY_NAME" -n "$APPS_NS" -o json 2>/dev/null | jq -r '
    [.spec.selector.matchLabels // {} | to_entries[] | "\(.key)=\(.value)")]
    | join(",")')
  POD_NAME=""
  if [[ -n "$POD_SELECTOR" ]]; then
    POD_NAME=$(oc get pods -n "$APPS_NS" -l "$POD_SELECTOR" \
      -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  fi
  if [[ -z "$POD_NAME" ]]; then
    POD_NAME=$(oc get pods -n "$APPS_NS" -l "app=$DEPLOY_NAME" \
      -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  fi

  POD_STATUS=""
  CONTAINER_READY=""
  if [[ -n "$POD_NAME" ]]; then
    POD_JSON=$(oc get pod "$POD_NAME" -n "$APPS_NS" -o json 2>/dev/null || echo "")
    if [[ -n "$POD_JSON" ]]; then
      POD_STATUS=$(echo "$POD_JSON" | jq -r '.status.phase // "Unknown"')
      CONTAINER_READY=$(echo "$POD_JSON" | jq -r --arg cn "$CONTAINER_NAME" '
        ((.status.containerStatuses // [])[] | select(.name == $cn) | .ready) // false' | head -1)
    fi
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

PULL_LINES=$(oc get pods -n "$APPS_NS" -o json 2>/dev/null | jq -r '
  .items[] | . as $pod |
  (($pod.spec.containers // []) + ($pod.spec.initContainers // [])) as $specs |
  ($pod.status.containerStatuses // [])[] |
  select((.state.waiting.reason // "") == "ImagePullBackOff" or (.state.waiting.reason // "") == "ErrImagePull") |
  .name as $cn |
  ($specs[] | select(.name == $cn) | .image) as $img |
  "  \($pod.metadata.name)  container=\($cn)  image=\($img)  reason=\(.state.waiting.reason)"' 2>/dev/null)

if [[ -n "$PULL_LINES" ]]; then
  echo "WARNING: Pods with image pull errors detected:"
  echo "$PULL_LINES"
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
- **`quay.io/opendatahub/<component>:<tag>`** must exist and be pullable (or use `--registry`). The `<component>` segment is whatever matches the CSV `relatedImage` **repository basename** (often **`odh-dashboard-rhel9`** on RHOAI, not `odh-dashboard`); see **RHOAI: point the dashboard at ODH `main`** above.
- Works for **RHOAI** (`redhat-ods-operator`) and **ODH** (`openshift-operators`) as in Step 2.

## Troubleshooting

| Problem | What to do |
|--------|------------|
| **ImagePullBackOff** | `skopeo inspect docker://$NEW_IMG` (or `crane` / registry UI) to confirm the tag exists. |
| **Deployment not updating** | If Step 7 warned about env vars: `oc set image deployment/<deploy> <container>=${REGISTRY}/${COMPONENT}:${TAG} -n "$APPS_NS"` (use real names from `oc get deploy -n "$APPS_NS" -o yaml`). |
| **DSC degraded** | Inspect operator and component logs, e.g. `oc logs -n "$APPS_NS" "deployment/$DEPLOY_NAME" -c "$CONTAINER_NAME" --tail=50`. |
