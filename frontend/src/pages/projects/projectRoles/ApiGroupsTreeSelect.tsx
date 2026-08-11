import * as React from 'react';
import {
  MultiSelection,
  GroupSelectionOptions,
  SelectionOptions,
} from '#~/components/MultiSelection';
import {
  API_GROUP_CATEGORIES,
  ALL_MAPPED_API_GROUPS,
  ALL_API_GROUPS_WILDCARD,
} from './apiGroupCategories';
import { CORE_GROUP_ID } from './ruleModalUtils';
import type { ApiResourcesData } from './useApiResources';

import './ApiGroupsTreeSelect.scss';

const ALL_CATEGORY_PREFIX = 'all-category-';

type ApiGroupsTreeSelectProps = {
  selectedApiGroups: string[];
  onSelectedApiGroupsChange: (groups: string[]) => void;
  apiResourcesData: ApiResourcesData;
};

const ApiGroupsTreeSelect: React.FC<ApiGroupsTreeSelectProps> = ({
  selectedApiGroups,
  onSelectedApiGroupsChange,
  apiResourcesData,
}) => {
  const isAllSelected = selectedApiGroups.includes(ALL_API_GROUPS_WILDCARD);

  const discoveredApiGroups = React.useMemo(
    () => new Set(apiResourcesData.apiGroups),
    [apiResourcesData.apiGroups],
  );

  const availableCategories = React.useMemo(
    () =>
      API_GROUP_CATEGORIES.map((category) => ({
        ...category,
        groups: category.groups.filter(
          (g) => discoveredApiGroups.has(g.name) || discoveredApiGroups.size === 0,
        ),
      })).filter((category) => category.groups.length > 0),
    [discoveredApiGroups],
  );

  const customEntries = React.useMemo(
    () =>
      selectedApiGroups.filter(
        (g) => g !== ALL_API_GROUPS_WILDCARD && !ALL_MAPPED_API_GROUPS.includes(g),
      ),
    [selectedApiGroups],
  );

  const groupedValues = React.useMemo((): GroupSelectionOptions[] => {
    const allOptions: GroupSelectionOptions = {
      id: 'api-groups-tree',
      name: '',
      values: [
        {
          id: ALL_API_GROUPS_WILDCARD,
          name: 'All API groups',
          selected: isAllSelected,
          className: 'odh-api-group-tree__all',
        },
        ...availableCategories.flatMap((category) => {
          const categoryGroupNames = category.groups.map((g) => g.name);
          const allInCategorySelected =
            isAllSelected || categoryGroupNames.every((g) => selectedApiGroups.includes(g));

          return [
            {
              id: `${ALL_CATEGORY_PREFIX}${category.id}`,
              name: category.label,
              selected: allInCategorySelected,
              hideChip: true,
              className: 'odh-api-group-tree__category',
            },
            ...category.groups.map((group) => ({
              id: group.name === '' ? CORE_GROUP_ID : group.name,
              name: group.label,
              description: group.description,
              selected: isAllSelected || selectedApiGroups.includes(group.name),
              hideChip: isAllSelected,
              className: 'odh-api-group-tree__group',
            })),
          ];
        }),
        ...customEntries.map((g) => ({
          id: g,
          name: g,
          selected: true,
          chipOnly: true,
        })),
      ],
    };

    return [allOptions];
  }, [availableCategories, selectedApiGroups, isAllSelected, customEntries]);

  const handleSetValue = React.useCallback(
    (updatedOptions: SelectionOptions[]) => {
      const allOption = updatedOptions.find((o) => String(o.id) === ALL_API_GROUPS_WILDCARD);
      const wasAllSelected = isAllSelected;
      const isNowAllSelected = allOption?.selected ?? false;

      if (isNowAllSelected && !wasAllSelected) {
        onSelectedApiGroupsChange([ALL_API_GROUPS_WILDCARD]);
        return;
      }

      if (!isNowAllSelected && wasAllSelected) {
        onSelectedApiGroupsChange([]);
        return;
      }

      const realOptions = updatedOptions.filter(
        (o) =>
          String(o.id) !== ALL_API_GROUPS_WILDCARD && !String(o.id).startsWith(ALL_CATEGORY_PREFIX),
      );

      const categoryAllOptions = updatedOptions.filter((o) =>
        String(o.id).startsWith(ALL_CATEGORY_PREFIX),
      );

      const selected = new Set(
        realOptions
          .filter((o) => o.selected)
          .map((o) => (String(o.id) === CORE_GROUP_ID ? '' : String(o.id))),
      );

      for (const catOption of categoryAllOptions) {
        const categoryId = String(catOption.id).replace(ALL_CATEGORY_PREFIX, '');
        const category = availableCategories.find((c) => c.id === categoryId);
        if (!category) {
          continue;
        }

        const categoryGroupNames = category.groups.map((g) => g.name);
        const wasCategoryAllSelected =
          isAllSelected || categoryGroupNames.every((g) => selectedApiGroups.includes(g));

        if (catOption.selected && !wasCategoryAllSelected) {
          categoryGroupNames.forEach((g) => selected.add(g));
        } else if (!catOption.selected && wasCategoryAllSelected) {
          categoryGroupNames.forEach((g) => selected.delete(g));
        }
      }

      onSelectedApiGroupsChange([...selected]);
    },
    [selectedApiGroups, onSelectedApiGroupsChange, isAllSelected, availableCategories],
  );

  const filterFunction = React.useCallback(
    (filterText: string, options: SelectionOptions[]): SelectionOptions[] => {
      if (!filterText) {
        return options;
      }

      const lower = filterText.toLowerCase();
      const result: SelectionOptions[] = [];
      let currentCategory: SelectionOptions | null = null;
      let currentCategoryGroups: SelectionOptions[] = [];
      let categoryMatches = false;

      const flushCategory = () => {
        if (!currentCategory) {
          return;
        }
        const groupMatches = currentCategoryGroups.filter(
          (g) =>
            g.name.toLowerCase().includes(lower) ||
            (typeof g.description === 'string' && g.description.toLowerCase().includes(lower)),
        );
        if (categoryMatches) {
          result.push(currentCategory, ...currentCategoryGroups);
        } else if (groupMatches.length > 0) {
          result.push(currentCategory, ...groupMatches);
        }
      };

      for (const option of options) {
        if (String(option.id) === ALL_API_GROUPS_WILDCARD) {
          if (option.name.toLowerCase().includes(lower)) {
            result.push(option);
          }
        } else if (String(option.id).startsWith(ALL_CATEGORY_PREFIX)) {
          flushCategory();
          currentCategory = option;
          currentCategoryGroups = [];
          categoryMatches = option.name.toLowerCase().includes(lower);
        } else {
          currentCategoryGroups.push(option);
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
      placeholder="Enter or select API groups"
      ariaLabel="API groups"
      toggleTestId="api-groups-select-toggle"
      hasCheckbox
      isScrollable
      isCreatable
      createOptionMessage={(newValue) => `Add custom API group "${newValue}"`}
    />
  );
};

export default ApiGroupsTreeSelect;
