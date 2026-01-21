import { SortableData } from '#~/components/table';
import { SubjectRoleRow } from './types';
import { ROLE_BINDING_DATE_CREATED_TOOLTIP } from './const';

export const columns: SortableData<SubjectRoleRow>[] = [
  {
    field: 'subjectName',
    label: 'Name',
    width: 25,
    sortable: (a, b) => a.subjectName.localeCompare(b.subjectName),
  },
  {
    field: 'role',
    label: 'Role',
    width: 40,
    sortable: false,
  },
  {
    field: 'roleBindingCreationTimestamp',
    label: 'Date created',
    width: 25,
    info: {
      popover: ROLE_BINDING_DATE_CREATED_TOOLTIP,
      ariaLabel: 'Date created help',
    },
    sortable: (a, b) =>
      new Date(b.roleBindingCreationTimestamp || 0).getTime() -
      new Date(a.roleBindingCreationTimestamp || 0).getTime(),
  },
  {
    field: 'actions',
    label: '',
    width: 10,
    sortable: false,
  },
];
