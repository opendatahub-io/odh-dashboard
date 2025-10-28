import { NavExtension } from '@odh-dashboard/plugin-core/extension-points';

const DEFAULT_GROUP = '5_default';

/** Lexicographic comparison function for navigation items sorting. */
export const compareNavItemGroups = <T extends NavExtension>(a: T, b: T): number =>
  (a.properties.group || DEFAULT_GROUP).localeCompare(b.properties.group || DEFAULT_GROUP);
