import { ClusterQueueKind, WorkloadKind } from '#~/k8sTypes';
import {
  CPU_UNITS,
  MEMORY_UNITS_FOR_PARSING,
  splitValueUnit,
  UnitOption,
} from '#~/utilities/valueUnits';

type ResourceUnitConfig = { units: UnitOption[]; numericMultiplier?: number };

const RESOURCE_BASE_UNITS: Partial<Record<string, ResourceUnitConfig>> = {
  cpu: {
    units: CPU_UNITS,
    numericMultiplier: 1000,
  },
  memory: {
    units: MEMORY_UNITS_FOR_PARSING,
    numericMultiplier: 1,
  },
};

/**
 * Converts a value (string with optional unit, e.g. "9700m", "200Gi", or plain number)
 * to a numeric value in the resource's base unit for comparison.
 */
const convertToBaseUnit = (value: string | number, resourceName: string): number => {
  const config = RESOURCE_BASE_UNITS[resourceName];

  if (typeof value === 'number') {
    if (config && config.numericMultiplier != null) {
      return value * config.numericMultiplier;
    }
    return value;
  }

  if (config) {
    const [parsedValue, unit] = splitValueUnit(value, config.units);
    return (parsedValue ?? 0) * unit.weight;
  }

  return Number(value) || 0;
};

export type ConsumedResource = {
  name: string;
  label: string;
  total: string;
  consumed: string;
  percentage: number;
};

/**
 * Extracts the assigned flavor name from a Kueue Workload's admission.
 * Used to show consumed/quota for the flavor this workload is using (workbench, model deployment, etc.).
 * @returns The flavor name from the first pod set's flavors, or undefined if not admitted
 */
export const getAssignedFlavorFromWorkload = (
  workload: WorkloadKind | null | undefined,
): string | undefined => {
  const podSetAssignments = workload?.status?.admission?.podSetAssignments;
  const assignment = podSetAssignments && podSetAssignments[0];
  const flavors = assignment?.flavors;
  if (!flavors || typeof flavors !== 'object') {
    return undefined;
  }
  const first = Object.values(flavors)[0];
  return typeof first === 'string' ? first : undefined;
};

/**
 * Computes total quota and consumed usage per resource from a ClusterQueue's
 * flavorsUsage and resourceGroups. Used by workbench Resources tab and model serving.
 *
 * @param clusterQueue - The ClusterQueue
 * @param assignedFlavorName - When provided, only this flavor's usage and quota are returned (for workload-specific remaining)
 */
export const getAllConsumedResources = (
  clusterQueue: ClusterQueueKind,
  assignedFlavorName?: string,
): ConsumedResource[] => {
  if (!clusterQueue.status?.flavorsUsage?.[0] || !clusterQueue.spec.resourceGroups?.[0]) {
    return [];
  }

  const { flavorsUsage } = clusterQueue.status;
  const flavorsToUse = assignedFlavorName
    ? flavorsUsage.filter((f) => f.name === assignedFlavorName)
    : flavorsUsage;
  if (flavorsToUse.length === 0) {
    return [];
  }

  const resourceMap = new Map<string, { consumed: string | number; quota: string | number }>();

  flavorsToUse.forEach((flavor) => {
    const { resources: flavorResources = [] } = flavor;
    flavorResources.forEach((resource) => {
      if (!resourceMap.has(resource.name)) {
        const consumed = resource.total || 0;
        const matchingFlavor = clusterQueue.spec.resourceGroups
          ?.flatMap((rg) => rg.flavors)
          .find((f) => f.name === flavor.name)
          ?.resources.find((r) => r.name === resource.name);
        const quota = matchingFlavor?.nominalQuota || 0;

        resourceMap.set(resource.name, { consumed, quota });
      }
    });
  });

  const formattedResources: ConsumedResource[] = [];

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

  return formattedResources.toSorted((a, b) => {
    const order: Record<string, number> = { cpu: 0, memory: 1 };
    const DEFAULT_ORDER = 2;
    const aOrder = order[a.name] ?? DEFAULT_ORDER;
    const bOrder = order[b.name] ?? DEFAULT_ORDER;
    return aOrder - bOrder;
  });
};
