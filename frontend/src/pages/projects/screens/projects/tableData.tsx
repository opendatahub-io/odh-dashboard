import { SortableData } from '#~/components/table';
import { ProjectKind } from '#~/k8sTypes';
import { getProjectCreationTime } from '#~/concepts/projects/utils';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

export const columns: SortableData<ProjectKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
    width: 30,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: (a, b) => getProjectCreationTime(a) - getProjectCreationTime(b),
    width: 30,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
    width: 10,
  },
];
