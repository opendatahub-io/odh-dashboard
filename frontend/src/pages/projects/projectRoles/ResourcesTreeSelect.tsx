import * as React from 'react';
import {
  MultiSelection,
  GroupSelectionOptions,
  SelectionOptions,
} from '#~/components/MultiSelection';
import { RESOURCE_CATEGORIES, ALL_RESOURCES_WILDCARD } from './resourceCategories';
import {
  ALL_CATEGORY_PREFIX,
  createCategoryFilter,
  applyCategoryToggles,
} from './categoryTreeUtils';
import type { ApiResourcesData } from './useApiResources';

import './ResourcesTreeSelect.scss';

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

  const otherResources = React.useMemo(() => {
    if (discoveredResourceNames.size === 0) {
      return [];
    }
    const mappedNames = new Set(RESOURCE_CATEGORIES.flatMap((c) => c.resources.map((r) => r.name)));
    return apiResourcesData.resources.filter((r) => !mappedNames.has(r.name));
  }, [apiResourcesData.resources, discoveredResourceNames.size]);

  const allCategories = React.useMemo(() => {
    const categories = [...availableCategories];
    if (otherResources.length > 0) {
      categories.push({
        id: 'other',
        label: 'Other',
        resources: otherResources.map((r) => ({
          name: r.name,
          label: r.name,
          apiGroup: r.apiGroup,
        })),
      });
    }
    return categories;
  }, [availableCategories, otherResources]);

  const renderedResourceNames = React.useMemo(
    () => new Set(allCategories.flatMap((c) => c.resources.map((r) => r.name))),
    [allCategories],
  );

  const customEntries = React.useMemo(
    () =>
      selectedResources.filter(
        (r) =>
          r !== ALL_RESOURCES_WILDCARD &&
          !r.startsWith(ALL_CATEGORY_PREFIX) &&
          !renderedResourceNames.has(r),
      ),
    [selectedResources, renderedResourceNames],
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
        ...allCategories.flatMap((category) => {
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
              'aria-label': `Select all ${category.label} resources`,
            },
            ...category.resources.map((resource) => ({
              id: resource.name,
              name: resource.label,
              selected: isAllSelected || selectedResources.includes(resource.name),
              hideChip: isAllSelected,
              className: 'odh-resource-tree__resource',
              'aria-label': `${resource.label} (${category.label})`,
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
  }, [allCategories, selectedResources, isAllSelected, customEntries]);

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
          String(o.id) !== ALL_RESOURCES_WILDCARD &&
          !allCategories.some((c) => `${ALL_CATEGORY_PREFIX}${c.id}` === String(o.id)),
      );

      const categoryAllOptions = updatedOptions.filter((o) =>
        allCategories.some((c) => `${ALL_CATEGORY_PREFIX}${c.id}` === String(o.id)),
      );

      const selected = new Set(realOptions.filter((o) => o.selected).map((o) => String(o.id)));

      applyCategoryToggles(
        categoryAllOptions,
        allCategories.map((c) => ({ id: c.id, itemNames: c.resources.map((r) => r.name) })),
        isAllSelected,
        selectedResources,
        selected,
      );

      onSelectedResourcesChange([...selected]);
    },
    [selectedResources, onSelectedResourcesChange, isAllSelected, allCategories],
  );

  const filterFunction = React.useMemo(() => createCategoryFilter(ALL_RESOURCES_WILDCARD), []);

  return (
    <MultiSelection
      groupedValues={groupedValues}
      setValue={handleSetValue}
      filterFunction={filterFunction}
      placeholder="Enter or select resource types"
      ariaLabel="Resource types"
      toggleTestId="rule-resource-types-toggle"
      hasCheckbox
      isScrollable
      isCreatable
      createOptionMessage={(newValue) => `Use custom resource type "${newValue}"`}
    />
  );
};

export default ResourcesTreeSelect;
