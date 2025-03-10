import React from 'react';
import { ImageStreamKind, AcceleratorProfileKind, HardwareProfileKind } from '~/k8sTypes';
import { getCompatibleIdentifiers } from '~/pages/projects/screens/spawner/spawnerUtils';
import {
  Toleration,
  NodeSelector,
  Identifier,
  ContainerResources,
  IdentifierResourceType,
} from '~/types';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { splitValueUnit, CPU_UNITS, MEMORY_UNITS_FOR_PARSING } from '~/utilities/valueUnits';

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
      return `${cpuValue} ${cpuUnit.name}`;
    }
    case IdentifierResourceType.MEMORY: {
      const [memoryValue, memoryUnit] = splitValueUnit(valueStr, MEMORY_UNITS_FOR_PARSING);
      return `${memoryValue} ${memoryUnit.name}`;
    }
    default:
      return v;
  }
};
