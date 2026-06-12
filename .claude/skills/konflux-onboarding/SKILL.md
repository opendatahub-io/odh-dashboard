---
name: konflux-onboarding
description: "Guides Konflux CI/CD pipeline onboarding for new components — upstream ODH Dockerfiles & Tekton pipelines, downstream RHOAI Dockerfile generation, DevOps skill integration, manifest overlays, and Jira tracking."
argument-hint: "<component-name> [--skip-odh] [--skip-downstream] [--skip-jira]"
---

# Konflux Onboarding

Onboard a component to Konflux CI/CD pipelines for both ODH (upstream) and RHOAI (downstream). This skill handles Dockerfiles, Tekton PipelineRun YAML, DevOps coordination, manifest overlays, and Jira updates.

Companion to `/module-onboarding` which handles Dashboard-side package scaffolding. This skill covers the CI/CD pipeline side.

## Flags

Parse from `$ARGUMENTS`:
- `--skip-odh` — skip Phases 1-2 (ODH upstream Dockerfile and Tekton pipelines)
- `--skip-downstream` — skip Phases 3-4 (RHOAI DevOps request and downstream Dockerfile)
- `--skip-jira` — skip Phase 7 (Jira updates)

## Phase 0: Parse and Classify

**Goal**: Determine component type and detect existing state.

1. Extract the component name from `$ARGUMENTS` (first positional argument). If missing, ask the user.

2. Classify the component:
   - **Type A — Modular-arch package**: `packages/<name>/` exists. These are Node.js + optional Go BFF packages that use `Dockerfile.workspace` and deploy as Module Federation remotes.
   - **Type B — Standalone Go component**: `<name>/` exists at repo root with a `go.mod`. These are Go services/operators with their own Dockerfile.

   ```bash
   if [ -d "packages/$COMPONENT_NAME" ]; then
     TYPE="A"
   elif [ -d "$COMPONENT_NAME" ] && [ -f "$COMPONENT_NAME/go.mod" ]; then
     TYPE="B"
   else
     # Ask user to clarify
   fi
   ```

3. Detect existing state:
   ```bash
   # Check for existing ODH Dockerfile
   # Type A:
   ls packages/$COMPONENT_NAME/Dockerfile.workspace 2>/dev/null
   # Type B:
   ls $COMPONENT_NAME/Dockerfile 2>/dev/null

   # Check for existing Tekton pipelines
   ls .tekton/*${COMPONENT_NAME}*push*.yaml 2>/dev/null
   ls .tekton/*${COMPONENT_NAME}*pull-request*.yaml 2>/dev/null
   ```

4. Report classification and state to user:
   ```
   Component: <name>
   Type: A (modular-arch package) / B (standalone Go component)
   ODH Dockerfile: ✅ exists / ❌ missing
   Tekton push pipeline: ✅ exists / ❌ missing
   Tekton PR pipeline: ✅ exists / ❌ missing
   ```

## Phase 1: ODH Upstream Dockerfile

**Goal**: Ensure the component has an upstream Dockerfile for ODH Konflux builds.

Skip if: `--skip-odh` flag, or Dockerfile already exists.

### Type A

Check for `packages/<name>/Dockerfile.workspace`. If missing, scaffold from `packages/plugin-template/Dockerfile.workspace`.

Read the template from `packages/plugin-template/Dockerfile.workspace` and adapt:
- Set `ARG MODULE_NAME=<name>`
- Update `UI_SOURCE_CODE` and `BFF_SOURCE_CODE` paths
- If the package has no BFF (no `packages/<name>/bff/` directory), remove the BFF build stage and adjust the final stage to only copy UI artifacts
- Check `packages/<name>/bff/go.mod` for the Go version if BFF exists

See [references/dockerfile-templates.md](references/dockerfile-templates.md) § Type A for the full template.

### Type B

Check for `<name>/Dockerfile`. If missing, scaffold using the Type B template.

Read `<name>/go.mod` to determine Go version. Identify the binary build target from `<name>/cmd/*/main.go`.

See [references/dockerfile-templates.md](references/dockerfile-templates.md) § Type B for the full template.

**Verify**: The Dockerfile builds from repo root context (not from the component subdirectory).

## Phase 2: ODH Upstream Tekton Pipelines

**Goal**: Ensure `.tekton/` has push and pull-request pipelines for this component.

Skip if: `--skip-odh` flag, or both pipeline files already exist.

### Type A

Scaffold `odh-mod-arch-<name>-push.yaml` and `odh-mod-arch-<name>-pull-request.yaml`.

Use an existing Type A pipeline as reference (e.g., `.tekton/odh-mod-arch-gen-ai-push.yaml`). Apply substitutions from [references/pipeline-templates.md](references/pipeline-templates.md):
- `COMPONENT_CI_NAME`: `odh-mod-arch-<name>-ci`
- `PIPELINE_NAME_PREFIX`: `odh-mod-arch-<name>`
- `QUAY_IMAGE`: `quay.io/opendatahub/odh-mod-arch-<name>`
- `DOCKERFILE_PATH`: `packages/<name>/Dockerfile.workspace`
- `PATH_CHANGED_EXPR`: `packages/<name>/**`
- `EXTRA_PATH_EXPR`: `|| "Dockerfile.workspace".pathChanged()`
- `SERVICE_ACCOUNT`: `build-pipeline-<name>` (must be provisioned by DevOps)

### Type B

Scaffold `<name>-push.yaml` and `<name>-pull-request.yaml`.

Use `.tekton/dashboard-operator-push.yaml` as reference. Apply substitutions:
- `COMPONENT_CI_NAME`: `<name>-ci`
- `PIPELINE_NAME_PREFIX`: `<name>`
- `QUAY_IMAGE`: `quay.io/opendatahub/<name>`
- `DOCKERFILE_PATH`: `<name>/Dockerfile`
- `PATH_CHANGED_EXPR`: `<name>/**`
- `EXTRA_PATH_EXPR`: `|| "manifests/**".pathChanged()` (if applicable)
- `SERVICE_ACCOUNT`: `build-pipeline-<name>`

**Important**: The service account must be provisioned by DevOps before the pipeline can run. Remind the user that Phase 3 (DevOps onboarding) handles this.

## Phase 3: DevOps Onboarding Request (RHOAI downstream)

**Goal**: Coordinate with the DevOps AI skill to set up RHOAI Konflux infrastructure.

Skip if: `--skip-downstream` flag.

Read [references/devops-integration.md](references/devops-integration.md) for the full integration guide.

1. Collect the following information:

   | Field | Value |
   |-------|-------|
   | Component name | `<name>` |
   | Repository | `https://github.com/red-hat-data-services/odh-dashboard` |
   | Dockerfile path | `Dockerfile.konflux.<name>` |
   | Target version | Ask user (e.g., `2.20`) |
   | Jira issue key | Ask user if not provided |

2. Present the collected information to the user.

3. Instruct the user to invoke the DevOps skill:
   ```
   /create-component-onboarding-jira
   ```
   The DevOps skill will interactively ask for the details.

4. Explain the automated flow:
   - DevOps skill creates a YAML request file
   - GitLab CI processes it (runs every ~2 hours)
   - Automated PRs are raised in downstream repos
   - PRs require human review and merge

5. This phase covers:
   - Quay repository creation
   - Konflux component registration
   - Release pipeline configuration
   - Renovate / automerge setup

## Phase 4: RHOAI Downstream Dockerfile

**Goal**: Generate a downstream Dockerfile for the RHOAI build.

Skip if: `--skip-downstream` flag.

Generate `Dockerfile.konflux.<name>` content for the `red-hat-data-services/odh-dashboard` repo root.

### Type A

Based on the upstream `Dockerfile.workspace`, generate a downstream variant with:
- SHA-pinned base images (use `skopeo inspect` to get current digests, or use placeholder `@sha256:<digest>`)
- Red Hat labels on the final stage
- Same FIPS flags as upstream (already uses `CGO_ENABLED=1 -tags strictfipsruntime`)

See [references/dockerfile-templates.md](references/dockerfile-templates.md) § Downstream Type A.

### Type B

Generate from the upstream Dockerfile with these changes:
- Builder: `registry.redhat.io/ubi9/go-toolset:<version>@sha256:<digest>` (not Docker Hub `golang:`)
- Add `USER root` after FROM in builder stage (go-toolset runs non-root by default)
- Build flags: `CGO_ENABLED=1 GOOS=linux go build -a -ldflags="-s -w" -tags strictfipsruntime`
- Runtime: `registry.access.redhat.com/ubi9/ubi-minimal@sha256:<digest>` (SHA-pinned)
- Red Hat labels on final stage:
  ```
  LABEL com.redhat.component="odh-<name>-container" \
        name="managed-open-data-hub/odh-<name>-rhel9" \
        summary="ODH <Display Name>" \
        description="<Description> for Red Hat OpenShift AI" \
        io.k8s.display-name="ODH <Display Name>" \
        io.k8s.description="<Description> for Red Hat OpenShift AI" \
        io.openshift.tags="rhods,rhoai,odh,<name>"
  ```

See [references/dockerfile-templates.md](references/dockerfile-templates.md) § Downstream Type B.

**Output**: Print the full Dockerfile content for the user to commit to the downstream repo. Do NOT write it to the upstream repo.

## Phase 5: Manifest Overlay (Type A only)

**Goal**: Scaffold deployment manifests for a modular-arch package.

Skip if: Type B, or manifests already exist in `manifests/modular-architecture/modules/<name>/`.

For Type A packages, check if `manifests/modular-architecture/modules/<name>/` exists. If not, scaffold:
- Deployment overlay adding the module container
- Service port configuration
- Image parameter for Konflux/operator injection
- Kustomization.yaml entry

Reference existing module overlays in `manifests/modular-architecture/modules/` for the pattern.

## Phase 6: OpenShift CI (instructions only)

**Goal**: Provide instructions for `openshift/release` repo configuration.

This cannot be automated — it requires changes in a separate repository (`openshift/release`).

Provide the user with:
1. The config snippet needed for `ci-operator/config/opendatahub-io/odh-dashboard/`
2. Reference to existing PRs for similar components
3. The PR process for `openshift/release`

```
To add OpenShift CI for this component:
1. Create a config file in openshift/release:
   ci-operator/config/opendatahub-io/odh-dashboard/<name>.yaml
2. Reference existing configs in the same directory for the pattern
3. Submit a PR to openshift/release
```

## Phase 7: Jira Updates

**Goal**: Update tracking Jira issues with onboarding progress.

Skip if: `--skip-jira` flag.

If a Jira issue key was provided or is known from context, add a comment documenting:
- What was completed (files created, phases executed)
- What remains (pending DevOps automation, manual steps)
- Links to any PRs created

## Phase 8: Verification Report

**Goal**: Summary of all work done and remaining steps.

Print a final report:

```
## Konflux Onboarding Report: <name>

### Component Classification
- Type: A/B
- Component: <name>

### Completed
- [ ] ODH Dockerfile: <path> (created/already existed/skipped)
- [ ] Tekton push pipeline: <path> (created/already existed/skipped)
- [ ] Tekton PR pipeline: <path> (created/already existed/skipped)
- [ ] DevOps onboarding: requested/skipped
- [ ] RHOAI Dockerfile: content generated/skipped
- [ ] Manifest overlay: created/already existed/skipped/N/A
- [ ] OpenShift CI: instructions provided/skipped
- [ ] Jira updated: yes/skipped

### Files Created/Modified
- <list of files>

### Remaining Manual Steps
1. Review and merge Tekton pipeline PRs
2. Wait for DevOps GitLab CI to process onboarding request (~2-4 hours)
3. Review and merge DevOps-generated PRs
4. Commit Dockerfile.konflux.<name> to downstream repo
5. Submit OpenShift CI config PR to openshift/release
6. Verify first build succeeds end-to-end
```
