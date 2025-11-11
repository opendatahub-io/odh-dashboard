import { isNavSectionExtension, NavExtension } from '@odh-dashboard/plugin-core/extension-points';

const DEFAULT_GROUP = '5_default';

/** Lexicographic comparison function for navigation items sorting. */
export const compareNavItemGroups = <T extends NavExtension>(a: T, b: T): number =>
  (a.properties.group || DEFAULT_GROUP).localeCompare(b.properties.group || DEFAULT_GROUP);

export const getTopLevelExtensions = <E extends NavExtension>(extensions: E[]): E[] => {
  // Get all section IDs that exist
  const existingSectionIds = new Set(
    extensions.filter((e) => isNavSectionExtension(e)).map((e) => e.properties.id),
  );

  // Filter top-level extensions (no section)
  const topLevel = extensions.filter((e) => !e.properties.section).toSorted(compareNavItemGroups);

  // Find extensions with sections that don't exist
  const orphanedExtensions = extensions.filter(
    (e) => e.properties.section && !existingSectionIds.has(e.properties.section),
  );

  // Group orphaned extensions by their section ID
  const orphanedBySection = new Map<string, E[]>();
  orphanedExtensions.forEach((ext) => {
    const sectionId = ext.properties.section;
    if (sectionId) {
      let sections = orphanedBySection.get(sectionId);
      if (!sections) {
        sections = [];
        orphanedBySection.set(sectionId, sections);
      }
      sections.push(ext);
    }
  });

  // Sort each group and flatten
  const sortedOrphaned = Array.from(orphanedBySection.values())
    .map((group) => group.toSorted(compareNavItemGroups))
    .flat();

  return [...topLevel, ...sortedOrphaned];
};
