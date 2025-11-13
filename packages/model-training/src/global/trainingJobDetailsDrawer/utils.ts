import { ClusterQueueKind } from '@odh-dashboard/internal/k8sTypes.js';
import {
  CPU_UNITS,
  MEMORY_UNITS_FOR_PARSING,
  splitValueUnit,
  UnitOption,
} from '@odh-dashboard/internal/utilities/valueUnits';

/**
 * Converts a value string (e.g., "8Gi") to a numeric value in the base unit
 */
export const convertToBaseUnit = (valueStr: string | number, resourceName: string): number => {
  if (typeof valueStr === 'number') {
    return valueStr;
  }

  let units: UnitOption[];
  if (resourceName === 'cpu') {
    units = CPU_UNITS;
  } else if (resourceName === 'memory') {
    units = MEMORY_UNITS_FOR_PARSING;
  } else {
    return Number(valueStr) || 0;
  }

  const [value, unit] = splitValueUnit(valueStr, units);
  return (value ?? 0) * unit.weight;
};

export const getAllConsumedResources = (
  clusterQueue: ClusterQueueKind,
): Array<{
  name: string;
  label: string;
  total: string;
  consumed: string;
  percentage: number;
}> => {
  if (!clusterQueue.status?.flavorsUsage?.[0] || !clusterQueue.spec.resourceGroups?.[0]) {
    return [];
  }

  const { flavorsUsage } = clusterQueue.status;
  const resourceMap = new Map<string, { consumed: string | number; quota: string | number }>();

  flavorsUsage.forEach((flavor) => {
    const { resources: flavorResources = [] } = flavor;
    flavorResources.forEach((resource) => {
      if (!resourceMap.has(resource.name)) {
        const consumed = resource.total || 0;
        // Search through all resource groups to find the matching flavor and resource
        const matchingFlavor = clusterQueue.spec.resourceGroups
          ?.flatMap((rg) => rg.flavors)
          .find((f) => f.name === flavor.name)
          ?.resources.find((r) => r.name === resource.name);
        const quota = matchingFlavor?.nominalQuota || 0;

        resourceMap.set(resource.name, { consumed, quota });
      }
    });
  });

  const formattedResources: Array<{
    name: string;
    label: string;
    total: string;
    consumed: string;
    percentage: number;
  }> = [];

  resourceMap.forEach((value, key) => {
    const { consumed, quota } = value;

    const consumedInBaseUnit = convertToBaseUnit(consumed, key);
    const quotaInBaseUnit = convertToBaseUnit(quota, key);

    const percentage =
      quotaInBaseUnit > 0 ? Math.round((consumedInBaseUnit / quotaInBaseUnit) * 100) : 0;

    let label = key;
    if (key === 'cpu') {
      label = 'CPU';
    } else if (key === 'memory') {
      label = 'Memory';
    }

    formattedResources.push({
      name: key,
      label,
      total: String(quota),
      consumed: String(consumed),
      percentage,
    });
  });

  /**
   * Sort the resources by name in the order of cpu, memory, other resources
   */
  return formattedResources.toSorted((a, b) => {
    const order: Record<string, number> = { cpu: 0, memory: 1 };
    const DEFAULT_ORDER = 2; // Any number > 1 works to place resources after CPU and Memory
    const aOrder = order[a.name] ?? DEFAULT_ORDER;
    const bOrder = order[b.name] ?? DEFAULT_ORDER;
    return aOrder - bOrder;
  });
};
