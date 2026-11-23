import type { HardwareProfileIdentifier, HardwareProfileInfo } from '~/app/types';

export const formatHardwareProfileResourceValue = (
  value: string,
  resource: HardwareProfileIdentifier,
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

export const formatHardwareProfileResourceSummary = (
  resource: HardwareProfileIdentifier,
): string => {
  const values = [
    resource.default_count ? `Default = ${resource.default_count}` : undefined,
    resource.min_count ? `Minimum = ${resource.min_count}` : undefined,
    resource.max_count ? `Maximum = ${resource.max_count}` : undefined,
  ].filter((value): value is string => value !== undefined);

  return `${resource.display_name ?? resource.identifier}: ${values.join(', ')}`;
};

export const formatHardwareProfileResourceDetails = (resource: HardwareProfileIdentifier): string =>
  [
    resource.default_count
      ? `Default = ${formatHardwareProfileResourceValue(resource.default_count, resource)}`
      : undefined,
    resource.min_count
      ? `Min = ${formatHardwareProfileResourceValue(resource.min_count, resource)}`
      : undefined,
    resource.max_count
      ? `Max = ${formatHardwareProfileResourceValue(resource.max_count, resource)}`
      : undefined,
  ]
    .filter((value): value is string => value !== undefined)
    .join(', ');

export const formatHardwareProfileDetails = (profile: HardwareProfileInfo): string =>
  profile.identifiers
    .filter((resource) => resource.default_count || resource.min_count || resource.max_count)
    .map(formatHardwareProfileResourceSummary)
    .concat(profile.queue_name ? `LocalQueue: ${profile.queue_name}` : [])
    .join('; ');
