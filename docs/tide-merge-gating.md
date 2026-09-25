# Tide Merge Gating

Tide merges pull requests for this repository after both Tide and GitHub agree that a pull request is eligible. Treat those as separate enforcement layers: satisfying Tide labels and checks does not override a GitHub ruleset.

## Merge Requirements

Before marking a pull request ready to merge:

- Obtain the `lgtm` and `approved` labels required by the repository's Tide query.
- Obtain a native GitHub approving review. Prow labels do not satisfy a GitHub ruleset that requires an approving review.
- Resolve conversations when an active GitHub ruleset requires conversation resolution.
- Confirm every required status is successful, including `Dashboard Operator Tests`.
- Remove blocking labels such as `do-not-merge/hold` only after the pull request is ready.

Use the pull request's `tide` status for the current eligibility result. Follow its details link for the complete list of unmet Tide criteria.

## Operator Test Gate

The [`dashboard-operator-tests.yml`](../.github/workflows/dashboard-operator-tests.yml) workflow always reports the `Dashboard Operator Tests` job on pull requests:

- Changes under `dashboard-operator/**`, `manifests/**`, or to the workflow run the full operator suite.
- Unrelated changes report a successful no-op from the same job.
- Documentation-only and `.gitignore` changes under the operator or manifests directories also use the no-op path.

The stable job name lets Tide require the context without deadlocking pull requests that do not change operator code. Do not rename the job without coordinating the corresponding Tide configuration change.

## Interactions

| System          | Responsibility                                                         | Source of Truth                                                                                                       |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions  | Report repository test results for each pull request commit            | [Workflow definitions](../.github/workflows/)                                                                         |
| Tide            | Select and merge pull requests whose labels and required contexts pass | [`openshift/release` Prow configuration](https://github.com/openshift/release/tree/main/core-services/prow/02_config) |
| GitHub rulesets | Enforce native reviews and other repository-side merge restrictions    | Repository settings and the effective rules shown by GitHub                                                           |

Tide does not interpret individual GitHub ruleset rules. Its configuration must respect GitHub's aggregate blocked state so that a pull request rejected by GitHub is not repeatedly selected for merge.

## Diagnose a Blocked Pull Request

1. Open the pull request's `tide` status details and identify missing labels or contexts.
2. Confirm the head commit has a native approving review and all required checks are successful.
3. Check for unresolved conversations if conversation resolution is enabled in the effective GitHub rulesets.
4. Open the [Tide dashboard](https://prow.ci.openshift.org/tide) and locate the `opendatahub-io/odh-dashboard` pool for the target branch.
5. If Tide repeatedly attempts the same pull request and commit, add a hold to remove it from the pool while the Tide-versus-GitHub configuration mismatch is investigated.
6. Escalate a mismatch to the repository owners and the OpenShift CI administrators with the pull request number, head SHA, Tide history, and GitHub rejection message.

Do not work around a mismatch by weakening a required test. Reconcile Tide configuration with the effective GitHub rules instead.
