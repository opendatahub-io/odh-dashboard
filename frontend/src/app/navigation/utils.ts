import type { Extension } from '@openshift/dynamic-plugin-sdk';
import {
  isNavSectionExtension,
  NavItemProperties,
} from '@odh-dashboard/plugin-core/extension-points';

const DEFAULT_GROUP = '5_default';

/** Any extension that has NavItemProperties (group, section, id, title, etc.) */
type NavLikeExtension = Extension<string, NavItemProperties>;

/** Lexicographic comparison function for navigation items sorting. */
export const compareNavItemGroups = <T extends NavLikeExtension>(a: T, b: T): number =>
  (a.properties.group || DEFAULT_GROUP).localeCompare(b.properties.group || DEFAULT_GROUP);

export const getTopLevelExtensions = <E extends NavLikeExtension>(extensions: E[]): E[] => {
  // Get all section IDs that exist
  const existingSectionIds = new Set(
    extensions.filter((e) => isNavSectionExtension(e)).map((e) => e.properties.id),
  );

  // Filter top-level extensions (no section), deduplicating sections by id so that
  // multiple plugins can register the same section without creating duplicate nav entries.
  const seenSectionIds = new Set<string>();
  const topLevel = extensions
    .filter((e) => !e.properties.section)
    .toSorted(compareNavItemGroups)
    .filter((e) => {
      if (isNavSectionExtension(e)) {
        if (seenSectionIds.has(e.properties.id)) {
          return false;
        }
        seenSectionIds.add(e.properties.id);
      }
      return true;
    });

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
