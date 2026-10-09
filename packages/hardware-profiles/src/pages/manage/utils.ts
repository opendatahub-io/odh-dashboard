import { type Identifier, IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { DEFAULT_CPU_IDENTIFIER, DEFAULT_MEMORY_IDENTIFIER } from '../nodeResource/const';

const K8S_RESOURCE_PATTERN = /hardwareprofiles\.\S+/gi;

export const humanizeHardwareProfileError = (message: string): string => {
  if (/already exists/i.test(message)) {
    const nameMatch = message.match(/"([^"]+)"/);
    const name = nameMatch?.[1];
    return name
      ? `A hardware profile with the name "${name}" already exists. Please use a different name.`
      : 'A hardware profile with this name already exists. Please use a different name.';
  }

  return message.replace(K8S_RESOURCE_PATTERN, 'hardware profile');
};

export const hasCPUandMemory = (nodeResources: Identifier[]): boolean =>
  nodeResources.some(
    (identifier) =>
      identifier.resourceType === IdentifierResourceType.CPU ||
      identifier.identifier === DEFAULT_CPU_IDENTIFIER,
  ) &&
  nodeResources.some(
    (identifier) =>
      identifier.resourceType === IdentifierResourceType.MEMORY ||
      identifier.identifier === DEFAULT_MEMORY_IDENTIFIER,
  );
