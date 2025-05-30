import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { NotebookState } from '#~/pages/projects/notebook/types';

const getNotebookStatusValue = (notebookState: NotebookState): number => {
  if (notebookState.isRunning) {
    return 0;
  }
  if (notebookState.isStarting) {
    return 1;
  }
  if (notebookState.isStopping) {
    return 2;
  }
  if (notebookState.isStopped) {
    return 3;
  }
  return 4;
};

export const columns: SortableData<NotebookState>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a.notebook).localeCompare(
        getDisplayNameFromK8sResource(b.notebook),
      ),
    width: 40,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: (a, b) => getNotebookStatusValue(a) - getNotebookStatusValue(b),
    width: 40,
  },
  {
    field: '',
    label: '',
    sortable: false,
    width: 10,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
    width: 10,
  },
];
