import * as React from 'react';
import {
  MultiSelection,
  GroupSelectionOptions,
  SelectionOptions,
} from '#~/components/MultiSelection';
import { API_GROUP_CATEGORIES, ALL_API_GROUPS_WILDCARD } from './apiGroupCategories';
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

  const otherApiGroups = React.useMemo(() => {
    if (discoveredApiGroups.size === 0) {
      return [];
    }
    const mappedNames = new Set(API_GROUP_CATEGORIES.flatMap((c) => c.groups.map((g) => g.name)));
    return apiResourcesData.apiGroups.filter((g) => !mappedNames.has(g));
  }, [apiResourcesData.apiGroups, discoveredApiGroups.size]);

  const allCategories = React.useMemo(() => {
    const categories = [...availableCategories];
    if (otherApiGroups.length > 0) {
      categories.push({
        id: 'other',
        label: 'Other',
        groups: otherApiGroups.map((g) => ({ name: g, label: g, description: '' })),
      });
    }
    return categories;
  }, [availableCategories, otherApiGroups]);

  const renderedApiGroupNames = React.useMemo(
    () => new Set(allCategories.flatMap((c) => c.groups.map((g) => g.name))),
    [allCategories],
  );

  const customEntries = React.useMemo(
    () =>
      selectedApiGroups.filter(
        (g) => g !== ALL_API_GROUPS_WILDCARD && !renderedApiGroupNames.has(g),
      ),
    [selectedApiGroups, renderedApiGroupNames],
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
        ...allCategories.flatMap((category) => {
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
              'aria-label': `Select all ${category.label} API groups`,
            },
            ...category.groups.map((group) => ({
              id: group.name === '' ? CORE_GROUP_ID : group.name,
              name: group.label,
              description: group.description,
              selected: isAllSelected || selectedApiGroups.includes(group.name),
              hideChip: isAllSelected,
              className: 'odh-api-group-tree__group',
              'aria-label': `${group.label} (${category.label})`,
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
  }, [allCategories, selectedApiGroups, isAllSelected, customEntries]);

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
          String(o.id) !== ALL_API_GROUPS_WILDCARD &&
          !allCategories.some((c) => `${ALL_CATEGORY_PREFIX}${c.id}` === String(o.id)),
      );

      const categoryAllOptions = updatedOptions.filter((o) =>
        allCategories.some((c) => `${ALL_CATEGORY_PREFIX}${c.id}` === String(o.id)),
      );

      const selected = new Set(
        realOptions
          .filter((o) => o.selected)
          .map((o) => (String(o.id) === CORE_GROUP_ID ? '' : String(o.id))),
      );

      for (const catOption of categoryAllOptions) {
        const categoryId = String(catOption.id).replace(ALL_CATEGORY_PREFIX, '');
        const category = allCategories.find((c) => c.id === categoryId);
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
    [selectedApiGroups, onSelectedApiGroupsChange, isAllSelected, allCategories],
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
        } else if (!option.chipOnly) {
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
      toggleTestId="rule-api-groups-toggle"
      hasCheckbox
      isScrollable
      isCreatable
      createOptionMessage={(newValue) => `Use custom API group "${newValue}"`}
    />
  );
};

export default ApiGroupsTreeSelect;
