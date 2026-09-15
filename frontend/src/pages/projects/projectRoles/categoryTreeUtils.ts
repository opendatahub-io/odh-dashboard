import type { SelectionOptions } from '@odh-dashboard/ui-core/components/MultiSelection';

export const ALL_CATEGORY_PREFIX = '__all_category__';

type CategoryFilterOptions = {
  matchDescription?: boolean;
};

/**
 * Creates a tree-aware filter function for category-grouped MultiSelection options.
 * Searching a category name shows all its children; searching a child shows it with its parent header.
 * Category headers are identified by their `__all_category__` ID prefix.
 */
export const createCategoryFilter =
  (
    wildcardId: string,
    options?: CategoryFilterOptions,
  ): ((filterText: string, allOptions: SelectionOptions[]) => SelectionOptions[]) =>
  (filterText: string, allOptions: SelectionOptions[]): SelectionOptions[] => {
    if (!filterText) {
      return allOptions;
    }

    const lower = filterText.toLowerCase();
    const result: SelectionOptions[] = [];
    let currentCategory: SelectionOptions | null = null;
    let currentCategoryItems: SelectionOptions[] = [];
    let categoryMatches = false;

    const flushCategory = () => {
      if (!currentCategory) {
        return;
      }
      const itemMatches = currentCategoryItems.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          (options?.matchDescription &&
            typeof item.description === 'string' &&
            item.description.toLowerCase().includes(lower)),
      );
      if (categoryMatches) {
        result.push(currentCategory, ...currentCategoryItems);
      } else if (itemMatches.length > 0) {
        result.push(currentCategory, ...itemMatches);
      }
    };

    for (const option of allOptions) {
      if (String(option.id) === wildcardId) {
        if (option.name.toLowerCase().includes(lower)) {
          result.push(option);
        }
      } else if (!option.chipOnly && String(option.id).startsWith(ALL_CATEGORY_PREFIX)) {
        flushCategory();
        currentCategory = option;
        currentCategoryItems = [];
        categoryMatches = option.name.toLowerCase().includes(lower);
      } else if (!option.chipOnly) {
        currentCategoryItems.push(option);
      }
    }
    flushCategory();

    return result;
  };

/**
 * Applies category toggle logic: when a category header is toggled on/off,
 * add/remove all items in that category from the selected set.
 */
export const applyCategoryToggles = (
  categoryAllOptions: SelectionOptions[],
  allCategories: { id: string; itemNames: string[] }[],
  isAllSelected: boolean,
  selectedItems: string[],
  selected: Set<string>,
): void => {
  for (const catOption of categoryAllOptions) {
    const categoryId = String(catOption.id).replace(ALL_CATEGORY_PREFIX, '');
    const category = allCategories.find((c) => c.id === categoryId);
    if (!category) {
      continue;
    }

    const wasCategoryAllSelected =
      isAllSelected || category.itemNames.every((name) => selectedItems.includes(name));

    if (catOption.selected && !wasCategoryAllSelected) {
      category.itemNames.forEach((name) => selected.add(name));
    } else if (!catOption.selected && wasCategoryAllSelected) {
      category.itemNames.forEach((name) => selected.delete(name));
    }
  }
};
