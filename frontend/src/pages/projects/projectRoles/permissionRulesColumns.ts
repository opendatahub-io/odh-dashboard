import { SortableData } from '@odh-dashboard/ui-core';
import type { RuleEntry } from './types';

const normalizeValues = (values?: string[]): string[] =>
  (values ?? []).map((v) => {
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : 'core';
  });

const toSortableValue = (values?: string[]): string => {
  const normalized = normalizeValues(values);
  if (normalized.length === 0) {
    return '\uFFFF';
  }
  if (normalized.includes('*')) {
    return 'All';
  }
  return normalized.join(', ');
};

const compareField =
  (field: 'apiGroups' | 'resources' | 'resourceNames') =>
  (a: RuleEntry, b: RuleEntry): number =>
    toSortableValue(a[field]).localeCompare(toSortableValue(b[field]));

export const permissionRulesColumns: SortableData<RuleEntry>[] = [
  {
    field: 'resources',
    label: 'Resources',
    sortable: compareField('resources'),
    width: 20,
  },
  {
    field: 'verbs',
    label: 'Operations',
    sortable: false,
    width: 20,
  },
  {
    field: 'apiGroups',
    label: 'API groups',
    sortable: compareField('apiGroups'),
    width: 25,
  },
  {
    field: 'resourceNames',
    label: 'Resource names',
    info: {
      popover:
        'The specific resources that this rule applies to. If no names are listed, the rule applies to all resources of that type.',
      ariaLabel: 'Resource name help',
    },
    sortable: compareField('resourceNames'),
    width: 20,
  },
];

export const formatRuleValues = (values?: string[]): string => {
  const normalized = normalizeValues(values);
  if (normalized.length === 0) {
    return '-';
  }
  if (normalized.includes('*')) {
    return 'All';
  }
  return normalized.join(', ');
};
