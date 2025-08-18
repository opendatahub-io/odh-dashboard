import { NavExtension } from '@odh-dashboard/plugin-core/extension-points';

const DEFAULT_GROUP = '8_default';

/** Comparison function for navigation items sorting. */
export const compareNavItemGroups = <T extends NavExtension>(a: T, b: T): number => {
  const groupA = a.properties.group || DEFAULT_GROUP;
  const groupB = b.properties.group || DEFAULT_GROUP;

  // Extract numeric prefix and suffix for proper sorting
  const extractParts = (group: string) => {
    const match = group.match(/^(\d+)_(.*)$/);
    return match ? { num: parseInt(match[1], 10), suffix: match[2] } : { num: 0, suffix: group };
  };

  const partsA = extractParts(groupA);
  const partsB = extractParts(groupB);

  // First compare by numeric prefix
  if (partsA.num !== partsB.num) {
    return partsA.num - partsB.num;
  }

  // If numeric parts are equal, compare by suffix
  return partsA.suffix.localeCompare(partsB.suffix);
};
