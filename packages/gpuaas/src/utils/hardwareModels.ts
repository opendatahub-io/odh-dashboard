import { ClusterQueueKind, ResourceFlavorKind } from '@odh-dashboard/internal/k8sTypes';

const GPU_PRODUCT_LABELS = [
  'nvidia.com/gpu.product',
  'amd.com/gpu.product',
  'intel.com/gpu.product',
] as const;

/**
 * Resolves hardware model names for each ClusterQueue by mapping through
 * its referenced ResourceFlavors' nodeLabels.
 *
 * @returns Map of CQ name -> array of hardware model names (e.g., ["NVIDIA A100"])
 */
export const resolveHardwareModels = (
  clusterQueues: ClusterQueueKind[],
  resourceFlavors: ResourceFlavorKind[],
): Map<string, string[]> => {
  const flavorMap = new Map(resourceFlavors.map((rf) => [rf.metadata?.name ?? '', rf]));

  const result = new Map<string, string[]>();

  for (const cq of clusterQueues) {
    const models = new Set<string>();

    for (const rg of cq.spec.resourceGroups ?? []) {
      for (const flavor of rg.flavors) {
        const rf = flavorMap.get(flavor.name);
        if (!rf?.spec.nodeLabels) {
          continue;
        }
        for (const label of GPU_PRODUCT_LABELS) {
          const value = rf.spec.nodeLabels[label];
          if (value) {
            models.add(value);
          }
        }
      }
    }

    const cqName = cq.metadata?.name ?? '';
    if (cqName) {
      result.set(cqName, [...models]);
    }
  }

  return result;
};
