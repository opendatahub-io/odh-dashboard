import { SortableData } from '#~/components/table/types';
import { ResourceRule } from '#~/k8sTypes';

const toSortableValue = (values?: string[]): string => {
  if (!values || values.length === 0) {
    // Keep "no values" at the bottom when sorting asc.
    return '\uFFFF';
  }
  if (values.includes('*')) {
    return 'All';
  }
  return values.join(', ');
};

const compareRuleListField = (a: ResourceRule, b: ResourceRule, keyField: string): number => {
  const get = (r: ResourceRule): string => {
    switch (keyField) {
      case 'apiGroups':
        return toSortableValue(r.apiGroups);
      case 'resources':
        return toSortableValue(r.resources);
      case 'resourceNames':
        return toSortableValue(r.resourceNames);
      default:
        return '';
    }
  };

  return get(a).localeCompare(get(b));
};

export const columns: SortableData<ResourceRule>[] = [
  { field: 'verbs', label: 'Actions', sortable: false, width: 15 },
  { field: 'apiGroups', label: 'API Groups', sortable: compareRuleListField, width: 25 },
  { field: 'resources', label: 'Resources', sortable: compareRuleListField, width: 35 },
  {
    field: 'resourceNames',
    label: 'Resource names',
    info: {
      popover: 'If no names are listed, the rule applies to all resources of that type.',
      ariaLabel: 'Resource names help',
    },
    sortable: compareRuleListField,
    width: 25,
  },
];
