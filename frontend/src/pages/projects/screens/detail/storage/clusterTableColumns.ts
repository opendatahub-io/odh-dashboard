import { SortableData } from '#~/components/table';
import { ClusterStorageNotebookSelection } from '#~/pages/projects/types';

export const storageColumns: SortableData<ClusterStorageNotebookSelection>[] = [
  {
    label: 'ID',
    field: 'id',
    sortable: false,
    visibility: ['hidden'],
  },
  {
    label: 'Name',
    field: 'name',
    sortable: false,
    width: 35,
  },
  {
    label: 'Path format',
    field: 'pathFormat',
    sortable: false,
    width: 20,
  },
  {
    label: 'Mount path',
    field: 'mountPath',
    sortable: false,
    info: {
      popover:
        'The directory within a container where a volume is mounted and accessible. Must consist of lowercase letters, numbers and hyphens (-). Use slashes (/) to indicate subdirectories.',
    },
    width: 35,
  },
];
