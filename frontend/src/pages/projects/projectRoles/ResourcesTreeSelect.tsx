import * as React from 'react';
import {
  MultiSelection,
  GroupSelectionOptions,
  SelectionOptions,
} from '#~/components/MultiSelection';
import {
  RESOURCE_CATEGORIES,
  ALL_RESOURCES_WILDCARD,
  ALL_INDIVIDUAL_RESOURCES,
} from './resourceCategories';
import type { ApiResourcesData } from './useApiResources';

import './ResourcesTreeSelect.scss';

const ALL_CATEGORY_PREFIX = 'all-category-';

type ResourcesTreeSelectProps = {
  selectedResources: string[];
  onSelectedResourcesChange: (resources: string[]) => void;
  apiResourcesData: ApiResourcesData;
};

const ResourcesTreeSelect: React.FC<ResourcesTreeSelectProps> = ({
  selectedResources,
  onSelectedResourcesChange,
  apiResourcesData,
}) => {
  const isAllSelected = selectedResources.includes(ALL_RESOURCES_WILDCARD);

  const discoveredResourceNames = React.useMemo(
    () => new Set(apiResourcesData.resources.map((r) => r.name)),
    [apiResourcesData.resources],
  );

  const availableCategories = React.useMemo(
    () =>
      RESOURCE_CATEGORIES.map((category) => ({
        ...category,
        resources: category.resources.filter(
          (r) => discoveredResourceNames.has(r.name) || discoveredResourceNames.size === 0,
        ),
      })).filter((category) => category.resources.length > 0),
    [discoveredResourceNames],
  );

  const customEntries = React.useMemo(
    () =>
      selectedResources.filter(
        (r) => r !== ALL_RESOURCES_WILDCARD && !ALL_INDIVIDUAL_RESOURCES.includes(r),
      ),
    [selectedResources],
  );

  const groupedValues = React.useMemo((): GroupSelectionOptions[] => {
    const allOptions: GroupSelectionOptions = {
      id: 'resources-tree',
      name: '',
      values: [
        {
          id: ALL_RESOURCES_WILDCARD,
          name: 'All resources',
          selected: isAllSelected,
          className: 'odh-resource-tree__all',
        },
        ...availableCategories.flatMap((category) => {
          const categoryResourceNames = category.resources.map((r) => r.name);
          const allInCategorySelected =
            isAllSelected || categoryResourceNames.every((r) => selectedResources.includes(r));

          return [
            {
              id: `${ALL_CATEGORY_PREFIX}${category.id}`,
              name: category.label,
              selected: allInCategorySelected,
              hideChip: true,
              className: 'odh-resource-tree__category',
            },
            ...category.resources.map((resource) => ({
              id: resource.name,
              name: resource.label,
              selected: isAllSelected || selectedResources.includes(resource.name),
              hideChip: isAllSelected,
              className: 'odh-resource-tree__resource',
            })),
          ];
        }),
        ...customEntries.map((r) => ({
          id: r,
          name: r,
          selected: true,
          chipOnly: true,
        })),
      ],
    };

    return [allOptions];
  }, [availableCategories, selectedResources, isAllSelected, customEntries]);

  const handleSetValue = React.useCallback(
    (updatedOptions: SelectionOptions[]) => {
      const allResourcesOption = updatedOptions.find(
        (o) => String(o.id) === ALL_RESOURCES_WILDCARD,
      );
      const wasAllSelected = isAllSelected;
      const isNowAllSelected = allResourcesOption?.selected ?? false;

      if (isNowAllSelected && !wasAllSelected) {
        onSelectedResourcesChange([ALL_RESOURCES_WILDCARD]);
        return;
      }

      if (!isNowAllSelected && wasAllSelected) {
        onSelectedResourcesChange([]);
        return;
      }

      const realOptions = updatedOptions.filter(
        (o) =>
          String(o.id) !== ALL_RESOURCES_WILDCARD && !String(o.id).startsWith(ALL_CATEGORY_PREFIX),
      );

      const categoryAllOptions = updatedOptions.filter((o) =>
        String(o.id).startsWith(ALL_CATEGORY_PREFIX),
      );

      const selected = new Set(realOptions.filter((o) => o.selected).map((o) => String(o.id)));

      for (const catOption of categoryAllOptions) {
        const categoryId = String(catOption.id).replace(ALL_CATEGORY_PREFIX, '');
        const category = availableCategories.find((c) => c.id === categoryId);
        if (!category) {
          continue;
        }

        const categoryResourceNames = category.resources.map((r) => r.name);
        const wasCategoryAllSelected =
          isAllSelected || categoryResourceNames.every((r) => selectedResources.includes(r));

        if (catOption.selected && !wasCategoryAllSelected) {
          categoryResourceNames.forEach((r) => selected.add(r));
        } else if (!catOption.selected && wasCategoryAllSelected) {
          categoryResourceNames.forEach((r) => selected.delete(r));
        }
      }

      onSelectedResourcesChange([...selected]);
    },
    [selectedResources, onSelectedResourcesChange, isAllSelected, availableCategories],
  );

  const filterFunction = React.useCallback(
    (filterText: string, options: SelectionOptions[]): SelectionOptions[] => {
      if (!filterText) {
        return options;
      }

      const lower = filterText.toLowerCase();
      const result: SelectionOptions[] = [];
      let currentCategory: SelectionOptions | null = null;
      let currentCategoryResources: SelectionOptions[] = [];
      let categoryMatches = false;

      const flushCategory = () => {
        if (!currentCategory) {
          return;
        }
        const resourceMatches = currentCategoryResources.filter((r) =>
          r.name.toLowerCase().includes(lower),
        );
        if (categoryMatches) {
          result.push(currentCategory, ...currentCategoryResources);
        } else if (resourceMatches.length > 0) {
          result.push(currentCategory, ...resourceMatches);
        }
      };

      for (const option of options) {
        if (String(option.id) === ALL_RESOURCES_WILDCARD) {
          if (option.name.toLowerCase().includes(lower)) {
            result.push(option);
          }
        } else if (String(option.id).startsWith(ALL_CATEGORY_PREFIX)) {
          flushCategory();
          currentCategory = option;
          currentCategoryResources = [];
          categoryMatches = option.name.toLowerCase().includes(lower);
        } else {
          currentCategoryResources.push(option);
        }
      }
      flushCategory();

      return result;
    },
    [],
  );

  return (
    <MultiSelection
      groupedValues={groupedValues}
      setValue={handleSetValue}
      filterFunction={filterFunction}
      placeholder="Enter or select resource types"
      ariaLabel="Resource types"
      toggleTestId="resources-select-toggle"
      hasCheckbox
      isScrollable
      isCreatable
      createOptionMessage={(newValue) => `Add custom resource "${newValue}"`}
    />
  );
};

export default ResourcesTreeSelect;
