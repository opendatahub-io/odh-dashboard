---
name: cluster-deploy-dashboard
description: >-
  Builds and deploys the main odh-dashboard container (host frontend + backend)
  to a personal OpenShift cluster for testing. Handles monorepo build,
  production node_modules pruning, Podman image build/push to quay.io, and CSV
  env var patching. Use when changes span the host frontend or backend (feature
  flags, shared components, backend routes) — for gen-ai sidecar-only changes
  use /cluster-deploy-genai instead.
argument-hint: "press Enter — you'll be prompted for any parameters needed"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Cluster Deploy Dashboard

Build and deploy the main `odh-dashboard` container to a personal OpenShift cluster for testing local changes to the host frontend or backend.

## Scope

Staged under `packages/gen-ai/.claude/skills/` for gen-ai team testing. Replaces the main `odh-dashboard` container in the `odh-dashboard` deployment — does not touch sidecar containers (gen-ai-ui, model-registry-ui, etc.).

## When to use this vs other options

**This skill** — host frontend or backend changes:
- Feature flags (`frontend/src/concepts/areas/const.ts`)
- Backend route changes, shared components, sidebar/nav changes
- Anything in `frontend/`, `backend/`, or `packages/app-config/`

**`/cluster-deploy-genai`** — gen-ai sidecar-only changes:
- Gen-ai frontend, BFF, or extension changes
- Faster cycle — only rebuilds the gen-ai container

**Jenkins (rhoai-test-flow)** — full dashboard rebuild:
- Rebuilds everything including all sidecar containers
- Needed when changes span multiple packages

## Background

The main dashboard container runs the Node.js backend (Fastify) and serves the host frontend static files. The operator determines its image from the `RELATED_IMAGE_ODH_DASHBOARD_IMAGE` env var (mapped from `odh-dashboard-image` in `params.env` — see `dashboard_support.go` `imagesMap`). By patching this env var in the CSV (Cluster Service Version), OLM (Operator Lifecycle Manager) restarts the operator pod, and the operator reconciles the dashboard deployment with our custom image — no operator scale-down needed.

**Why use a staging directory?** The repo root `.dockerignore` excludes `frontend/public`, `backend/dist`, and `node_modules/` because the production Dockerfile builds everything inside the container. Additionally, the full `node_modules/` is ~1.6GB — too large for the podman build context. Instead, we build locally, create a staging directory with only runtime artifacts (~170MB), and build from there.

**Not a substitute for CI Docker builds** — this skill uses a minimal COPY-only Dockerfile, not the production `Dockerfile`. It won't catch issues in the real multi-stage Docker build. Rely on CI for production build validation.

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

# Node >= 22
node --version

# npm deps installed (check for node_modules at repo root)
ls node_modules/.package-lock.json
```

### Gather parameters

Ask the user for:

1. **Quay.io username** — used in the image path `quay.io/<user>/odh-dashboard:<tag>`
2. **Image tag** — default `dev`. Mention the user can alternatively use a tag based on their current branch name (e.g., the output of `git rev-parse --abbrev-ref HEAD`)

### Auto-detect target namespace

Do NOT ask the user — determine it from the installed operator.

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
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="odh-dashboard")].image}')
```

- If `$CURRENT_IMAGE` contains the user's quay username → **iteration** mode (just rebuild/push + delete pod)
- Otherwise → **initial deploy** mode (patch CSV env var, restart operator, wait for rollout)

### Derived values

- Image: `quay.io/<user>/odh-dashboard:<tag>`
- Container name in deployment: `odh-dashboard`

## Phase 2: Build

Run all commands from the **repo root** (`odh-dashboard/`).

### Step 1: Build the monorepo

```bash
npm run build
```

This uses Turbo to build `frontend/`, `backend/`, and `packages/app-config/` (and their dependencies). Output:
- `frontend/public/` — host frontend static files
- `backend/dist/` — compiled backend
- `packages/app-config/dist/` — shared config

### Step 2: Create production node_modules

The full `node_modules/` is ~1.6GB and includes dev dependencies. Create a pruned production set:

```bash
STAGING="/tmp/odh-dashboard-dev-deploy"
PROD_NM="/tmp/odh-dashboard-prod-node-modules"
rm -rf "$STAGING" "$PROD_NM"
mkdir -p "$STAGING" "$PROD_NM/backend" "$PROD_NM/packages/app-config"

# prepare-production-manifest.js strips devDependencies from package.json in-place
node scripts/prepare-production-manifest.js

# Copy the modified package.json and workspace package.jsons for npm install
cp package.json package-lock.json .npmrc "$PROD_NM/"
cp backend/package.json "$PROD_NM/backend/"
cp packages/app-config/package.json "$PROD_NM/packages/app-config/"

# IMPORTANT: restore original package.json immediately
git checkout package.json

# Install production-only deps (includes workspace deps like fastify)
cd "$PROD_NM" && npm install --omit=dev --omit=optional --ignore-scripts
```

This produces a ~75MB `node_modules/` with only runtime dependencies.

### Step 3: Create the staging directory

Copy only the runtime artifacts needed by the container:

```bash
cd <repo-root>

# Built artifacts
cp -r frontend/public "$STAGING/frontend-public"
cp -r backend/dist "$STAGING/backend-dist"
cp -r backend/node_modules "$STAGING/backend-node_modules"
cp backend/package.json "$STAGING/backend-package.json"
cp -r packages/app-config/dist "$STAGING/app-config-dist"
cp packages/app-config/package.json "$STAGING/app-config-package.json"

# Root files needed at runtime
cp package.json "$STAGING/package.json"
cp package-lock.json "$STAGING/package-lock.json"
cp .npmrc "$STAGING/.npmrc"
cp .env "$STAGING/.env"
cp -r data "$STAGING/data"

# Production node_modules — use -rL to resolve workspace symlinks
# (npm creates symlinks like node_modules/@odh-dashboard/app-config -> ../../packages/app-config
# which break in a container context since the target is outside the build context)
cp -rL "$PROD_NM/node_modules" "$STAGING/node_modules"
```

### Step 4: Create the Dockerfile in the staging directory

Check if `$STAGING/Dockerfile` exists. If not, create it:

```bash
cat > "$STAGING/Dockerfile" << 'EOF'
# Minimal dev Dockerfile — pre-built artifacts only
FROM registry.access.redhat.com/ubi9/nodejs-22:latest

USER root
RUN dnf install -y curl-minimal && dnf clean all
USER 1001:0

WORKDIR /usr/src/app
RUN mkdir /usr/src/app/logs && chmod 775 /usr/src/app/logs

COPY frontend-public /usr/src/app/frontend/public
COPY backend-package.json /usr/src/app/backend/package.json
COPY backend-node_modules /usr/src/app/backend/node_modules
COPY backend-dist /usr/src/app/backend/dist
COPY app-config-package.json /usr/src/app/packages/app-config/package.json
COPY app-config-dist /usr/src/app/packages/app-config/dist
COPY package.json /usr/src/app/package.json
COPY package-lock.json /usr/src/app/package-lock.json
COPY node_modules /usr/src/app/node_modules
COPY .npmrc /usr/src/app/.npmrc
COPY .env /usr/src/app/.env
COPY data /usr/src/app/data

WORKDIR /usr/src/app/backend
CMD ["npm", "run", "start"]
EOF
```

### Step 5: Build the container image

```bash
cd "$STAGING" && podman build --platform linux/amd64 \
  -t quay.io/<user>/odh-dashboard:<tag> .
```

### Step 6: Push the image

```bash
podman push quay.io/<user>/odh-dashboard:<tag>
```

Remind the user: the quay.io repository must be set to **public**, or the cluster won't be able to pull it. (New quay.io repos default to private.)

## Phase 3: Deploy

Use `$OPERATOR_NS`, `$CSV_NAME`, and `$APPS_NS` from the auto-detect step throughout this phase.

### How it works

The operator continuously reconciles the `odh-dashboard` deployment. Patching the deployment image directly with `oc set image` gets reverted within seconds. Instead, we patch the operator's own CSV to set a `RELATED_IMAGE_*` environment variable — the operator reads this on startup and uses it to override the image in `params.env`. OLM propagates the CSV change to the operator deployment, the operator pod restarts, and when it reconciles it deploys *our* custom image. No operator scale-down needed.

The env var that controls the odh-dashboard image is:

```
RELATED_IMAGE_ODH_DASHBOARD_IMAGE
```

This maps to the `odh-dashboard-image` key in the operator's `params.env` (see `dashboard_support.go` `imagesMap`).

### Initial deploy

#### Step 1: Find or add the RELATED_IMAGE env var in the CSV

The RHOAI CSV typically already has `RELATED_IMAGE_*` env vars. The ODH CSV may not. Detect and handle both:

```bash
ENV_NAME="RELATED_IMAGE_ODH_DASHBOARD_IMAGE"
CUSTOM_IMAGE="quay.io/<user>/odh-dashboard:<tag>"

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
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="odh-dashboard")].image}')
echo "odh-dashboard image: $DEPLOYED_IMAGE"

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

Tell the user to open that URL and confirm their changes are live.

## Reverting

Remind the user how to restore the original state when done testing. Remove the env var override from the CSV so the operator reverts to the default image from its built-in `params.env`:

```bash
# Find and remove the RELATED_IMAGE env var override from the CSV
ENV_NAME="RELATED_IMAGE_ODH_DASHBOARD_IMAGE"
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

For RHOAI clusters where `RELATED_IMAGE_ODH_DASHBOARD_IMAGE` existed before your override, restore the original value instead of removing it. Check `oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json | jq '.spec.relatedImages[] | select(.name | test("dashboard"))'` for the original image reference.

## Cleanup

Remove staging directory and temporary files:

```bash
rm -rf /tmp/odh-dashboard-dev-deploy /tmp/odh-dashboard-prod-node-modules
```

Also clean up any dev deploy files created at the repo root:

```bash
rm -f Dockerfile.dev-deploy Dockerfile.dev-deploy.dockerignore
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

### Container crashes with `MODULE_NOT_FOUND`

The production `node_modules` is missing a runtime dependency. Common causes:

- **Missing workspace symlinks**: `npm install --omit=dev` creates symlinks for workspace packages (e.g., `node_modules/@odh-dashboard/app-config -> ../../packages/app-config`). Use `cp -rL` (follow symlinks) when copying `node_modules` to the staging directory so the symlink targets are included as real directories.

- **`prepare-production-manifest.js` not run**: The script strips `devDependencies` from `package.json` before `npm install --omit=dev`. Without it, npm resolves the full dependency tree and may skip hoisting production deps that are also referenced by dev packages.

- **Forgot to restore `package.json`**: The script modifies `package.json` in-place. Run `git checkout package.json` after copying it to the staging directory, or the next `npm install` in the repo will be broken.

### Operator reverts image change

The operator reconciles the `odh-dashboard` deployment and will revert any manual `oc set image` changes within seconds. This skill avoids the problem by patching the CSV env var so the operator itself deploys the custom image. If you see the old image reappearing, verify the CSV patch took effect:

```bash
oc get csv "$CSV_NAME" -n "$OPERATOR_NS" -o json | jq -r '
  .spec.install.spec.deployments[].spec.template.spec.containers[].env[]?
  | select(.name == "RELATED_IMAGE_ODH_DASHBOARD_IMAGE")
  | "\(.name)=\(.value)"'
```

If the env var is missing or has the wrong value, re-run the initial deploy patch from Phase 3.

### Operator pod doesn't restart after CSV patch

OLM should propagate CSV deployment spec changes to the actual deployment within seconds. If the operator pod doesn't restart:

```bash
# Force a restart if needed
oc rollout restart deployment/$OPERATOR_DEPLOY -n $OPERATOR_NS
```

### CSV reset after operator upgrade

OLM catalog-driven upgrades replace the CSV entirely, which clears any env var overrides. After an operator upgrade, re-run the initial deploy patch from Phase 3.

### Build context too large for podman

If podman fails with `io: read/write on closed pipe` or EOF errors, the build context is too large. Verify you're building from the staging directory (`/tmp/odh-dashboard-dev-deploy`, ~170MB), not the repo root (~1.6GB+ with `node_modules`).
