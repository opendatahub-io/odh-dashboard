import { SortableData } from '@odh-dashboard/ui-core';
import { GroupOverviewItem, ModelOverviewItem } from '~/app/types/subscriptions';
import { OverviewFilterDataType, OverviewFilterOptions } from './const';

/**
 * A typeahead selection is stored as { label, value } and matches exactly;
 * a plain string is a typed partial text fragment and matches by inclusion.
 */
type FilterSelection = { exact?: string; fragment?: string };

const getFilterSelection = (
  filterData: OverviewFilterDataType,
  key: OverviewFilterOptions,
): FilterSelection => {
  const value = filterData[key];
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    return trimmed ? { fragment: trimmed } : {};
  }
  return { exact: value.value.toLowerCase() };
};

const textIncludes = (text: string | undefined, keyword: string | undefined): boolean =>
  keyword ? (text?.toLowerCase().includes(keyword) ?? false) : false;

const textEquals = (text: string | undefined, keyword: string | undefined): boolean =>
  keyword ? text?.toLowerCase() === keyword : false;

const modelMatchesModelName = (row: ModelOverviewItem, filter: FilterSelection): boolean =>
  filter.exact
    ? textEquals(row.id, filter.exact) || textEquals(row.modelDetails.displayName, filter.exact)
    : textIncludes(row.id, filter.fragment) ||
      textIncludes(row.modelDetails.displayName, filter.fragment) ||
      textIncludes(row.modelDetails.description, filter.fragment);

const modelMatchesProject = (row: ModelOverviewItem, filter: FilterSelection): boolean =>
  filter.exact
    ? textEquals(row.namespace, filter.exact)
    : textIncludes(row.namespace, filter.fragment);

const modelMatchesGroupName = (row: ModelOverviewItem, filter: FilterSelection): boolean => {
  const groups = [
    ...row.subscriptions.flatMap((sub) => sub.groups ?? []),
    ...row.authPolicies.flatMap((policy) => policy.groups ?? []),
  ];
  return filter.exact
    ? groups.some((group) => textEquals(group, filter.exact))
    : groups.some((group) => textIncludes(group, filter.fragment));
};

const modelMatchesSubscriptionName = (row: ModelOverviewItem, filter: FilterSelection): boolean =>
  row.subscriptions.some((sub) =>
    filter.exact
      ? textEquals(sub.name, filter.exact)
      : textIncludes(sub.name, filter.fragment) || textIncludes(sub.displayName, filter.fragment),
  );

const modelMatchesAuthPolicyName = (row: ModelOverviewItem, filter: FilterSelection): boolean =>
  row.authPolicies.some((policy) =>
    filter.exact
      ? textEquals(policy.name, filter.exact)
      : textIncludes(policy.name, filter.fragment) ||
        textIncludes(policy.displayName, filter.fragment),
  );

export const filterOverviewModels = (
  rows: ModelOverviewItem[],
  filterData: OverviewFilterDataType,
): ModelOverviewItem[] => {
  const modelFilter = getFilterSelection(filterData, OverviewFilterOptions.modelName);
  const projectFilter = getFilterSelection(filterData, OverviewFilterOptions.project);
  const groupFilter = getFilterSelection(filterData, OverviewFilterOptions.groupName);
  const subscriptionFilter = getFilterSelection(filterData, OverviewFilterOptions.subscriptionName);
  const authPolicyFilter = getFilterSelection(filterData, OverviewFilterOptions.authPolicyName);

  return rows.filter((row) => {
    if ((modelFilter.exact || modelFilter.fragment) && !modelMatchesModelName(row, modelFilter)) {
      return false;
    }
    if (
      (projectFilter.exact || projectFilter.fragment) &&
      !modelMatchesProject(row, projectFilter)
    ) {
      return false;
    }
    if ((groupFilter.exact || groupFilter.fragment) && !modelMatchesGroupName(row, groupFilter)) {
      return false;
    }
    if (
      (subscriptionFilter.exact || subscriptionFilter.fragment) &&
      !modelMatchesSubscriptionName(row, subscriptionFilter)
    ) {
      return false;
    }
    if (
      (authPolicyFilter.exact || authPolicyFilter.fragment) &&
      !modelMatchesAuthPolicyName(row, authPolicyFilter)
    ) {
      return false;
    }
    return true;
  });
};

const groupMatchesName = (row: GroupOverviewItem, filter: FilterSelection): boolean =>
  filter.exact ? textEquals(row.name, filter.exact) : textIncludes(row.name, filter.fragment);

const groupMatchesSubscriptionName = (row: GroupOverviewItem, filter: FilterSelection): boolean =>
  row.subscriptions.some((sub) =>
    filter.exact
      ? textEquals(sub.name, filter.exact)
      : textIncludes(sub.name, filter.fragment) || textIncludes(sub.displayName, filter.fragment),
  );

const groupMatchesAuthPolicyName = (row: GroupOverviewItem, filter: FilterSelection): boolean =>
  row.authPolicies.some((policy) =>
    filter.exact
      ? textEquals(policy.name, filter.exact)
      : textIncludes(policy.name, filter.fragment) ||
        textIncludes(policy.displayName, filter.fragment),
  );

const groupMatchesModelName = (row: GroupOverviewItem, filter: FilterSelection): boolean =>
  row.subscriptions.some((sub) =>
    sub.modelRefs.some((ref) =>
      filter.exact
        ? textEquals(ref.name, filter.exact)
        : textIncludes(ref.name, filter.fragment) || textIncludes(ref.displayName, filter.fragment),
    ),
  );

const groupMatchesProject = (row: GroupOverviewItem, filter: FilterSelection): boolean =>
  row.subscriptions.some((sub) =>
    sub.modelRefs.some((ref) =>
      filter.exact
        ? textEquals(ref.namespace, filter.exact)
        : textIncludes(ref.namespace, filter.fragment),
    ),
  );

export const filterOverviewGroups = (
  rows: GroupOverviewItem[],
  filterData: OverviewFilterDataType,
): GroupOverviewItem[] => {
  const groupFilter = getFilterSelection(filterData, OverviewFilterOptions.groupName);
  const subscriptionFilter = getFilterSelection(filterData, OverviewFilterOptions.subscriptionName);
  const authPolicyFilter = getFilterSelection(filterData, OverviewFilterOptions.authPolicyName);
  const modelFilter = getFilterSelection(filterData, OverviewFilterOptions.modelName);
  const projectFilter = getFilterSelection(filterData, OverviewFilterOptions.project);

  return rows.filter((row) => {
    if ((groupFilter.exact || groupFilter.fragment) && !groupMatchesName(row, groupFilter)) {
      return false;
    }
    if (
      (subscriptionFilter.exact || subscriptionFilter.fragment) &&
      !groupMatchesSubscriptionName(row, subscriptionFilter)
    ) {
      return false;
    }
    if (
      (authPolicyFilter.exact || authPolicyFilter.fragment) &&
      !groupMatchesAuthPolicyName(row, authPolicyFilter)
    ) {
      return false;
    }
    if ((modelFilter.exact || modelFilter.fragment) && !groupMatchesModelName(row, modelFilter)) {
      return false;
    }
    if (
      (projectFilter.exact || projectFilter.fragment) &&
      !groupMatchesProject(row, projectFilter)
    ) {
      return false;
    }
    return true;
  });
};

export const overviewColumns: SortableData<ModelOverviewItem>[] = [
  {
    label: '',
    field: 'expand',
    sortable: false,
  },
  {
    label: 'Model name',
    field: 'name',
    width: 30,
    sortable: (a, b) =>
      (a.modelDetails.displayName ?? a.id).localeCompare(b.modelDetails.displayName ?? b.id),
  },
  {
    label: 'Project',
    field: 'namespace',
    sortable: (a, b) => a.namespace.localeCompare(b.namespace),
  },
  {
    label: 'Status',
    field: 'phase',
    width: 15,
    sortable: (a, b) => (a.modelDetails.phase ?? '').localeCompare(b.modelDetails.phase ?? ''),
  },
  {
    label: 'Subscriptions',
    field: 'subscriptions',
    width: 15,
    sortable: (a, b) => a.subscriptions.length - b.subscriptions.length,
  },
  {
    label: 'Authorization policies',
    field: 'authPolicies',
    width: 15,
    sortable: (a, b) => a.authPolicies.length - b.authPolicies.length,
  },
  {
    label: '',
    field: 'kebab',
    sortable: false,
  },
];

export const hasHighlightedGroup = (groups: string[], highlightedGroup: string | null): boolean =>
  !highlightedGroup ? false : groups.some((group) => group === highlightedGroup);

export const groupColumns: SortableData<GroupOverviewItem>[] = [
  {
    label: '',
    field: 'expand',
    sortable: false,
  },
  {
    label: 'Group name',
    field: 'name',
    width: 40,
    sortable: (a, b) => a.name.localeCompare(b.name),
  },
  {
    label: 'Subscriptions',
    field: 'subscriptions',
    width: 15,
    sortable: (a, b) => a.subscriptions.length - b.subscriptions.length,
  },
  {
    label: 'Authorization policies',
    field: 'authPolicies',
    width: 15,
    sortable: (a, b) => a.authPolicies.length - b.authPolicies.length,
  },
];
