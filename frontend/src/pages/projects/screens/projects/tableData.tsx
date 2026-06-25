import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { SortableData } from '@odh-dashboard/ui-core';
import { getProjectCreationTime } from '#~/concepts/projects/utils';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

export const columns: SortableData<ProjectKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
    width: 40,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: (a, b) => getProjectCreationTime(a) - getProjectCreationTime(b),
    width: 40,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
    width: 20,
  },
];
