# Project Matrix: Gateway layer milestone

Project Matrix is the upstream-first Red Hat AI Stack effort to make each
horizontal platform layer available as a guided, low-friction installer in AI
Hub. The Gateway layer is the first executable slice. Vertical/use-case
installers build on these horizontal contracts later; they do not replace them.

## Operating contract

- Production is the default lane.
- Innovation is an explicit evaluation lane for Technology Preview and
  Developer Preview dependencies.
- Both lanes ship together. The lane switch changes the selected support
  contract; it does not create a separate product or installer.
- The workflow validates the existing OpenShift AI and Red Hat platform
  baseline. It never upgrades or removes shared operators, RHCL, Gateway API,
  cluster ingress, or other platform-owned services.
- Project Matrix creates and removes only resources it owns in the selected
  project.
- The end user sees a guided operation and live status, not implementation
  scripts or cluster-administration steps.

## Arbitrary-cluster portability contract

The installer is portable across supported OpenShift AI cluster instances. It
does not depend on the Catalyst hostname, a fixed namespace, `kube:admin`, a
named end user, a specific ingress certificate, or a cluster-specific Gateway
name.

Each target cluster still has two explicit platform prerequisites:

- The dashboard service account receives the Project Matrix Gateway installer
  ClusterRole, which is the only identity allowed to create and remove
  Project Matrix-owned layer resources. That ClusterRole includes the narrowly
  scoped `bind` permission for the built-in `view` ClusterRole, allowing the
  installer to attach read-only MCP runtime access without granting the
  dashboard service account those read permissions itself.
- The selected end-user group, or a specifically named evaluator, is granted
  `get`, `list`, `create`, `patch`, and `delete` on
  `mcpservers.mcp.x-k8s.io` in the selected project. This is the
  authorization boundary for the one-click operation; the product must not
  bind a hard-coded user name.

The installer never grants arbitrary roles. It accepts only the catalog's
read-only `view` prerequisite and creates a Project Matrix-owned binding for
the generated MCP runtime service account. If the installer ClusterRole is not
installed, the cluster administrator must apply it before an end user can run
the Gateway operation.

The `installer-access.yaml` file is an OpenShift `Template`, not a
cluster-specific manifest. Its default subject is the named
`project-matrix-gateway-installers` evaluator group. A deployment can target
any project and change that subject to the customer’s existing group or to one
named evaluator without changing the dashboard image. It must not use
`system:authenticated` as a product default.

For example, a cluster administrator can configure a group in any target
project with:

```sh
oc process -f manifests/project-matrix/gateway/installer-access.yaml \
  -p PROJECT_MATRIX_NAMESPACE=<target-project> \
  -p PROJECT_MATRIX_INSTALLER_SUBJECT_KIND=Group \
  -p PROJECT_MATRIX_INSTALLER_SUBJECT_NAME=<approved-evaluator-group> \
  | oc apply -f -
```

For a named evaluator, set `PROJECT_MATRIX_INSTALLER_SUBJECT_KIND=User` and
provide that user’s OpenShift identity as the subject name. The dashboard
image and one-click workflow remain unchanged across clusters.

This keeps the test path frictionless after one administrator grants the
approved group, while preserving the same namespace-scoped authorization
boundary for customer deployments.

## Gateway-layer definition of done

The Gateway layer is complete only when the installer can report all three
states independently:

1. Installed: the layer-owned resources exist.
2. Healthy: the platform prerequisites, MCP capability, and registration are
   Ready.
3. Usable: authenticated `initialize`, `tools/list`, and `tools/call` probes
   succeed through the exposed Gateway path.

MCP is the first executable capability and an important demonstration path,
but an MCP-only deployment is not represented as the complete Gateway layer.
MaaS Gateway, Inference Gateway, identity/exposure, and routing/quotas remain
explicit implementation gates until their adapters and probes exist.

## Current milestone

- [x] Upstream AI Hub navigation to the Red Hat AI Stack and Gateway layer.
- [x] Production-default and explicit Innovation lane presentation.
- [x] MCP guided installer with prerequisite, review, install, and polling
  states.
- [x] End-user authorization separated from the dashboard service-account
  mutation path.
- [x] Project-scoped ownership labels and a safe Gateway-layer uninstaller.
- [x] Read-only platform readiness checks for MCP Lifecycle, MCP Gateway, and
  Gateway API listener availability.
- [x] Gateway-layer status API contract and UI polling surface distinguishing
  installed, healthy, usable, blocked, partial, and not implemented.
- [x] Focused status-semantic unit tests.
- [x] Authenticated usability probes for `initialize`, `tools/list`, and
  `tools/call` through the exposed Gateway path.
- [x] Live dashboard image rollout and BFF verification on the evaluation
  OpenShift AI instance.
- [x] Uninstaller waits for owned resources to disappear before reporting
  success, with an explicit cleanup state and timeout failure.
- [ ] MaaS Gateway adapter and validation.
- [ ] Inference Gateway adapter and validation.
- [ ] Identity, TLS, exposure, routing, quota, and conformance probes.
- [ ] Live teardown/reinstall/upgrade-compatibility validation.
- [ ] Configured evaluator-group or named-user validation on the live
  OpenShift AI instance.
- [ ] Upstream contribution review and merge-request preparation.

## Live milestone evidence

Validated on 2026-11-04 against the evaluation OpenShift AI instance:

- Dashboard image: `quay.io/rh-ee-gtrotman/odh-mod-arch-modular-architecture:project-matrix-mcp-usable-20261104-amd64`.
- MCP Lifecycle, MCP Gateway, MCP capability, and MCP registration report
  healthy.
- Authenticated `initialize`, `tools/list`, and `tools/call` probes report
  usable through the public Gateway route.
- The overall layer remains partial by design while MaaS, inference,
  identity/exposure, and routing/quotas adapters are not implemented.
- The remaining shareability gates are browser validation as `JayDi11a`,
  teardown/reinstall evidence, and upstream contribution preparation.
- Current live module image for uninstall verification:
  `quay.io/rh-ee-gtrotman/odh-mod-arch-modular-architecture:project-matrix-uninstall-20261109-amd64`
  at digest
  `sha256:4ebd80f882577f9cb8f51b7de155fdd77694446a265c4c81af7a3df2bae10948`.

## Validation sequence

1. Compile the affected Go packages and run the status-semantic tests.
2. Build the dashboard image for the target architecture and publish it to the
   evaluation registry.
3. Roll out the image to the live OpenShift AI dashboard without changing
   shared platform operators.
4. Sign in through the normal AI Hub user experience and select a dedicated
   evaluation project; do not use `ai-first-notebook`.
5. Confirm the Gateway layer reports the platform baseline separately from
   the MCP capability status.
6. Install the MCP capability, observe live transitions, validate the
   authenticated request path, then remove only the Project Matrix-owned
   resources.
7. Repeat the install after teardown and record evidence before committing and
   pushing the milestone.

## Uninstall verification milestone — 2026-11-09

The uninstaller now waits on Kubernetes state rather than treating delete
request acceptance as completion. It verifies that the owned MCPServer,
registration, routes, grants, RBAC, configuration, and operator-owned
dependents are gone. Gateway-layer removal also waits for Project Matrix-owned
resources to disappear and does not remove shared platform services.

The UI keeps the cleanup operation visible with **Waiting for cluster
cleanup** messaging. A timeout is reported as a blocked cleanup result. The
updated federated `model-registry-ui` is live and healthy on the evaluation
cluster. The image was built through `packages/model-registry/Dockerfile.workspace`
for Linux/amd64. Fresh install/uninstall browser validation remains open.

## Evidence and ownership

Every status shown in AI Hub must point to cluster evidence or an explicit
validation gate. A missing adapter must be shown as not implemented, not
silently counted as healthy. Shared infrastructure remains read-only to this
workflow. The current evaluation-cluster access binding is environment
specific and is not a product authorization model.
