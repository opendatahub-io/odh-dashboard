import type { HardwareProfile, HardwareProfileResource } from '~/app/types';

export const formatHardwareProfileResourceValue = (
  value: string,
  resource: HardwareProfileResource,
): string => {
  const resourceType = (resource.display_name ?? resource.identifier).toLowerCase();

  if (resourceType === 'cpu' && /^\d+(?:\.\d+)?$/.test(value)) {
    return `${value} ${value === '1' ? 'Core' : 'Cores'}`;
  }

  if (resourceType === 'memory') {
    const memoryMatch = value.match(/^(\d+(?:\.\d+)?)\s*GiB?$/i);
    if (memoryMatch) {
      return `${memoryMatch[1]} GiB`;
    }
  }

  return value;
};

export const formatHardwareProfileResourceSummary = (resource: HardwareProfileResource): string => {
  const values = [
    resource.default ? `Default = ${resource.default}` : undefined,
    resource.minimum ? `Minimum = ${resource.minimum}` : undefined,
    resource.maximum ? `Maximum = ${resource.maximum}` : undefined,
  ].filter((value): value is string => value !== undefined);

  return `${resource.display_name ?? resource.identifier}: ${values.join(', ')}`;
};

export const formatHardwareProfileResourceDetails = (resource: HardwareProfileResource): string =>
  [
    resource.default
      ? `Default = ${formatHardwareProfileResourceValue(resource.default, resource)}`
      : undefined,
    resource.minimum
      ? `Min = ${formatHardwareProfileResourceValue(resource.minimum, resource)}`
      : undefined,
    resource.maximum
      ? `Max = ${formatHardwareProfileResourceValue(resource.maximum, resource)}`
      : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(', ');

export const formatHardwareProfileDetails = (profile: HardwareProfile): string =>
  (profile.resources ?? [])
    .filter((resource) => resource.default || resource.minimum || resource.maximum)
    .map(formatHardwareProfileResourceSummary)
    .concat(profile.local_queue_name ? `LocalQueue: ${profile.local_queue_name}` : [])
    .join('; ');
