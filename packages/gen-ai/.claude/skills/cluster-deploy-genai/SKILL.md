---
name: cluster-deploy-genai
description: >-
  Builds and deploys the gen-ai standalone container to a personal OpenShift cluster
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

Build and deploy the gen-ai standalone container to a personal OpenShift cluster for testing local changes.

## Scope

Staged under `packages/gen-ai/.claude/skills/` for gen-ai team testing. Only replaces the gen-ai standalone deployment (`gen-ai-ui`) — does not rebuild the full dashboard.

## When to use this vs Jenkins

**This skill** — fast iteration on gen-ai package changes:
- Only replaces the gen-ai standalone deployment, not the full dashboard
- Builds from local — changes don't need to be pushed to a branch
- Faster redeploy cycle after initial setup

**Jenkins (rhoai-test-flow)** — full dashboard rebuild:
- Rebuilds the entire odh-dashboard (host frontend, backend, and all module deployments)
- Needed when changes span the host or multiple packages
- Can trigger tests on the build

## Background

The gen-ai package runs as a standalone deployment (`gen-ai-ui`) managed by the `dashboard-operator`. To test branch changes in a real cluster, we build a custom image and set a `RELATED_IMAGE_*` env var on the dashboard-operator deployment. The dashboard-operator reads these env vars at startup and uses them to override the default images in its built-in `params.env` for each module. Setting the env var on the dashboard-operator deployment triggers a pod restart, and when the operator reconciles it deploys our custom image for the gen-ai module.

The env var that controls the gen-ai-ui image is:

```
RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE
```

This maps to the `gen-ai-ui-image` key in the dashboard-operator's `params.env` (see `dashboard-operator/internal/controller/support.go` `imagesMap`).

The full mapping of module images to env vars is:

| Module | params.env key | Env var |
|---|---|---|
| gen-ai-ui | `gen-ai-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE` |
| odh-dashboard | `odh-dashboard-image` | `RELATED_IMAGE_ODH_DASHBOARD_IMAGE` |
| maas-ui | `maas-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE` |
| eval-hub-ui | `eval-hub-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE` |
| mlflow-ui | `mlflow-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE` |
| agent-ops-ui | `agent-ops-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_AGENT_OPS_IMAGE` |

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

# jq (required for JSON patching)
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

Use `$APPS_NS` as the namespace for all deployment operations.

### Auto-detect deploy mode

Do NOT ask the user — determine it automatically by inspecting the current gen-ai-ui deployment image:

```bash
CURRENT_IMAGE=$(oc get deployment/gen-ai-ui -n $APPS_NS \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="gen-ai-ui")].image}')
```

- If `$CURRENT_IMAGE` contains the user's quay username → **iteration** mode (just rebuild/push + delete pod)
- Otherwise → **initial deploy** mode (set env var on dashboard-operator, wait for reconciliation)

### Derived values

- Image: `quay.io/<user>/odh-mod-arch-gen-ai:<tag>`
- Deployment name: `gen-ai-ui`
- Container name in deployment: `gen-ai-ui`
- Dashboard-operator deployment: `dashboard-operator`
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

From the repo root. Always use `--no-cache` — the Dockerfile uses only COPY steps, so podman's layer cache won't detect changes to rebuilt artifacts and will silently serve a stale image:

```bash
podman build --platform linux/amd64 --no-cache \
  --file ./packages/gen-ai/Dockerfile.dev-deploy \
  -t quay.io/<user>/odh-mod-arch-gen-ai:<tag> .
```

### Step 5: Push the image

Before pushing, verify podman machine is still running — it can stop between long-running commands:

```bash
podman machine info 2>&1 | grep -q 'Running' || podman machine start
podman push quay.io/<user>/odh-mod-arch-gen-ai:<tag>
```

Remind the user: the quay.io repository must be set to **public**, or the cluster won't be able to pull it. (New quay.io repos default to private.)

## Phase 3: Deploy

Use `$APPS_NS` from the auto-detect step throughout this phase.

### How it works

The `dashboard-operator` continuously reconciles module deployments (including `gen-ai-ui`). Patching the deployment image directly with `oc set image` gets reverted by the dashboard-operator within seconds. Instead, we set a `RELATED_IMAGE_*` env var on the `dashboard-operator` deployment itself — the operator reads this on startup and uses it to override the image in its built-in `params.env`. The env var change triggers a pod restart of the dashboard-operator, and when it reconciles it deploys *our* custom image. No operator scale-down needed.

### Initial deploy

#### Step 1: Set the RELATED_IMAGE env var on the dashboard-operator

```bash
ENV_NAME="RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE"
CUSTOM_IMAGE="quay.io/<user>/odh-mod-arch-gen-ai:<tag>"

oc set env deployment/dashboard-operator -n $APPS_NS \
  "${ENV_NAME}=${CUSTOM_IMAGE}"
echo "Set $ENV_NAME -> $CUSTOM_IMAGE on dashboard-operator"
```

#### Step 2: Wait for the dashboard-operator to restart

```bash
echo "Waiting for dashboard-operator rollout..."
oc rollout status deployment/dashboard-operator -n $APPS_NS --timeout=120s
```

#### Step 3: Wait for gen-ai-ui deployment to reconcile

```bash
echo "Waiting for gen-ai-ui reconciliation..."
sleep 15

# Verify the image was picked up
DEPLOYED_IMAGE=$(oc get deployment/gen-ai-ui -n $APPS_NS \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="gen-ai-ui")].image}')
echo "gen-ai-ui image: $DEPLOYED_IMAGE"

# Wait for rollout
oc rollout status deployment/gen-ai-ui -n $APPS_NS --timeout=180s
```

If the `DEPLOYED_IMAGE` still shows the old image after 30 seconds, the reconciliation may need more time. Wait and re-check.

If the rollout hangs with `ImagePullBackOff`, the quay.io repo is likely private. Fix it, then delete the pending pod to force a retry:

```bash
oc delete pod -n $APPS_NS -l deployment=gen-ai-ui
```

### Iteration (redeploy same tag)

After the initial deploy, the dashboard-operator already deploys with the custom image tag. Just rebuild, push the same tag, and delete the pod:

```bash
# Delete the pod to pull the new image
oc delete pod -n $APPS_NS -l deployment=gen-ai-ui

# Wait for the new pod
oc rollout status deployment/gen-ai-ui -n $APPS_NS --timeout=120s
```

## Phase 4: Verify

Check that the rollout completed and show the dashboard URL:

```bash
oc rollout status deployment/gen-ai-ui -n $APPS_NS
```

Get the dashboard route URL so the user can click it directly:

```bash
oc get route -n $APPS_NS -l app.kubernetes.io/part-of=odh-dashboard -o jsonpath='https://{.items[0].spec.host}' 2>/dev/null || \
  oc get route odh-dashboard -n $APPS_NS -o jsonpath='https://{.spec.host}' 2>/dev/null || \
  echo "No dashboard route found — check oc get route -n $APPS_NS"
```

Tell the user to open that URL and navigate to the gen-ai pages to confirm their changes are live.

## Reverting

Remind the user how to restore the original state when done testing. Remove the env var override from the dashboard-operator so it reverts to the default image from its built-in `params.env`:

```bash
oc set env deployment/dashboard-operator -n $APPS_NS \
  RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE-

echo "Removed RELATED_IMAGE override from dashboard-operator"

# Wait for dashboard-operator restart and reconciliation
oc rollout status deployment/dashboard-operator -n $APPS_NS --timeout=120s

# Wait for gen-ai-ui to revert
sleep 15
oc rollout status deployment/gen-ai-ui -n $APPS_NS --timeout=120s
```

## Cleanup

Remove local build artifacts:

```bash
rm packages/gen-ai/bff/bff-linux-amd64
rm -f packages/gen-ai/Dockerfile.dev-deploy
```

## Troubleshooting

### Podman machine OOM (SIGKILL on rspack)

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
oc delete pod -n $APPS_NS -l deployment=gen-ai-ui
```

Check events for details:

```bash
oc get events -n $APPS_NS --sort-by='.lastTimestamp' | grep -i "pull\|image"
```

### Dashboard-operator reverts image change

The dashboard-operator reconciles the `gen-ai-ui` deployment and will revert any manual `oc set image` changes within seconds. This skill avoids the problem by setting the `RELATED_IMAGE_*` env var on the dashboard-operator itself so it deploys the custom image. If you see the old image reappearing, verify the env var is set:

```bash
oc get deployment dashboard-operator -n $APPS_NS -o json | jq -r '
  .spec.template.spec.containers[0].env[]
  | select(.name == "RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE")
  | "\(.name)=\(.value)"'
```

If the env var is missing or has the wrong value, re-run the initial deploy patch from Phase 3.

### Dashboard-operator pod doesn't restart after env var change

`oc set env` modifies the deployment spec, which should trigger a rolling restart automatically. If the pod doesn't restart:

```bash
# Force a restart
oc rollout restart deployment/dashboard-operator -n $APPS_NS
oc rollout status deployment/dashboard-operator -n $APPS_NS --timeout=120s
```

### Env var reset after operator upgrade

OLM catalog-driven upgrades may replace the dashboard-operator deployment, which clears any env var overrides. After an operator upgrade, re-run the initial deploy from Phase 3.

### Listing all dashboard standalone deployments

To see all standalone deployments managed by the dashboard-operator:

```bash
oc get deployment -n $APPS_NS -l app.kubernetes.io/part-of=odh-dashboard
```
