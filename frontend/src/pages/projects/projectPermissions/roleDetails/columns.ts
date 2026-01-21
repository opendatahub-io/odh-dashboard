import { SortableData } from '#~/components/table/types';
import { RoleAssignment } from '#~/concepts/permissions/types';
import { ResourceRule } from '#~/k8sTypes';
import { ROLE_BINDING_DATE_CREATED_TOOLTIP } from '#~/pages/projects/projectPermissions/const';

const toSortableValue = (values?: string[]): string => {
  const normalized = (values ?? []).map((v) => v.trim()).filter((v) => v.length > 0);
  if (normalized.length === 0) {
    // Keep "no values" at the bottom when sorting asc.
    return '\uFFFF';
  }
  if (normalized.includes('*')) {
    return 'All';
  }
  return normalized.join(', ');
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

export const resourceRulesColumns: SortableData<ResourceRule>[] = [
  { field: 'verbs', label: 'Actions', sortable: false, width: 15 },
  { field: 'apiGroups', label: 'API Groups', sortable: compareRuleListField, width: 25 },
  { field: 'resources', label: 'Resource type', sortable: compareRuleListField, width: 35 },
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

export const assigneesColumns: SortableData<RoleAssignment>[] = [
  {
    field: 'subjectName',
    label: 'Subject',
    sortable: (a, b) => a.subject.name.localeCompare(b.subject.name),
    width: 25,
  },
  {
    field: 'subjectKind',
    label: 'Subject kind',
    sortable: (a, b) => a.subject.kind.localeCompare(b.subject.kind),
    width: 15,
  },
  {
    field: 'roleBindingName',
    label: 'Role binding',
    sortable: (a, b) => a.roleBinding.metadata.name.localeCompare(b.roleBinding.metadata.name),
    width: 30,
  },
  {
    field: 'roleBindingCreationTimestamp',
    label: 'Date created',
    info: {
      popover: ROLE_BINDING_DATE_CREATED_TOOLTIP,
      ariaLabel: 'Date created help',
    },
    sortable: (a, b) =>
      new Date(b.roleBinding.metadata.creationTimestamp || 0).getTime() -
      new Date(a.roleBinding.metadata.creationTimestamp || 0).getTime(),
    width: 30,
  },
];
