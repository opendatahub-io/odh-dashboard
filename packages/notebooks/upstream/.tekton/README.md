This directory contains Tekton `PipelineRun` definitions used by Konflux for the `opendatahub-io/workbenches` repository on the `main` branch.

## Pull-request pipelines

`odh-workbenches-controller-pull-request.yaml` builds the controller image for PRs targeting `main`.

- Builds run only when `workspaces/controller/` or `.tekton/` files change.
- PR-built images use the `:odh-pr` tag plus `odh-pr-{{revision}}`, and expire after `7d`.
- Pipeline timeouts are 2h (pipeline) / 1h (per task).
- A new push to the PR cancels the in-progress run.
- Additional pipeline parameters:

```yaml
- name: build-source-image
  value: "false"
- name: enable-slack-failure-notification
  value: "false"
```

## Push pipelines

`odh-workbenches-controller-push.yaml` triggers when changes are merged to `main`. It builds a multi-arch container image and pushes it to Quay.

- Builds run only when `workspaces/controller/` or `.tekton/` files change.
- Pipeline timeouts are 2h (pipeline) / 1h (per task).
- `pipeline-type` is set to `"workbenches-main-build"` instead of the default `"push"`. This deliberately prevents the `trigger-operator-build` task from running, which would otherwise kick off downstream operator, operator-bundle, and FBC fragment CI builds. Those downstream triggers are not needed on the `main` branch.
- Push-built images use the `:main` tag and do not expire.

## Early-gate pipelines

`early-gate-ci-build.yaml` and `early-gate-ci-test.yaml` are triggered by `/early-gate` (or `/early-gate-build`) and `/early-gate-test` issue comments.
