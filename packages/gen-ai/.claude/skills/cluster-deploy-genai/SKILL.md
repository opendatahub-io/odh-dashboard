---
name: cluster-deploy-genai
description: >-
  Builds and deploys the gen-ai sidecar container to a personal OpenShift cluster
  for testing. Handles frontend build, Go BFF cross-compile, Podman image
  build/push to quay.io, and deployment patching. Supports both initial deploy
  and fast iteration (rebuild + pod delete). Use when the user wants to test
  local gen-ai changes on a real (dev) cluster.
argument-hint: "press Enter — you'll be prompted for any parameters needed"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Cluster Deploy Gen-AI

Build and deploy the gen-ai sidecar container to a personal OpenShift cluster for testing local changes.

## Scope

Staged under `packages/gen-ai/.claude/skills/` for gen-ai team testing. Only replaces the gen-ai sidecar container (`gen-ai-ui`) in the `odh-dashboard` deployment — does not rebuild the full dashboard.

## When to use this vs Jenkins

**This skill** — fast iteration on gen-ai package changes:
- Only replaces the gen-ai sidecar container, not the full dashboard
- Builds from local — changes don't need to be pushed to a branch
- Faster redeploy cycle after initial setup

**Jenkins (rhoai-test-flow)** — full dashboard rebuild:
- Rebuilds the entire odh-dashboard (host frontend, backend, and all sidecar containers)
- Needed when changes span the host or multiple packages
- Can trigger tests on the build

## Background

The gen-ai package runs as a sidecar container (`gen-ai-ui`) in the `odh-dashboard` deployment. To test branch changes in a real cluster, we build a custom image and patch the operator's CSV to deploy it. The operator reads `RELATED_IMAGE_*` env vars from its process environment (set via the CSV deployment spec) and uses them to override the default images in its built-in `params.env`. By patching the CSV (Cluster Service Version), OLM (Operator Lifecycle Manager) restarts the operator pod with the new env var, and the operator reconciles the dashboard deployment with our custom image — no operator scale-down needed.

**Why build the frontend/BFF outside of the Docker container?** If we use the gen-ai Dockerfile on ARM and build with podman, because it runs `go build` inside a linux/amd64 container (via QEMU emulation with podman), it deadlocks Go's networking goroutines during `go mod download`. Docker buildx may avoid that bug, but it requires installing/running Docker Engine separately (can't use Docker Desktop due to licensing). So we build the frontend/backend natively on the host and use a COPY-only Dockerfile with `podman build --platform linux/amd64` to produce the final image. This approach is faster for development vs building inside the container.

**Not a substitute for CI Docker builds** — this skill cross-compiles Go locally with `CGO_ENABLED=0` (no FIPS flags) and uses a minimal COPY-only Dockerfile, not the production `Dockerfile.workspace`. It's faster for iteration but won't catch issues in the real multi-stage Docker build (e.g., broken Dockerfile steps, missing build args, CGo/FIPS-related failures). Rely on CI for production build validation.

## Phase 1: Check prerequisites and gather parameters

### Prerequisites

Before starting, verify these are in place. If any fail, stop and tell the user what's missing.

```bash
# Podman installed and machine running
podman version
podman machine info

# Logged into quay.io
podman login --get-login quay.io

# Logged into OpenShift cluster
oc whoami
oc whoami --show-server

# jq (required for CSV patching)
jq --version

# Go >= 1.24
go version

# Node >= 22
node --version

# npm deps installed (check for node_modules at repo root)
ls node_modules/.package-lock.json
```

### Gather parameters

Ask the user for:

1. **Quay.io username** — used in the image path `quay.io/<user>/odh-mod-arch-gen-ai:<tag>`
2. **Image tag** — default `dev`. Mention the user can alternatively use a tag based on their current branch name (e.g., the output of `git rev-parse --abbrev-ref HEAD`)
3. **What to rebuild** — options: "Both frontend and BFF" (default), "Frontend only", or "BFF only". This lets users skip rebuilding the part they didn't change for faster iteration.

### Auto-detect target namespace

Do NOT ask the user — determine it from the installed operator:

Find the operator by its **deployment** (authoritative), not by CSV alone — OLM copies CSVs to multiple namespaces, but the deployment only exists in one:

```bash
if oc get deployment rhods-operator -n redhat-ods-operator 2>/dev/null | grep -q rhods-operator; then
  APPS_NS="redhat-ods-applications"
  OPERATOR_NS="redhat-ods-operator"
  OPERATOR_DEPLOY="rhods-operator"
  echo "Detected RHOAI — namespace: $APPS_NS"
elif oc get deployment opendatahub-operator-controller-manager -n openshift-operators 2>/dev/null | grep -q opendatahub; then
  APPS_NS="opendatahub"
  OPERATOR_NS="openshift-operators"
  OPERATOR_DEPLOY="opendatahub-operator-controller-manager"
  echo "Detected ODH (openshift-operators) — namespace: $APPS_NS"
elif oc get deployment opendatahub-operator-controller-manager -n opendatahub 2>/dev/null | grep -q opendatahub; then
  APPS_NS="opendatahub"
  OPERATOR_NS="opendatahub"
  OPERATOR_DEPLOY="opendatahub-operator-controller-manager"
  echo "Detected ODH (opendatahub) — namespace: $APPS_NS"
else
  echo "ERROR: Neither RHOAI nor ODH operator found."
  exit 1
fi
```

Use `$APPS_NS` as the namespace for all deployment operations. Use `$OPERATOR_NS` and `$CSV_NAME` for patching the operator CSV.

### Auto-detect the CSV name

Resolve the active CSV in the operator namespace:

```bash
if [[ "$OPERATOR_NS" == "redhat-ods-operator" ]]; then
  CSV_NAME=$(oc get csv -n "$OPERATOR_NS" -o json 2>/dev/null | jq -r '
    ([.items[] | select(.metadata.name | test("rhods-operator"))]
      | sort_by(.metadata.creationTimestamp) | reverse) as $all
    | ($all | map(select((.status.phase // "") == "Succeeded")) | .[0] // empty)
      // ($all[0] // empty)
    | .metadata.name // empty')
else
  CSV_NAME=$(oc get csv -n "$OPERATOR_NS" -o json 2>/dev/null | jq -r '
    ([.items[] | select(.metadata.name | test("opendatahub-operator"))]
      | sort_by(.metadata.creationTimestamp) | reverse) as $all
    | ($all | map(select((.status.phase // "") == "Succeeded")) | .[0] // empty)
      // ($all[0] // empty)
    | .metadata.name // empty')
fi
echo "CSV: $CSV_NAME"
```

### Auto-detect deploy mode

Do NOT ask the user — determine it automatically by inspecting the current container image:

```bash
CURRENT_IMAGE=$(oc get deployment/odh-dashboard -n $APPS_NS \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="gen-ai-ui")].image}')
```

- If `$CURRENT_IMAGE` contains the user's quay username → **iteration** mode (just rebuild/push + delete pod)
- Otherwise → **initial deploy** mode (patch CSV env var, restart operator, wait for rollout)

### Derived values

- Image: `quay.io/<user>/odh-mod-arch-gen-ai:<tag>`
- Container name in deployment: `gen-ai-ui`
- Frontend path: `packages/gen-ai/frontend`
- BFF path: `packages/gen-ai/bff`

## Phase 2: Build

Run all commands from the **repo root** (`odh-dashboard/`).

Based on the user's "what to rebuild" choice, skip Step 1 and/or Step 2. However, the Dockerfile COPYs both `bff-linux-amd64` and `frontend/dist/` — if either artifact is missing, `podman build` will fail. So before skipping a step, check that the other artifact exists from a prior build:

- Skipping frontend → check `packages/gen-ai/frontend/dist/` exists
- Skipping BFF → check `packages/gen-ai/bff/bff-linux-amd64` exists

If the required artifact is missing, tell the user both need to be built (first-time deploy) and build both.

### Step 1: Build the frontend (skip if "BFF only")

```bash
cd packages/gen-ai/frontend && npm run build:prod
```

Output goes to `packages/gen-ai/frontend/dist/`.

### Step 2: Cross-compile the Go BFF (skip if "Frontend only")

```bash
cd packages/gen-ai/bff && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bff-linux-amd64 ./cmd
```

### Step 3: Create `Dockerfile.dev-deploy` if missing

Check if `packages/gen-ai/Dockerfile.dev-deploy` exists. If not, create it:

```bash
cat > packages/gen-ai/Dockerfile.dev-deploy << 'EOF'
# Minimal Dockerfile for dev deployment — pre-built artifacts only, no RUN steps
FROM registry.access.redhat.com/ubi9-minimal:latest

WORKDIR /
COPY packages/gen-ai/bff/bff-linux-amd64 ./bff
COPY packages/gen-ai/bff/openapi/ ./openapi/
COPY packages/gen-ai/frontend/dist/ ./static/
USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/bff"]
EOF
```

### Step 4: Build the container image

From the repo root:

```bash
podman build --platform linux/amd64 \
  --file ./packages/gen-ai/Dockerfile.dev-deploy \
  -t quay.io/<user>/odh-mod-arch-gen-ai:<tag> .
```

### Step 5: Push the image

```bash
podman push quay.io/<user>/odh-mod-arch-gen-ai:<tag>
```

Remind the user: the quay.io repository must be set to **public**, or the cluster won't be able to pull it. (New quay.io repos default to private.)

## Phase 3: Deploy

Use `$OPERATOR_NS`, `$CSV_NAME`, and `$APPS_NS` from the auto-detect step throughout this phase.

### How it works

The operator continuously reconciles the `odh-dashboard` deployment. Patching the deployment image directly with `oc set image` gets reverted within seconds. Instead, we patch the operator's own CSV to set a `RELATED_IMAGE_*` environment variable — the operator reads this on startup and uses it to override the image in `params.env`. OLM propagates the CSV change to the operator deployment, the operator pod restarts, and when it reconciles it deploys *our* custom image. No operator scale-down needed.

The env var that controls the gen-ai-ui image is:

```
RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE
```

This maps to the `gen-ai-ui-image` key in the operator's `params.env` (see `dashboard_support.go` `imagesMap`).

### Initial deploy

#### Step 1: Find or add the RELATED_IMAGE env var in the CSV

The RHOAI CSV typically already has `RELATED_IMAGE_*` env vars. The ODH CSV may not. Detect and handle both:

```bash
ENV_NAME="RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE"
CUSTOM_IMAGE="quay.io/<user>/odh-mod-arch-gen-ai:<tag>"

# Find the env var location in the CSV
CSV_JSON=$(oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json)

LOC=$(echo "$CSV_JSON" | jq -c --arg env "$ENV_NAME" '
  [.spec.install.spec.deployments // [] | to_entries[] |
    .key as $di |
    .value.spec.template.spec.containers // [] | to_entries[] |
    .key as $ci |
    (.value.env // []) | to_entries[] |
    select(.value.name == $env) |
    {di: $di, ci: $ci, ei: .key}
  ] | .[0] // empty')

if [[ -n "$LOC" && "$LOC" != "null" ]]; then
  # Env var exists — replace its value
  DI=$(echo "$LOC" | jq -r '.di')
  CI=$(echo "$LOC" | jq -r '.ci')
  EI=$(echo "$LOC" | jq -r '.ei')
  oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type json -p "[{
    \"op\": \"replace\",
    \"path\": \"/spec/install/spec/deployments/$DI/spec/template/spec/containers/$CI/env/$EI/value\",
    \"value\": \"$CUSTOM_IMAGE\"
  }]"
  echo "Patched existing $ENV_NAME -> $CUSTOM_IMAGE"
else
  # Env var doesn't exist — append it to the first container of the first deployment
  oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type json -p "[{
    \"op\": \"add\",
    \"path\": \"/spec/install/spec/deployments/0/spec/template/spec/containers/0/env/-\",
    \"value\": {\"name\": \"$ENV_NAME\", \"value\": \"$CUSTOM_IMAGE\"}
  }]"
  echo "Added $ENV_NAME -> $CUSTOM_IMAGE"
fi
```

#### Step 2: Wait for the operator to restart

OLM detects the CSV deployment spec change and updates the operator deployment, triggering a rolling restart:

```bash
echo "Waiting for operator rollout..."
sleep 10
oc rollout status deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS --timeout=120s
```

#### Step 3: Trigger reconciliation and wait for dashboard rollout

```bash
# Annotate the DSC to trigger immediate reconciliation
oc annotate dsc default-dsc --overwrite "dev.deploy/trigger=$(date +%s)"

echo "Waiting for dashboard reconciliation..."
sleep 15

# Verify the image was picked up
DEPLOYED_IMAGE=$(oc get deployment/odh-dashboard -n $APPS_NS \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="gen-ai-ui")].image}')
echo "gen-ai-ui image: $DEPLOYED_IMAGE"

# Wait for rollout
oc rollout status deployment/odh-dashboard -n $APPS_NS --timeout=180s
```

If the `DEPLOYED_IMAGE` still shows the old image after 30 seconds, the reconciliation may need more time. Wait and re-check, or try annotating the DSC again.

If the rollout hangs with `ImagePullBackOff`, the quay.io repo is likely private. Fix it, then delete the pending pod to force a retry:

```bash
oc delete pod -l app=odh-dashboard -n $APPS_NS
```

### Iteration (redeploy same tag)

After the initial deploy, the operator already deploys with the custom image tag. Just rebuild, push the same tag, and delete the pod:

```bash
# Delete the pod to pull the new image
oc delete pod -l app=odh-dashboard -n $APPS_NS

# Wait for the new pod
oc rollout status deployment/odh-dashboard -n $APPS_NS
```

## Phase 4: Verify

Check that the rollout completed and show the dashboard URL:

```bash
oc rollout status deployment/odh-dashboard -n $APPS_NS
```

Get the dashboard route URL so the user can click it directly:

```bash
oc get route odh-dashboard -n $APPS_NS -o jsonpath='https://{.spec.host}'
```

Tell the user to open that URL and navigate to the gen-ai pages to confirm their changes are live.

## Reverting

Remind the user how to restore the original state when done testing. Remove the env var override from the CSV so the operator reverts to the default image from its built-in `params.env`:

```bash
# Find and remove the RELATED_IMAGE env var override from the CSV
ENV_NAME="RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE"
CSV_JSON=$(oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json)

LOC=$(echo "$CSV_JSON" | jq -c --arg env "$ENV_NAME" '
  [.spec.install.spec.deployments // [] | to_entries[] |
    .key as $di |
    .value.spec.template.spec.containers // [] | to_entries[] |
    .key as $ci |
    (.value.env // []) | to_entries[] |
    select(.value.name == $env) |
    {di: $di, ci: $ci, ei: .key}
  ] | .[0] // empty')

if [[ -n "$LOC" && "$LOC" != "null" ]]; then
  DI=$(echo "$LOC" | jq -r '.di')
  CI=$(echo "$LOC" | jq -r '.ci')
  EI=$(echo "$LOC" | jq -r '.ei')
  oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type json -p "[{
    \"op\": \"remove\",
    \"path\": \"/spec/install/spec/deployments/$DI/spec/template/spec/containers/$CI/env/$EI\"
  }]"
  echo "Removed $ENV_NAME override from CSV"
fi

# Wait for operator restart and reconciliation
sleep 10
oc rollout status deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS --timeout=120s
oc annotate dsc default-dsc --overwrite "dev.deploy/trigger=$(date +%s)"
```

For RHOAI clusters where `RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE` existed before your override, restore the original value instead of removing it. Check `oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json | jq '.spec.relatedImages[] | select(.name | test("gen-ai"))'` for the original image reference.

## Cleanup

Remove local build artifacts:

```bash
rm packages/gen-ai/bff/bff-linux-amd64
rm -f packages/gen-ai/Dockerfile.dev-deploy
```

## Troubleshooting

### Podman machine OOM (SIGKILL on webpack)

Increase podman machine memory:

```bash
podman machine stop
podman machine set --memory 8192
podman machine start
```

### Image pull errors on cluster (`ImagePullBackOff` / `unauthorized`)

New quay.io repositories default to **private**. Go to quay.io, find the repository, Settings, and set it to Public.

Then delete the failing pod to force a re-pull:

```bash
oc delete pod -l app=odh-dashboard -n $APPS_NS
```

Check events for details:

```bash
oc get events -n $APPS_NS --sort-by='.lastTimestamp' | grep -i "pull\|image"
```

### Operator reverts image change

The operator reconciles the `odh-dashboard` deployment and will revert any manual `oc set image` changes within seconds. This skill avoids the problem by patching the CSV env var so the operator itself deploys the custom image. If you see the old image reappearing, verify the CSV patch took effect:

```bash
oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json | jq -r '
  .spec.install.spec.deployments[].spec.template.spec.containers[].env[]?
  | select(.name == "RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE")
  | "\(.name)=\(.value)"'
```

If the env var is missing or has the wrong value, re-run the initial deploy patch from Phase 3.

### Operator pod doesn't restart after CSV patch

OLM should propagate CSV deployment spec changes to the actual deployment within seconds. If the operator pod doesn't restart:

```bash
# Check if OLM updated the deployment
oc get deployment $OPERATOR_DEPLOY -n $OPERATOR_NS -o jsonpath='{.spec.template.metadata.annotations}' | jq .

# Force a restart if needed
oc rollout restart deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS
```

### CSV reset after operator upgrade

OLM catalog-driven upgrades replace the CSV entirely, which clears any env var overrides. After an operator upgrade, re-run the initial deploy patch from Phase 3.

### Fallback: ConfigMap mount approach

If the env var approach doesn't work (e.g., the operator's `imagesMap` changes or `ApplyParams` stops reading env vars), there is an alternative: mount a custom ConfigMap over the operator's `params.env` file via the CSV. This bypasses the env var lookup entirely — the operator reads the modified file directly on startup.

```bash
# 1. Get the current params.env content
OPERATOR_POD=$(oc get pods -n $OPERATOR_NS -o name | grep "$OPERATOR_DEPLOY" | head -1)
PARAMS=$(oc exec -n $OPERATOR_NS $OPERATOR_POD -- \
  cat /opt/manifests/dashboard/modular-architecture/params.env)

# 2. Create a ConfigMap with the gen-ai-ui-image overridden
echo "$PARAMS" | sed "s|gen-ai-ui-image=.*|gen-ai-ui-image=$CUSTOM_IMAGE|" > /tmp/params.env
oc create configmap dev-params-override -n $OPERATOR_NS \
  --from-file=params.env=/tmp/params.env --dry-run=client -o yaml | oc apply -f -
rm /tmp/params.env

# 3. Patch the CSV to mount it over the original params.env
oc patch csv "$CSV_NAME" -n "$OPERATOR_NS" --type json -p '[
  {"op": "add",
   "path": "/spec/install/spec/deployments/0/spec/template/spec/volumes/-",
   "value": {"name": "dev-params-override", "configMap": {"name": "dev-params-override"}}},
  {"op": "add",
   "path": "/spec/install/spec/deployments/0/spec/template/spec/containers/0/volumeMounts/-",
   "value": {"name": "dev-params-override",
             "mountPath": "/opt/manifests/dashboard/modular-architecture/params.env",
             "subPath": "params.env"}}
]'

# 4. Wait for operator restart + trigger reconciliation (same as env var approach)
sleep 10
oc rollout status deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS --timeout=120s
oc annotate dsc default-dsc --overwrite "dev.deploy/trigger=$(date +%s)"
```

To revert, remove the volume/volumeMount from the CSV and delete the ConfigMap. This approach was verified working on an ODH-based cluster. The env var approach is preferred because it is simpler (single JSON patch, no ConfigMap to manage) and works with the operator's own override mechanism.
