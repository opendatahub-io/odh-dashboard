# Tekton Pipeline Templates

Templates for Konflux CI pipelines in `opendatahub-io/odh-dashboard`. All pipelines use PipelinesAsCode and reference `odh-konflux-central.git` for the actual pipeline definition.

## Substitution Variables

Replace these placeholders when scaffolding from the templates:

| Variable | Description | Example (Type A) | Example (Type B) |
|----------|-------------|-------------------|-------------------|
| `{{COMPONENT_NAME}}` | Component identifier | `gen-ai` | `dashboard-operator` |
| `{{COMPONENT_CI_NAME}}` | Konflux component name | `odh-mod-arch-gen-ai-ci` | `dashboard-operator-ci` |
| `{{PIPELINE_NAME_PREFIX}}` | Pipeline run name prefix | `odh-mod-arch-gen-ai` | `dashboard-operator` |
| `{{QUAY_IMAGE}}` | Quay.io image path | `quay.io/opendatahub/odh-mod-arch-gen-ai` | `quay.io/opendatahub/dashboard-operator` |
| `{{DOCKERFILE_PATH}}` | Path to Dockerfile | `packages/gen-ai/Dockerfile.workspace` | `dashboard-operator/Dockerfile` |
| `{{PATH_CHANGED_EXPR}}` | CEL path filter | `"packages/gen-ai/**"` | `"dashboard-operator/**"` |
| `{{EXTRA_PATH_EXPR}}` | Additional path triggers | `\|\| "Dockerfile.workspace".pathChanged()` | `\|\| "manifests/**".pathChanged()` |
| `{{SERVICE_ACCOUNT}}` | Build pipeline SA | `build-pipeline-genai-poc` | `build-pipeline-dashboard-operator` |

## Naming Conventions

- **Type A** (modular-arch packages): `odh-mod-arch-<name>-{push,pull-request}.yaml`
- **Type B** (standalone Go components): `<name>-{push,pull-request}.yaml`

## Template: Push Pipeline

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  annotations:
    build.appstudio.openshift.io/repo: https://github.com/opendatahub-io/odh-dashboard?rev={{revision}}
    build.appstudio.redhat.com/commit_sha: '{{revision}}'
    build.appstudio.redhat.com/target_branch: '{{target_branch}}'
    pipelinesascode.tekton.dev/cancel-in-progress: "true"
    pipelinesascode.tekton.dev/max-keep-runs: "3"
    pipelinesascode.tekton.dev/on-cel-expression: event == "push" && target_branch
      == "main" && ( "{{PATH_CHANGED_EXPR}}".pathChanged()
      || ".tekton/{{PIPELINE_NAME_PREFIX}}-push.yaml".pathChanged() {{EXTRA_PATH_EXPR}}
      )
  creationTimestamp: null
  labels:
    appstudio.openshift.io/application: opendatahub-builds
    appstudio.openshift.io/component: {{COMPONENT_CI_NAME}}
    pipelines.appstudio.openshift.io/type: build
  name: {{PIPELINE_NAME_PREFIX}}-on-push
  namespace: open-data-hub-tenant
spec:
  params:
  - name: git-url
    value: '{{source_url}}'
  - name: revision
    value: '{{revision}}'
  - name: output-image
    value: {{QUAY_IMAGE}}:odh-stable
  - name: dockerfile
    value: {{DOCKERFILE_PATH}}
  - name: path-context
    value: .
  - name: additional-tags
    value:
    - 'odh-stable-{{revision}}'
  pipelineRef:
    resolver: git
    params:
    - name: url
      value: https://github.com/opendatahub-io/odh-konflux-central.git
    - name: revision
      value: main
    - name: pathInRepo
      value: pipeline/multi-arch-container-build.yaml
  taskRunTemplate:
    serviceAccountName: {{SERVICE_ACCOUNT}}
  workspaces:
  - name: git-auth
    secret:
      secretName: '{{ git_auth_secret }}'
status: {}
```

## Template: Pull Request Pipeline

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  annotations:
    build.appstudio.openshift.io/repo: https://github.com/opendatahub-io/odh-dashboard?rev={{revision}}
    build.appstudio.redhat.com/commit_sha: '{{revision}}'
    build.appstudio.redhat.com/target_branch: '{{target_branch}}'
    build.appstudio.redhat.com/pull_request_number: '{{pull_request_number}}'
    pipelinesascode.tekton.dev/cancel-in-progress: "true"
    pipelinesascode.tekton.dev/max-keep-runs: "3"
    pipelinesascode.tekton.dev/on-cel-expression: event == "pull_request" && target_branch
      == "main" && ( "{{PATH_CHANGED_EXPR}}".pathChanged()
      || ".tekton/{{PIPELINE_NAME_PREFIX}}-pull-request.yaml".pathChanged() {{EXTRA_PATH_EXPR}}
      )
  creationTimestamp: null
  labels:
    appstudio.openshift.io/application: opendatahub-builds
    appstudio.openshift.io/component: {{COMPONENT_CI_NAME}}
    pipelines.appstudio.openshift.io/type: build
  name: {{PIPELINE_NAME_PREFIX}}-on-pull-request
  namespace: open-data-hub-tenant
spec:
  params:
  - name: git-url
    value: '{{source_url}}'
  - name: revision
    value: '{{revision}}'
  - name: output-image
    value: {{QUAY_IMAGE}}:odh-pr
  - name: dockerfile
    value: {{DOCKERFILE_PATH}}
  - name: path-context
    value: .
  - name: additional-tags
    value:
    - 'odh-pr-{{revision}}'
  - name: pipeline-type
    value: pull-request
  pipelineRef:
    resolver: git
    params:
    - name: url
      value: https://github.com/opendatahub-io/odh-konflux-central.git
    - name: revision
      value: main
    - name: pathInRepo
      value: pipeline/multi-arch-container-build.yaml
  taskRunTemplate:
    serviceAccountName: {{SERVICE_ACCOUNT}}
  workspaces:
  - name: git-auth
    secret:
      secretName: '{{ git_auth_secret }}'
status: {}
```

## Type A vs Type B Differences

| Aspect | Type A (modular-arch package) | Type B (standalone Go component) |
|--------|-------------------------------|----------------------------------|
| File naming | `odh-mod-arch-<name>-*.yaml` | `<name>-*.yaml` |
| Path filter | `packages/<name>/**` | `<name>/**` |
| Extra paths | `Dockerfile.workspace` | `manifests/**` |
| Dockerfile | `packages/<name>/Dockerfile.workspace` | `<name>/Dockerfile` |
| Image name | `odh-mod-arch-<name>` | `<name>` |
| SA naming | `build-pipeline-<custom>` | `build-pipeline-<name>` |

## Service Account Provisioning

The `serviceAccountName` must match a service account provisioned in the `open-data-hub-tenant` namespace. This is handled by DevOps as part of Konflux component onboarding — the SA is created along with the Quay repository and Konflux component registration. Do not create pipelines until the SA exists.
