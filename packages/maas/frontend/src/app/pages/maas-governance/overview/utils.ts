import { SortableData } from '@odh-dashboard/ui-core';
import { ModelOverviewItem } from '~/app/types/subscriptions';
import { OverviewFilterDataType, OverviewFilterOptions } from './const';

const getFilterKeyword = (
  filterData: OverviewFilterDataType,
  key: OverviewFilterOptions,
): string | undefined => {
  const value = filterData[key];
  if (!value) {
    return undefined;
  }
  const keyword = typeof value === 'string' ? value : value.value;
  const trimmed = keyword.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
};

const textIncludes = (text: string | undefined, keyword: string): boolean =>
  text?.toLowerCase().includes(keyword) ?? false;

const modelMatchesModelName = (row: ModelOverviewItem, keyword: string): boolean =>
  textIncludes(row.id, keyword) ||
  textIncludes(row.modelDetails.displayName, keyword) ||
  textIncludes(row.modelDetails.description, keyword);

const modelMatchesProject = (row: ModelOverviewItem, keyword: string): boolean =>
  textIncludes(row.namespace, keyword);

const modelMatchesGroupName = (row: ModelOverviewItem, keyword: string): boolean =>
  row.subscriptions.some((sub) => sub.groups?.some((group) => textIncludes(group, keyword))) ||
  row.authPolicies.some((policy) => policy.groups?.some((group) => textIncludes(group, keyword)));

const modelMatchesSubscriptionName = (row: ModelOverviewItem, keyword: string): boolean =>
  row.subscriptions.some(
    (sub) => textIncludes(sub.name, keyword) || textIncludes(sub.displayName, keyword),
  );

const modelMatchesAuthPolicyName = (row: ModelOverviewItem, keyword: string): boolean =>
  row.authPolicies.some(
    (policy) => textIncludes(policy.name, keyword) || textIncludes(policy.displayName, keyword),
  );

export const filterOverviewModels = (
  rows: ModelOverviewItem[],
  filterData: OverviewFilterDataType,
): ModelOverviewItem[] => {
  const modelKeyword = getFilterKeyword(filterData, OverviewFilterOptions.modelName);
  const projectKeyword = getFilterKeyword(filterData, OverviewFilterOptions.project);
  const groupKeyword = getFilterKeyword(filterData, OverviewFilterOptions.groupName);
  const subscriptionKeyword = getFilterKeyword(filterData, OverviewFilterOptions.subscriptionName);
  const authPolicyKeyword = getFilterKeyword(filterData, OverviewFilterOptions.authPolicyName);

  return rows.filter((row) => {
    if (modelKeyword && !modelMatchesModelName(row, modelKeyword)) {
      return false;
    }
    if (projectKeyword && !modelMatchesProject(row, projectKeyword)) {
      return false;
    }
    if (groupKeyword && !modelMatchesGroupName(row, groupKeyword)) {
      return false;
    }
    if (subscriptionKeyword && !modelMatchesSubscriptionName(row, subscriptionKeyword)) {
      return false;
    }
    if (authPolicyKeyword && !modelMatchesAuthPolicyName(row, authPolicyKeyword)) {
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
