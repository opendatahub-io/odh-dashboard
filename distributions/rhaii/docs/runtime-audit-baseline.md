# RHAII Runtime Audit Baseline

Captured on 2026-11-04 using the [runtime audit](runtime-audit.md). This snapshot describes the production output after the namespace and notification migration, with uncommitted audit tooling present. It is evidence for the remaining work, not a passing baseline exemption.

Both commands completed a production compilation: report mode exited 0; strict mode exited 1 for the violations below. All 177 forbidden module instances are in lazy chunks, which are still part of the production output. Counts describe bundler module instances, not unique files or bytes.

## Follow-up Work Indicated by the Build

- Remove KServe frontend registration and its transitive dependencies when the replacement serving integration is ready.
- Remove the legacy application settings and dashboard configuration paths reached through shared hardware profiles. Move runtime constants and enums to their owning shared package where needed.
- Replace the legacy workload and Kueue status dependencies used by LLMD deployment watching.
- Replace the legacy gateway proxy helper while preserving the required transport behavior.
- Remove legacy settings UI and permission helpers from emitted LLMD paths, or exclude settings outside the supported production scope. Preserve permission enforcement when replacing shared access checks.

Re-run the audit after each change: removing one importer can leave the same forbidden module reachable through another. OpenShift API independence and production AKS qualification remain separate validation work.

## Recorded Production Report

Boundary: **FAIL**

Source revision: e820caefd25cb11868d59c38b2d85a97b91885ee; working tree dirty: true.
Build hash: c42fe426f6a9367b; Rspack: 2.2.4.

6664 runtime modules; 1 initial chunks; 210 lazy chunks; 177 violations.
108 modules without emitted chunk membership excluded.

### Forbidden Runtime Owners

| Owner | Modules | Initial | Lazy only |
| --- | ---: | ---: | ---: |
| @odh-dashboard/internal | 133 | 0 | 133 |
| packages/kserve | 44 | 0 | 44 |

### Imports Crossing The Boundary

| Importer | Forbidden module |
| --- | --- |
| `distributions/rhaii/src/distribution-extensions.ts` | `packages/kserve/extensions.ts` |
| `packages/hardware-profiles/shared/HardwareProfileSelect.tsx` | `frontend/src/app/useApplicationSettings.tsx` |
| `packages/hardware-profiles/shared/index.ts` | `frontend/src/app/appUtils.ts` |
| `packages/hardware-profiles/shared/index.ts` | `frontend/src/app/useApplicationSettings.tsx` |
| `packages/hardware-profiles/shared/index.ts` | `frontend/src/app/useTimeBasedRefresh.ts` |
| `packages/hardware-profiles/shared/index.ts` | `frontend/src/services/dashboardConfigService.ts` |
| `packages/hardware-profiles/src/pages/manage/validationUtils.ts` | `frontend/src/concepts/hardwareProfiles/const.ts` |
| `packages/hardware-profiles/src/pages/manage/validationUtils.ts` | `frontend/src/concepts/hardwareProfiles/types.ts` |
| `packages/hardware-profiles/src/pages/nodeResource/utils.ts` | `frontend/src/concepts/hardwareProfiles/types.ts` |
| `packages/hardware-profiles/src/pages/utils.ts` | `frontend/src/concepts/hardwareProfiles/types.ts` |
| `packages/llmd-serving/src/api/services/gatewayDiscovery.ts` | `frontend/src/api/proxyUtils.ts` |
| `packages/llmd-serving/src/deployments/useWatchDeployments.ts` | `frontend/src/api/k8s/workloads.ts` |
| `packages/llmd-serving/src/deployments/useWatchDeployments.ts` | `frontend/src/pages/modelServing/useKueueStatusWithQueuePositions.ts` |
| `packages/llmd-serving/src/settings/llmAcceleratorConfigs/DeleteLlmAcceleratorConfigModal.tsx` | `frontend/src/pages/projects/components/DeleteModal.tsx` |
| `packages/llmd-serving/src/settings/llmAcceleratorConfigs/LlmAcceleratorConfigTableRow.tsx` | `frontend/src/concepts/k8s/utils.ts` |
| `packages/llmd-serving/src/settings/LlmInferenceServiceConfigAccessGate.tsx` | `frontend/src/concepts/userSSAR/useAccessAllowed.ts` |
| `packages/llmd-serving/src/settings/LlmInferenceServiceConfigAccessGate.tsx` | `frontend/src/concepts/userSSAR/utils.ts` |
| `packages/llmd-serving/src/settings/routingConfigs/RoutingConfigurationRow.tsx` | `frontend/src/components/table/TableRowTitleDescription.tsx` |
| `packages/llmd-serving/src/settings/routingConfigs/RoutingConfigurationRow.tsx` | `frontend/src/concepts/userSSAR/index.ts` |
| `packages/llmd-serving/src/settings/routingConfigs/RoutingConfigurationsTable.tsx` | `frontend/src/pages/projects/components/DeleteModal.tsx` |
| `packages/llmd-serving/src/settings/topologyConfigs/TopologyConfigurationRow.tsx` | `frontend/src/components/table/TableRowTitleDescription.tsx` |
| `packages/llmd-serving/src/settings/topologyConfigs/TopologyConfigurationRow.tsx` | `frontend/src/concepts/userSSAR/index.ts` |
| `packages/llmd-serving/src/settings/topologyConfigs/TopologyConfigurationsTable.tsx` | `frontend/src/pages/projects/components/DeleteModal.tsx` |

### Importer Path Examples

- `packages/kserve/extensions.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts`
- `frontend/src/app/useApplicationSettings.tsx`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/hardware.ts` → `packages/hardware-profiles/shared/index.ts` → `frontend/src/app/useApplicationSettings.tsx`
- `frontend/src/app/appUtils.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/hardware.ts` → `packages/hardware-profiles/shared/index.ts` → `frontend/src/app/appUtils.ts`
- `frontend/src/app/useTimeBasedRefresh.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/hardware.ts` → `packages/hardware-profiles/shared/index.ts` → `frontend/src/app/useTimeBasedRefresh.ts`
- `frontend/src/services/dashboardConfigService.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/hardware.ts` → `packages/hardware-profiles/shared/index.ts` → `frontend/src/services/dashboardConfigService.ts`
- `frontend/src/concepts/hardwareProfiles/const.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/deployServer.ts` → `frontend/src/api/index.ts` → `frontend/src/concepts/hardwareProfiles/utils.ts` → `frontend/src/concepts/hardwareProfiles/const.ts`
- `frontend/src/concepts/hardwareProfiles/types.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/hardware.ts` → `packages/hardware-profiles/shared/index.ts` → `packages/hardware-profiles/src/pages/utils.ts` → `frontend/src/concepts/hardwareProfiles/types.ts`
- `frontend/src/api/proxyUtils.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/llmd-serving/extensions/extensions.ts` → `packages/llmd-serving/src/wizardFields/gateway/gatewaySelectApplyExtract.ts` → `packages/llmd-serving/src/api/services/gatewayDiscovery.ts` → `frontend/src/api/proxyUtils.ts`
- `frontend/src/api/k8s/workloads.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/deployments.ts` → `frontend/src/api/k8s/workloads.ts`
- `frontend/src/pages/modelServing/useKueueStatusWithQueuePositions.ts`
  - `distributions/rhaii/src/index.tsx` → `distributions/rhaii/src/bootstrap.tsx` → `distributions/rhaii/src/distribution-extensions.ts` → `packages/kserve/extensions.ts` → `packages/kserve/src/deployments.ts` → `frontend/src/pages/modelServing/useKueueStatusWithQueuePositions.ts`

The JSON report contains the complete module/chunk inventory and all violations.

This build audit does not prove which chunks a browser requests or inspect code fetched from arbitrary URLs. Production browser/network validation and AKS lifecycle qualification remain required.
