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

   Validate the component name first, then use quoted path checks:

   ```bash
   # Validate component name (lowercase alphanumeric + hyphens only)
   if ! echo "$COMPONENT_NAME" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$'; then
     echo "Invalid component name"; exit 1
   fi

   if [ -d "packages/${COMPONENT_NAME}" ]; then
     TYPE="A"
   elif [ -d "${COMPONENT_NAME}" ] && [ -f "${COMPONENT_NAME}/go.mod" ]; then
     TYPE="B"
   else
     # Ask user to clarify
   fi
   ```

3. Detect existing state:
   ```bash
   # Check for existing ODH Dockerfile
   # Type A:
   [ -f "packages/${COMPONENT_NAME}/Dockerfile.workspace" ] && echo "exists"
   # Type B:
   [ -f "${COMPONENT_NAME}/Dockerfile" ] && echo "exists"

   # Check for existing Tekton pipelines
   find .tekton -maxdepth 1 -name "*${COMPONENT_NAME}*push*.yaml" -print -quit 2>/dev/null
   find .tekton -maxdepth 1 -name "*${COMPONENT_NAME}*pull-request*.yaml" -print -quit 2>/dev/null
   ```

4. Report classification and state to user:

   ```text
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

## Phase 3: DevOps Onboarding Request

**Goal**: Generate `component_onboarding_details.yaml` files, validate them, and attach to a Jira ticket for DevOps automation.

Skip if: `--skip-downstream` flag.

Read [references/devops-integration.md](references/devops-integration.md) for the full integration guide.

**Important**: Two separate onboarding YAMLs are required — one for **ODH** and one for **RHOAI**. Each has different schema requirements. Run this phase twice.

### Prerequisites

The DevOps skill (`/create-component-onboarding-jira`) is a Claude Code plugin from `opendatahub-io/aiops-infra`. It requires `JIRA_USER_EMAIL` and `JIRA_API_TOKEN` env vars for its Python scripts.

If those env vars are not set, you can do the equivalent work manually:
1. Generate the YAML using the `generate_onboarding_yaml.py` script
2. Validate using `validate_yaml_schema.py`
3. Attach to Jira using the mcp-atlassian MCP tools

Scripts live at: `~/.claude/plugins/cache/opendatahub-skills/aiops-skills/0.1.0/`

### Step 3a: Collect Information (ODH run)

Ask the user for these values (with defaults where possible):

| Field | Q&A Question | Validation | Default |
|-------|-------------|------------|---------|
| `product_context` | Which product? | `ODH` or `RHOAI` | — |
| `build_type` | CI or Release build? (ODH only) | `CI` or `Release` | — |
| `component_name` | Component name? | Must match `^odh-[a-z0-9]+(-[a-z0-9]+)*$` | `odh-<name>` |
| `repo_url` | GitHub repo URL? | Must match `^https://github\.com/.+/.+$`, must return HTTP 200 | `https://github.com/opendatahub-io/odh-dashboard` |
| `repo_branch` | Branch to build? (ODH only) | Non-empty | `main` |
| `context_path` | Docker build context path? | Non-empty | `./` |
| `dockerfile_path` | Dockerfile path relative to context? | Non-empty | Type A: `packages/<name>/Dockerfile.workspace`, Type B: `<name>/Dockerfile` |
| `is_operator` | Is this an operator/controller? | `true` or `false` | — |
| `operator_manifest_src_path` | Manifest source path? (if operator) | Non-empty | — |
| `operator_manifest_dest_path` | Manifest dest path? (if operator) | Non-empty | `odh-<name>` |

### Step 3b: Collect Information (RHOAI run)

RHOAI requires additional fields beyond ODH:

| Field | Q&A Question | Validation | Notes |
|-------|-------------|------------|-------|
| `target_rhoai_version` | Target RHOAI version? | Regex: `^\d+\.\d+(?:\.0)?(?:-ea[-.]?\d+)?$` | Canonical form: `X.Y` or `X.Y-ea-N` |
| `architectures` | CPU architectures? | Subset of `[x86_64, arm64, ppc64le, s390x]` | Default: `[x86_64, arm64]` |
| `release_category` | Release category? | `Generally Available`, `Tech Preview`, or `Beta` | — |
| `long_description` | Component description (1-2 sentences)? | Non-empty | Auto-suggest from repo README |
| `short_description` | Short description (noun phrase)? | Non-empty | Auto-suggest from long_description |
| `repo_url` | GitHub repo URL? | — | `https://github.com/red-hat-data-services/odh-dashboard` |
| `repo_branch` | **Auto-derived** from version | — | `rhoai-X.Y` or `rhoai-X.Y-ea.N` |
| `dockerfile_path` | Dockerfile path? | Basename must start with `Dockerfile.konflux` | `Dockerfile.konflux.<name>` |

**Branch derivation** (do NOT ask user):
- No EA suffix (e.g., `3.5`): `repo_branch = rhoai-3.5`
- EA suffix (e.g., `3.5-ea-2`): `repo_branch = rhoai-3.5-ea.2`

### Step 3c: Generate and Validate YAML

For each product context (ODH, then RHOAI):

```bash
cd ~/.claude/plugins/cache/opendatahub-skills/aiops-skills/0.1.0
WORKDIR=$(mktemp -d)
YAML_PATH="${WORKDIR}/component_onboarding_details.yaml"

# Generate
uv run --script scripts/generate_onboarding_yaml.py \
  --output "$YAML_PATH" \
  --product-context "<ODH|RHOAI>" \
  --component-name "<name>" \
  --repo-url "<url>" \
  --repo-branch "<branch>" \
  --context-path "<path>" \
  --dockerfile-path "<path>" \
  [--build-type "<CI|Release>"]              # ODH only
  [--target-rhoai-version "<version>"]       # RHOAI only
  [--architectures "<arch1,arch2,...>"]       # RHOAI only
  [--release-category "<category>"]          # RHOAI only
  [--long-description "<desc>"]              # RHOAI only
  [--short-description "<desc>"]             # RHOAI only
  [--is-operator]                            # if operator
  [--operator-manifest-src-path "<path>"]    # if operator
  [--operator-manifest-dest-path "<path>"]   # if operator

# Validate against schema
uv run --script scripts/validate_yaml_schema.py \
  "$YAML_PATH" \
  schemas/component_onboarding_details.schema.json
```

### Step 3d: Dockerfile Digest Check (RHOAI only)

Skip for ODH. For RHOAI, verify all `FROM` instructions use `@sha256:` digests:

```bash
uv run --script scripts/check_dockerfile_digests.py \
  --dockerfile-url "<raw-github-url>"
```

If the downstream branch doesn't exist yet (HTTP 404), verify digests locally against the Dockerfile content from Phase 4 or an existing PR.

### Step 3e: Attach to Jira

Ask user for the Jira issue key and parent feature ID.

Using mcp-atlassian MCP tools (if `JIRA_USER_EMAIL`/`JIRA_API_TOKEN` not set):
1. `jira_update_issue` — attach the YAML file and add `yaml-attached` label
2. `jira_create_issue_link` — link to parent feature with "Related" link type
3. `jira_add_comment` — post a summary comment with component details

Name files distinctly: `component_onboarding_details.yaml` (ODH) and `component_onboarding_details_rhoai.yaml` (RHOAI).

### Step 3f: Post-Attachment Flow

After attaching:
1. **DevOps GitLab CI** picks up YAML attachments every ~2 hours
2. Automated PRs are raised for Konflux component registration, release pipelines, Quay repos
3. PRs require human review and merge
4. This phase covers: Quay repo creation, Konflux component registration, release pipeline config, Renovate/automerge setup

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

  ```dockerfile
  LABEL com.redhat.component="odh-<name>-container" \
        name="managed-open-data-hub/odh-<name>-rhel9" \
        summary="ODH <Display Name>" \
        description="<Description> for Red Hat OpenShift AI" \
        io.k8s.display-name="ODH <Display Name>" \
        io.k8s.description="<Description> for Red Hat OpenShift AI" \
        io.openshift.tags="rhods,rhoai,odh,<name>"
  ```

See [references/dockerfile-templates.md](references/dockerfile-templates.md) § Downstream Type B.

### Pushing to the Downstream Repo

The downstream Dockerfile **must** be committed to the downstream repo (e.g. `red-hat-data-services/odh-dashboard`), **not** to the upstream repo (`opendatahub-io/odh-dashboard`).

1. **Identify the downstream remote.** Scan `git remote -v` for the downstream repo URL (e.g. `red-hat-data-services/odh-dashboard`). The remote name varies by checkout — it may be `origin`, `downstream`, or something else.

   ```bash
   DOWNSTREAM_REMOTE=$(git remote -v | grep 'red-hat-data-services/odh-dashboard' | head -1 | awk '{print $1}')
   if [ -z "$DOWNSTREAM_REMOTE" ]; then
     echo "ERROR: No remote found for red-hat-data-services/odh-dashboard"
     echo "Add it with: git remote add downstream git@github.com:red-hat-data-services/odh-dashboard.git"
     exit 1
   fi
   echo "Downstream remote: $DOWNSTREAM_REMOTE"
   ```

2. **Determine the target branch.** Use the `repo_branch` value from Phase 3 (e.g. `rhoai-3.5-ea.2`). Fetch and verify it exists:

   ```bash
   git fetch "$DOWNSTREAM_REMOTE" "$TARGET_BRANCH"
   ```

3. **Create a feature branch, add the Dockerfile, and push:**

   ```bash
   # Create branch from the downstream target
   git checkout -b "<jira-key>-dockerfile-konflux" "$DOWNSTREAM_REMOTE/$TARGET_BRANCH"

   # Write Dockerfile.konflux.<name> at repo root
   # (use the content generated above)

   git add "Dockerfile.konflux.<name>"
   git commit -m "<JIRA-KEY>: Add Dockerfile.konflux.<name> for RHOAI Konflux builds"
   git push "$DOWNSTREAM_REMOTE" "<jira-key>-dockerfile-konflux"
   ```

4. **Create a PR against the downstream repo** targeting `$TARGET_BRANCH`:

   ```bash
   gh pr create \
     --repo red-hat-data-services/odh-dashboard \
     --base "$TARGET_BRANCH" \
     --head "<jira-key>-dockerfile-konflux" \
     --title "<JIRA-KEY>: Add Dockerfile.konflux.<name>" \
     --body "Adds the downstream Konflux Dockerfile for the <name> component.

   This Dockerfile uses SHA-pinned base images and FIPS-compliant build flags
   as required for RHOAI builds."
   ```

**Do NOT** write the Dockerfile to the upstream repo or create a PR against `opendatahub-io/odh-dashboard` — the downstream Dockerfile only exists in the downstream repo.

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

**Prerequisite**: The component's Quay repository must have the `opendatahub+openshift_ci` robot account with **push** permission. Request this via `#rhoai-devtestops-request` Slack channel if not already configured.

Provide the user with:
1. The config snippet needed for `ci-operator/config/opendatahub-io/odh-dashboard/`
2. Reference to existing PRs for similar components
3. The PR process for `openshift/release`

```text
To add OpenShift CI for this component:
1. Ensure Quay repo has opendatahub+openshift_ci robot account with push permission
2. Create a config file in openshift/release:
   ci-operator/config/opendatahub-io/odh-dashboard/<name>.yaml
3. Reference existing configs in the same directory for the pattern
4. Submit a PR to openshift/release
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

```text
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
3. Review and merge DevOps-generated PRs (check Jira labels for progression)
4. Review and merge Dockerfile.konflux.<name> PR in the downstream repo
5. Submit OpenShift CI config PR to openshift/release
6. Coordinate operator integration with Platform team (RHOAIENG-37067) — update operator component references, OLM bundle, and test integration
7. Verify first build succeeds end-to-end (both ODH and RHOAI)
```
