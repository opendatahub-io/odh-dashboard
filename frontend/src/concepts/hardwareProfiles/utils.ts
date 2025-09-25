import React from 'react';
import {
  ImageStreamKind,
  AcceleratorProfileKind,
  HardwareProfileKind,
  InferenceServiceKind,
  NotebookKind,
} from '#~/k8sTypes';
import { getCompatibleIdentifiers } from '#~/pages/projects/screens/spawner/spawnerUtils';
import {
  Toleration,
  NodeSelector,
  Identifier,
  ContainerResources,
  IdentifierResourceType,
} from '#~/types';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import { splitValueUnit, CPU_UNITS, MEMORY_UNITS_FOR_PARSING } from '#~/utilities/valueUnits';
import { ResourceType, SupportedResource } from './types';

export const formatToleration = (toleration: Toleration): string => {
  const parts = [`Key = ${toleration.key}`];

  if (toleration.value !== undefined) {
    parts.push(`Value = ${toleration.value}`);
  }

  if (toleration.effect !== undefined) {
    parts.push(`Effect = ${toleration.effect}`);
  }

  if (toleration.operator !== undefined) {
    parts.push(`Operator = ${toleration.operator}`);
  }

  if (toleration.tolerationSeconds !== undefined) {
    parts.push(`Toleration seconds = ${toleration.tolerationSeconds}`);
  }

  return parts.join('; ');
};

export const formatNodeSelector = (selector: NodeSelector): string[] =>
  Object.entries(selector).map(([key, value]) => `Key = ${key}; Value = ${value}`);

export const formatResource = (identifier: string, request: string, limit: string): string =>
  `${identifier}: Request = ${request}; Limit = ${limit}`;

export const useProfileIdentifiers = (
  acceleratorProfile?: AcceleratorProfileKind,
  hardwareProfile?: HardwareProfileKind,
): string[] => {
  const [identifiers, setIdentifiers] = React.useState<string[]>([]);
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  React.useEffect(() => {
    if (isHardwareProfilesAvailable && hardwareProfile) {
      const profileIdentifiers =
        hardwareProfile.spec.identifiers?.map((identifier) => identifier.identifier) ?? [];
      setIdentifiers(profileIdentifiers);
    } else if (acceleratorProfile) {
      setIdentifiers([acceleratorProfile.spec.identifier]);
    } else {
      setIdentifiers([]);
    }
  }, [acceleratorProfile, hardwareProfile, isHardwareProfilesAvailable]);

  return identifiers;
};

export const doesImageStreamSupportHardwareProfile = (
  hardwareProfile: HardwareProfileKind,
  imageStream: ImageStreamKind,
): boolean => {
  const compatibleIdentifiers = getCompatibleIdentifiers(imageStream);

  // if any of the identifiers in the image are included in the profile, return true
  return compatibleIdentifiers.some((imageIdentifier) =>
    hardwareProfile.spec.identifiers?.some(
      (profileIdentifier) => profileIdentifier.identifier === imageIdentifier,
    ),
  );
};

export const sortIdentifiers = (identifiers: Identifier[]): Identifier[] => {
  const cpuIdentifier = identifiers.find((i) => i.identifier === 'cpu');
  const memoryIdentifier = identifiers.find((i) => i.identifier === 'memory');
  const otherIdentifiers = identifiers.filter(
    (i) => i.identifier !== 'cpu' && i.identifier !== 'memory',
  );

  return [
    ...(cpuIdentifier ? [cpuIdentifier] : []),
    ...(memoryIdentifier ? [memoryIdentifier] : []),
    ...otherIdentifiers,
  ];
};

export const getContainerResourcesFromHardwareProfile = (
  hardwareProfile: HardwareProfileKind,
): ContainerResources => {
  const emptyRecord: Record<string, string | number> = {};

  const newRequests =
    hardwareProfile.spec.identifiers?.reduce(
      (acc: Record<string, string | number>, identifier) => {
        acc[identifier.identifier] = identifier.defaultCount;
        return acc;
      },
      { ...emptyRecord },
    ) ?? emptyRecord;

  const newLimits =
    hardwareProfile.spec.identifiers?.reduce(
      (acc: Record<string, string | number>, identifier) => {
        acc[identifier.identifier] = identifier.defaultCount;
        return acc;
      },
      { ...emptyRecord },
    ) ?? emptyRecord;

  return {
    requests: newRequests,
    limits: newLimits,
  };
};

export const formatResourceValue = (
  v: string | number,
  resourceType?: IdentifierResourceType,
): string | number => {
  const valueStr = typeof v === 'number' ? v.toString() : v;
  switch (resourceType) {
    case IdentifierResourceType.CPU: {
      const [cpuValue, cpuUnit] = splitValueUnit(valueStr, CPU_UNITS);
      return `${cpuValue ?? ''} ${cpuUnit.name}`;
    }
    case IdentifierResourceType.MEMORY: {
      const [memoryValue, memoryUnit] = splitValueUnit(valueStr, MEMORY_UNITS_FOR_PARSING);
      return `${memoryValue ?? ''} ${memoryUnit.name}`;
    }
    default:
      return v;
  }
};

export const getProfileScore = (profile: HardwareProfileKind): number => {
  const { identifiers } = profile.spec;
  if (!identifiers?.length) {
    return 0;
  }

  // Check if profile has any unlimited resources (no maxValue)
  const hasUnlimitedResources = identifiers.some((identifier) => !identifier.maxCount);
  // Profiles with unlimited resources should sort towards bottom
  if (hasUnlimitedResources) {
    return Number.MAX_SAFE_INTEGER;
  }

  let score = 0;

  // Add up normalized scores for each identifier
  identifiers.forEach((identifier) => {
    const maxValue = identifier.maxCount;
    if (!maxValue) {
      return;
    }

    if (identifier.resourceType === IdentifierResourceType.CPU) {
      // Convert CPU to smallest unit for comparison
      const [value, unit] = splitValueUnit(maxValue.toString(), CPU_UNITS);
      score += (value ?? 0) * unit.weight;
    } else if (identifier.resourceType === IdentifierResourceType.MEMORY) {
      // Convert memory to smallest unit for comparison
      const [value, unit] = splitValueUnit(maxValue.toString(), MEMORY_UNITS_FOR_PARSING);
      score += (value ?? 0) * unit.weight;
    } else {
      score += Number(maxValue);
    }
  });

  return score;
};

export const createHardwareProfileSpecSnapshot = (hardwareProfile: HardwareProfileKind): string => {
  const specSnapshot = {
    identifiers: hardwareProfile.spec.identifiers
      ?.map((identifier) => ({
        displayName: identifier.displayName,
        identifier: identifier.identifier,
        minCount: identifier.minCount,
        maxCount: identifier.maxCount,
        defaultCount: identifier.defaultCount,
        resourceType: identifier.resourceType,
      }))
      .toSorted((a, b) => a.identifier.localeCompare(b.identifier)), // Sort for consistency
    scheduling: hardwareProfile.spec.scheduling
      ? {
          type: hardwareProfile.spec.scheduling.type,
          node: hardwareProfile.spec.scheduling.node
            ? {
                nodeSelector: hardwareProfile.spec.scheduling.node.nodeSelector,
                tolerations: hardwareProfile.spec.scheduling.node.tolerations
                  ?.map((toleration) => ({
                    key: toleration.key,
                    operator: toleration.operator,
                    value: toleration.value,
                    effect: toleration.effect,
                    tolerationSeconds: toleration.tolerationSeconds,
                  }))
                  .toSorted((a, b) => (a.key || '').localeCompare(b.key || '')), // Sort for consistency
              }
            : undefined,
          kueue: hardwareProfile.spec.scheduling.kueue,
        }
      : undefined,
  };

  // Return JSON string for direct storage in annotations
  return JSON.stringify(specSnapshot);
};

/**
 * Compare two hardware profile spec snapshots to detect changes
 */
export const hasHardwareProfileSpecChanged = (
  currentProfile: HardwareProfileKind,
  storedSpecSnapshot?: string,
): boolean => {
  if (!storedSpecSnapshot) {
    return false;
  }
  try {
    const currentSnapshot = createHardwareProfileSpecSnapshot(currentProfile);
    return currentSnapshot !== storedSpecSnapshot;
  } catch (error) {
    return true;
  }
};

export const resourceTypeOf = (r: SupportedResource): ResourceType => {
  return r.kind === 'Notebook' ? 'workbench' : 'deployment';
};

export function isNotebook(r: SupportedResource): r is NotebookKind {
  return r.kind === 'Notebook';
}

export function isInferenceService(r: SupportedResource): r is InferenceServiceKind {
  return r.kind === 'InferenceService';
}

export function extractContainerResources(
  resource: SupportedResource,
): ContainerResources | undefined {
  if (isNotebook(resource)) {
    return resource.spec.template.spec.containers.find(
      (container) => container.name === resource.metadata.name,
    )?.resources;
  }
  if (isInferenceService(resource)) {
    return resource.spec.predictor.model?.resources;
  }
  return undefined;
}
