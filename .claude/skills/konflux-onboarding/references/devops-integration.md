# DevOps Integration Guide

How the Dashboard Konflux onboarding skill integrates with the DevOps `create-component-onboarding-jira` AI skill for Konflux setup.

## Overview

The DevOps team provides a Claude Code plugin (`create-component-onboarding-jira`) that automates Konflux infrastructure provisioning. It generates a `component_onboarding_details.yaml` validated against a JSON Schema, attaches it to a Jira ticket, and DevOps GitLab CI processes it.

**Two separate runs are required** — one for ODH and one for RHOAI — because each product context has different schema requirements and targets different repos/build pipelines.

## What DevOps Automates

The DevOps skill handles these items (roughly mapping to RHOAIENG-37060 subtasks):

| Step | Description | Related Subtask |
|------|-------------|-----------------|
| Quay repository creation | Creates the downstream Quay.io repo for built images | RHOAIENG-37062 |
| Konflux component registration | Registers the component in the downstream Konflux tenant | RHOAIENG-37062 |
| Konflux release configuration | Sets up ReleasePlanAdmission, release pipeline, advisory config | RHOAIENG-37064 |
| CI integration | Configures PipelinesAsCode triggers in the downstream repo | RHOAIENG-37064 |
| Renovate / automerge | Sets up automated dependency updates (image digest pinning) | RHOAIENG-37068 |
| GitOps changes | Updates deployment manifests in GitOps repos | RHOAIENG-37068 |

## What Dashboard Handles (Not DevOps)

| Step | Description | Related Subtask |
|------|-------------|-----------------|
| ODH upstream Dockerfile | `Dockerfile.workspace` or `<name>/Dockerfile` | RHOAIENG-37063 |
| ODH Tekton pipelines | `.tekton/` pipeline YAML files | RHOAIENG-37064 (upstream only) |
| RHOAI downstream Dockerfile | `Dockerfile.konflux.<name>` with FIPS/labels | RHOAIENG-37063, 37068 |
| Manifest overlays | `manifests/modular-architecture/modules/<name>/` (Type A only) | RHOAIENG-37066 |
| OpenShift CI config | `openshift/release` repo configuration | RHOAIENG-37065 |
| Operator integration | OLM bundle / ODH operator references | RHOAIENG-37067 |

## Using the DevOps Skill

### Installation

The skill is a Claude Code plugin from `opendatahub-io/aiops-infra`:

```text
/plugin install aiops-skills@opendatahub-skills:0.1.0
```

Verify installation:

```text
/skills
```
Look for `create-component-onboarding-jira` in the list.

### Prerequisites

The skill's Python scripts need:
- `uv` in PATH
- `jq` in PATH
- `JIRA_USER_EMAIL` — Atlassian account email
- `JIRA_API_TOKEN` — Atlassian Cloud API token

Scripts live at: `~/.claude/plugins/cache/opendatahub-skills/aiops-skills/0.1.0/`

### MCP Fallback (when env vars are not set)

If `JIRA_USER_EMAIL` or `JIRA_API_TOKEN` are not set, the YAML generation and validation scripts still work (they don't need Jira credentials), but the Jira attachment/update scripts will fail. In this case:

1. Generate YAML: `uv run --script scripts/generate_onboarding_yaml.py ...`
2. Validate: `uv run --script scripts/validate_yaml_schema.py ...`
3. Use mcp-atlassian MCP tools for Jira operations:
   - `jira_update_issue` — attach YAML and add labels
   - `jira_create_issue_link` — link to parent feature
   - `jira_add_comment` — post summary comment

## Q&A Flow

The skill asks questions sequentially. Each product context has different required fields.

### Common Fields (both ODH and RHOAI)

| # | Question | Field | Validation |
|---|----------|-------|------------|
| Q1 | Which product? (ODH/RHOAI) | `product_context` | `ODH` or `RHOAI` |
| Q3 | Component name? | `component_name` | Regex: `^odh-[a-z0-9]+(-[a-z0-9]+)*$` |
| Q4 | GitHub repo URL? | `repo_url` | Regex: `^https://github\.com/.+/.+$`, must return HTTP 200 |
| Q6 | Docker build context path? | `context_path` | Non-empty, default `./` |
| Q7 | Dockerfile path? | `dockerfile_path` | Non-empty |
| Q8 | Is this an operator? (yes/no) | `is_operator` | Boolean |
| Q9a | Manifest source path? (if operator) | `operator_manifest_src_path` | Non-empty |
| Q9b | Manifest dest path? (if operator) | `operator_manifest_dest_path` | Non-empty |

### ODH-Only Fields

| # | Question | Field | Validation |
|---|----------|-------|------------|
| Q2 | CI or Release build? | `build_type` | `CI` or `Release` |
| Q2.5 | Version tag? (Release only) | `odh_release_tag` | Non-empty |
| Q5 | Branch to build? | `repo_branch` | Non-empty, default `main` |

### RHOAI-Only Fields

| # | Question | Field | Validation |
|---|----------|-------|------------|
| Q2a | Target RHOAI version? | `target_rhoai_version` | Regex: `^\d+\.\d+(?:\.0)?(?:-ea[-.]?\d+)?$` |
| Q2b | CPU architectures? | `architectures` | Subset of `[x86_64, arm64, ppc64le, s390x]` |
| Q3.5 | Release category? | `release_category` | `Generally Available`, `Tech Preview`, or `Beta` |
| Q4.5a | Long description? | `long_description` | Non-empty, auto-suggested from README |
| Q4.5b | Short description? | `short_description` | Non-empty, auto-suggested from long_description |
| Q5 | Branch (auto-derived) | `repo_branch` | NOT asked — derived from version |
| Q7 | Dockerfile path? | `dockerfile_path` | Basename must start with `Dockerfile.konflux` |

### RHOAI Branch Auto-Derivation

The `repo_branch` for RHOAI is derived from `target_rhoai_version` — do NOT ask the user:
- `3.5` → `rhoai-3.5`
- `3.5-ea-2` → `rhoai-3.5-ea.2`

### RHOAI Version Canonical Form

Input is normalized:
- `3.4`, `3.4.0` → `3.4`
- `3.4-ea2`, `3.4-ea-2`, `3.4-ea.2`, `3.4.0-ea2` → `3.4-ea-2`

## Schema Validation

The YAML is validated against `schemas/component_onboarding_details.schema.json`. Key rules:

- `inputs` wrapper is required
- ODH requires: `build_type`
- RHOAI requires: `target_rhoai_version`, `architectures`, `release_category`, `long_description`, `short_description`
- `component_name` must match `^odh-[a-z0-9]+(-[a-z0-9]+)*$`
- `repo_url` must match `^https://github\.com/.+/.+$`
- Conditional validation via `allOf`/`if`/`then` blocks

## Dockerfile Digest Check (RHOAI only)

RHOAI Dockerfiles must pin all `FROM` instructions with `@sha256:` digests:

```bash
uv run --script scripts/check_dockerfile_digests.py \
  --dockerfile-url "<raw-github-url>"
```

If the downstream branch doesn't exist yet (HTTP 404), verify digests locally:
```bash
grep "^FROM " <dockerfile-path>
# All FROM lines must contain @sha256:
```

## Automated Flow After Attachment

After the YAML is attached to a Jira ticket:

1. **DevOps GitLab CI picks it up** — scheduled job runs every ~2 hours
2. **Automated PRs are raised** for:
   - Konflux component registration
   - Release pipeline configuration
   - Quay repository setup
   - PipelinesAsCode triggers
3. **Human review required** — each PR needs manual review and merge
4. **Verification** — after PRs merge:
   - Quay repo exists and is accessible
   - Konflux component appears in the tenant
   - A test push triggers a build

## Label Progression

DevOps automation tracks progress via Jira labels. These are added automatically by CI as each step completes:

| Label | Meaning | Added by |
|-------|---------|----------|
| `yaml-attached` | Onboarding YAML attached to ticket | `/create-component-onboarding-jira` skill |
| `validation-successful` | YAML passes schema + Dockerfile digest validation | `/validate-component-onboarding-jira` skill |
| `component-onboarding` | GitLab CI picked up the request | DevOps automation |
| `onboarding-in-review` | PRs/MRs have been generated and are pending review | DevOps automation |
| `okc-pr-merged` | OKC (Konflux component registration) PR merged | DevOps automation |
| `tekton-pr-merged` | Tekton pipeline configuration PR merged | DevOps automation |
| `operator-pr-merged` | Operator-related PR merged (if applicable) | DevOps automation |
| `bundle-pr-merged` | OLM bundle PR merged (if applicable) | DevOps automation |
| `quay-mr-merged` | Quay repository MR merged | DevOps automation |
| `krd-mr-merged` | KRD (Konflux Release Definition) MR merged (RHOAI only) | DevOps automation |
| `component-onboarding-completed` | All onboarding steps finished | DevOps automation |

**Monitoring**: Check the Jira ticket labels to track which stage the onboarding has reached. If labels stop progressing after 4+ hours, check the GitLab CI pipeline logs.

## Monitoring Progress

1. Check if the YAML was committed to the onboarding repo
2. Watch for automated PRs (typically 2-4 hours after YAML commit)
3. Check Jira labels for progression (see table above)
4. Review and merge each PR as it appears
5. Verify end-to-end by pushing a small change to the downstream repo

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| DevOps skill not found | `/plugin install aiops-skills@opendatahub-skills:0.1.0` |
| `JIRA_USER_EMAIL`/`JIRA_API_TOKEN` not set | Use MCP fallback (generate YAML + mcp-atlassian tools) |
| GitLab CI didn't process YAML | Check GitLab CI pipeline status; may need manual trigger |
| PRs not appearing | Wait up to 4 hours; check GitLab CI logs for errors |
| Dockerfile digest check HTTP 404 | Branch doesn't exist yet; verify digests locally |
| Build fails after merge | Check Dockerfile path, service account permissions, Quay access |
| Image not pushed to Quay | Verify robot account has push permissions; check Konflux logs |
| Schema validation fails | Check conditional required fields per product context |
