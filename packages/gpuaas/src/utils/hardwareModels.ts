import { ClusterQueueKind, ResourceFlavorKind } from '@odh-dashboard/k8s-core';
import parseK8sQuantity from './parseK8sQuantity';
import { ACCELERATOR_RESOURCE_REGEX } from '../const';

const ACCELERATOR_RE = new RegExp(ACCELERATOR_RESOURCE_REGEX);

export type ModelGpuCount = {
  model: string;
  used: number;
  nominal: number;
  borrowed?: number;
};

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

/** Returns a map of CQ name → per-model GPU counts (nominal, used, borrowed). */
export const resolvePerModelGpuCounts = (
  clusterQueues: ClusterQueueKind[],
  resourceFlavors: ResourceFlavorKind[],
): Map<string, ModelGpuCount[]> => {
  const flavorMap = new Map(resourceFlavors.map((rf) => [rf.metadata?.name ?? '', rf]));

  const result = new Map<string, ModelGpuCount[]>();

  for (const cq of clusterQueues) {
    const countsByModel = new Map<string, ModelGpuCount>();

    for (const rg of cq.spec.resourceGroups ?? []) {
      for (const flavor of rg.flavors) {
        const rf = flavorMap.get(flavor.name);
        let model: string | undefined;
        for (const label of GPU_PRODUCT_LABELS) {
          const value = rf?.spec.nodeLabels?.[label];
          if (value) {
            model = value;
            break;
          }
        }
        if (!model) {
          continue;
        }

        const nominalRes = flavor.resources.find((r) => ACCELERATOR_RE.test(r.name));
        const usageEntry = cq.status?.flavorsUsage?.find((f) => f.name === flavor.name);
        const usedRes = usageEntry?.resources.find((r) => ACCELERATOR_RE.test(r.name));

        const nominal = parseK8sQuantity(nominalRes?.nominalQuota ?? '0');
        const used = parseK8sQuantity(usedRes?.total ?? '0');
        const borrowed =
          usedRes?.borrowed !== undefined ? parseK8sQuantity(usedRes.borrowed) : undefined;

        const existing = countsByModel.get(model);
        if (existing) {
          existing.nominal += nominal;
          existing.used += used;
          if (borrowed !== undefined) {
            existing.borrowed = (existing.borrowed ?? 0) + borrowed;
          }
        } else {
          countsByModel.set(model, { model, nominal, used, borrowed });
        }
      }
    }

    const cqName = cq.metadata?.name ?? '';
    if (cqName) {
      result.set(cqName, [...countsByModel.values()]);
    }
  }

  return result;
};
