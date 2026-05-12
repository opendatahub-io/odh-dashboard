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

The gen-ai package runs as a sidecar container (`gen-ai-ui`) in the `odh-dashboard` deployment. To test branch changes in a real cluster, we build a custom image and patch the deployment to use it.

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

```bash
if oc get csv -n redhat-ods-operator 2>/dev/null | grep -q rhods-operator; then
  APPS_NS="redhat-ods-applications"
  OPERATOR_NS="redhat-ods-operator"
  OPERATOR_DEPLOY="rhods-operator"
  echo "Detected RHOAI — namespace: $APPS_NS"
elif oc get deployment opendatahub-operator-controller-manager -n opendatahub 2>/dev/null | grep -q opendatahub; then
  APPS_NS="opendatahub"
  OPERATOR_NS="opendatahub"
  OPERATOR_DEPLOY="opendatahub-operator-controller-manager"
  echo "Detected ODH — namespace: $APPS_NS"
else
  echo "ERROR: Neither RHOAI nor ODH operator found."
  exit 1
fi
```

Use `$APPS_NS` as the namespace for all deployment operations and `$OPERATOR_DEPLOY` in `$OPERATOR_NS` for scaling the operator.

### Auto-detect deploy mode

Do NOT ask the user — determine it automatically by inspecting the current container image:

```bash
CURRENT_IMAGE=$(oc get deployment/odh-dashboard -n $APPS_NS \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="gen-ai-ui")].image}')
```

- If `$CURRENT_IMAGE` contains the user's quay username → **iteration** mode (just rebuild/push + delete pod)
- Otherwise → **initial deploy** mode (scale down operator, `oc set image`, wait for rollout)

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

Use `$OPERATOR_DEPLOY`, `$OPERATOR_NS`, and `$APPS_NS` from the auto-detect step throughout this phase.

### Initial deploy

The operator continuously reconciles the `odh-dashboard` deployment. Patch the image without stopping the operator and it will revert within seconds, therefore we must scale down the operator to prevent it from interfering with our manual image change.

Before scaling down the operator, capture its current replica count so it can be restored later:

```bash
OPERATOR_REPLICAS=$(oc get deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS \
  -o jsonpath='{.spec.replicas}')
```

```bash
# Scale down the operator
oc scale deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS --replicas=0

# Patch the deployment to use the custom image
oc set image deployment/odh-dashboard \
  gen-ai-ui=quay.io/<user>/odh-mod-arch-gen-ai:<tag> \
  -n $APPS_NS

# Wait for rollout
oc rollout status deployment/odh-dashboard -n $APPS_NS
```

If the rollout hangs with `ImagePullBackOff`, the quay.io repo is likely private. Fix it, then delete the pending pod to force a retry:

```bash
oc delete pod -l app=odh-dashboard -n $APPS_NS
```

### Iteration (redeploy same tag)

After the initial deploy, the deployment already references the custom image tag. Just rebuild, push the same tag, and delete the pod:

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

Remind the user how to restore the original state when done testing. Use the auto-detected operator values and the saved replica count from Phase 3:

```bash
# Restore the original image
oc set image deployment/odh-dashboard \
  gen-ai-ui=quay.io/opendatahub/odh-mod-arch-gen-ai:main \
  -n $APPS_NS

# Scale the operator back up (use the saved replica count)
oc scale deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS \
  --replicas=$OPERATOR_REPLICAS
```

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

The ODH operator reconciles the `odh-dashboard` deployment and will revert any manual image changes. You must scale it down first (Phase 3, initial deploy). Symptoms: `oc set image` succeeds but the deployment spec immediately shows the old image.
