import {
  NavExtension,
  HrefNavItemExtension,
  NavSectionExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { compareNavItemGroups, getTopLevelExtensions } from '#~/app/navigation/utils';

// Test helpers
const createNavItem = (id: string, group?: string, section?: string): HrefNavItemExtension => ({
  type: 'app.navigation/href',
  properties: {
    id,
    title: `Title ${id}`,
    label: `Label ${id}`,
    href: `/path/${id}`,
    ...(group && { group }),
    ...(section && { section }),
  },
});

const createNavSection = (id: string, group?: string): NavSectionExtension => ({
  type: 'app.navigation/section',
  properties: {
    id,
    title: `Title ${id}`,
    label: `Section ${id}`,
    ...(group && { group }),
  },
});

describe('compareNavItemGroups', () => {
  it('should compare items with different groups lexicographically', () => {
    const itemA = createNavItem('a', '1_first');
    const itemB = createNavItem('b', '2_second');

    expect(compareNavItemGroups(itemA, itemB)).toBeLessThan(0);
    expect(compareNavItemGroups(itemB, itemA)).toBeGreaterThan(0);
  });

  it('should return 0 for items with the same group', () => {
    const itemA = createNavItem('a', '1_first');
    const itemB = createNavItem('b', '1_first');

    expect(compareNavItemGroups(itemA, itemB)).toBe(0);
  });

  it('should use default group for items without group property', () => {
    const itemA = createNavItem('a');
    const itemB = createNavItem('b');

    expect(compareNavItemGroups(itemA, itemB)).toBe(0);
  });

  it('should compare items with default group against items with explicit group', () => {
    const itemWithoutGroup = createNavItem('a');
    const itemWithGroup = createNavItem('b', '1_first');

    // '5_default' (default group) should come after '1_first'
    expect(compareNavItemGroups(itemWithGroup, itemWithoutGroup)).toBeLessThan(0);
    expect(compareNavItemGroups(itemWithoutGroup, itemWithGroup)).toBeGreaterThan(0);
  });

  it('should handle undefined group property consistently', () => {
    const itemA = createNavItem('a', undefined);
    const itemB = createNavItem('b', undefined);

    expect(compareNavItemGroups(itemA, itemB)).toBe(0);
  });

  it('should work with nav sections as well', () => {
    const sectionA = createNavSection('section-a', '1_first');
    const sectionB = createNavSection('section-b', '2_second');

    expect(compareNavItemGroups(sectionA, sectionB)).toBeLessThan(0);
    expect(compareNavItemGroups(sectionB, sectionA)).toBeGreaterThan(0);
  });
});

describe('getTopLevelExtensions', () => {
  it('should return top-level extensions without section', () => {
    const extensions: NavExtension[] = [
      createNavItem('item1'),
      createNavItem('item2'),
      createNavSection('section1'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result).toHaveLength(3);
    expect(result.map((e) => e.properties.id)).toEqual(['item1', 'item2', 'section1']);
  });

  it('should sort top-level extensions by group', () => {
    const extensions: NavExtension[] = [
      createNavItem('item3', '3_third'),
      createNavItem('item1', '1_first'),
      createNavItem('item2', '2_second'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result.map((e) => e.properties.id)).toEqual(['item1', 'item2', 'item3']);
  });

  it('should exclude extensions with valid sections', () => {
    const extensions: NavExtension[] = [
      createNavSection('section1'),
      createNavItem('item1', '1_first', 'section1'),
      createNavItem('item2', '2_second'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.properties.id)).toEqual(['item2', 'section1']);
  });

  it('should include orphaned extensions (with non-existent section)', () => {
    const extensions: NavExtension[] = [
      createNavItem('item1', '1_first'),
      createNavItem('orphan1', '2_second', 'nonexistent-section'),
      createNavItem('orphan2', '3_third', 'nonexistent-section'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result).toHaveLength(3);
    expect(result.map((e) => e.properties.id)).toEqual(['item1', 'orphan1', 'orphan2']);
  });

  it('should group and sort orphaned extensions by section', () => {
    const extensions: NavExtension[] = [
      createNavItem('orphan1', '2_second', 'section-a'),
      createNavItem('orphan2', '1_first', 'section-a'),
      createNavItem('orphan3', '2_second', 'section-b'),
      createNavItem('orphan4', '1_first', 'section-b'),
    ];

    const result = getTopLevelExtensions(extensions);

    // Should maintain section grouping and sort within each group
    expect(result).toHaveLength(4);
    expect(result.map((e) => e.properties.id)).toEqual([
      'orphan2',
      'orphan1',
      'orphan4',
      'orphan3',
    ]);
  });

  it('should handle mixed top-level, valid sectioned, and orphaned extensions', () => {
    const extensions: NavExtension[] = [
      createNavItem('top1', '2_second'),
      createNavSection('valid-section', '1_first'),
      createNavItem('valid1', '3_third', 'valid-section'),
      createNavItem('orphan1', '4_fourth', 'nonexistent'),
      createNavItem('top2', '1_first'),
    ];

    const result = getTopLevelExtensions(extensions);

    // Should include: top2, top1, valid-section, orphan1
    expect(result).toHaveLength(4);
    expect(result.map((e) => e.properties.id)).toEqual([
      'valid-section',
      'top2',
      'top1',
      'orphan1',
    ]);
  });

  it('should handle extensions without group (using default group)', () => {
    const extensions: NavExtension[] = [
      createNavItem('item1', '1_first'),
      createNavItem('item2'), // No group, should use default '5_default'
      createNavItem('item3', '9_last'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result.map((e) => e.properties.id)).toEqual(['item1', 'item2', 'item3']);
  });

  it('should handle empty extensions array', () => {
    const result = getTopLevelExtensions([]);

    expect(result).toEqual([]);
  });

  it('should handle array with only sections', () => {
    const extensions: NavExtension[] = [
      createNavSection('section1', '2_second'),
      createNavSection('section2', '1_first'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.properties.id)).toEqual(['section2', 'section1']);
  });

  it('should handle multiple orphaned groups with complex sorting', () => {
    const extensions: NavExtension[] = [
      createNavItem('top1', '1_first'),
      createNavItem('orphan-a1', '3_third', 'section-a'),
      createNavItem('orphan-a2', '2_second', 'section-a'),
      createNavItem('orphan-b1', '2_second', 'section-b'),
      createNavItem('orphan-b2', '1_first', 'section-b'),
      createNavItem('orphan-c1', '1_first', 'section-c'),
      createNavItem('top2', '9_last'),
    ];

    const result = getTopLevelExtensions(extensions);

    expect(result).toHaveLength(7);
    expect(result.map((e) => e.properties.id)).toEqual([
      'top1',
      'top2',
      'orphan-a2',
      'orphan-a1',
      'orphan-b2',
      'orphan-b1',
      'orphan-c1',
    ]);
  });
});
