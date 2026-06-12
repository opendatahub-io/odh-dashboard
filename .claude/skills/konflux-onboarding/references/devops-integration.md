# DevOps Integration Guide

How the Dashboard Konflux onboarding skill integrates with the DevOps `create-component-onboarding-jira` AI skill for RHOAI downstream Konflux setup.

## Overview

The DevOps team provides a Claude Code plugin (`create-component-onboarding-jira`) that automates most of the Konflux infrastructure provisioning for downstream (RHOAI) builds. Our skill collects the required information and guides the user to invoke the DevOps skill.

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

### Prerequisites

1. The DevOps skill must be installed in the Claude Code session. Check with:
   ```
   /skills
   ```
   Look for `create-component-onboarding-jira` in the list.

2. If not installed, install it from the skills-registry marketplace or ask DevOps for access.

### Information to Collect

Before invoking the DevOps skill, collect and present this information to the user:

| Field | Description | Example |
|-------|-------------|---------|
| Component name | The Konflux component identifier | `dashboard-operator` |
| Repository | The downstream repo URL | `https://github.com/red-hat-data-services/odh-dashboard` |
| Dockerfile path | Relative path to the downstream Dockerfile | `Dockerfile.konflux.dashboard-operator` |
| Target version | The RHOAI version to onboard for | `2.20` |
| Quay organization | Where to push built images | `quay.io/redhat-ai-dev` or similar |
| Jira issue key | The tracking issue for this work | `RHOAIENG-65724` |

### Invocation

Present the collected information to the user and instruct them to run:

```
/create-component-onboarding-jira
```

The DevOps skill will interactively ask for the details. The user can paste the collected information.

## Automated Flow After DevOps Skill

After the DevOps skill creates the onboarding YAML:

1. **GitLab CI picks it up** — a scheduled job runs every ~2 hours and processes new YAML requests
2. **PRs are raised** — automated PRs appear in:
   - The downstream repo (PipelinesAsCode configuration)
   - Konflux tenant configuration repos
   - Release configuration repos
3. **Human review required** — each PR needs manual review and merge
4. **Verification** — after PRs merge, verify:
   - Quay repo exists and is accessible
   - Konflux component appears in the tenant
   - A test push triggers a build

## Monitoring Progress

After the DevOps skill has been invoked:

1. Check if the YAML was committed to the onboarding repo
2. Watch for automated PRs (typically 2-4 hours after YAML commit)
3. Review and merge each PR
4. Verify end-to-end by pushing a small change to the downstream repo

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| DevOps skill not found | Install from skills-registry or ask DevOps team |
| GitLab CI didn't process YAML | Check the GitLab CI pipeline status; may need manual trigger |
| PRs not appearing | Wait up to 4 hours; check GitLab CI logs for errors |
| Build fails after merge | Check Dockerfile path, service account permissions, Quay access |
| Image not pushed to Quay | Verify robot account has push permissions; check Konflux logs |
