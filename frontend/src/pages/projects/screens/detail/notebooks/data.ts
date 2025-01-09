import { SortableData } from '~/components/table';
import { getNotebookStatusPriority } from '~/pages/projects/utils';
import { NotebookState } from '~/pages/projects/notebook/types';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ProjectKind } from '~/k8sTypes';

export const getColumns = (
  projects: ProjectKind[],
  namespace?: string,
): SortableData<NotebookState>[] => {
  const columns: SortableData<NotebookState>[] = [
    {
      field: 'expand',
      label: '',
      sortable: false,
    },
    {
      field: 'name',
      label: 'Name',
      width: 25,
      sortable: (a, b) =>
        getDisplayNameFromK8sResource(a.notebook).localeCompare(
          getDisplayNameFromK8sResource(b.notebook),
        ),
    },
  ];
  if (!namespace) {
    columns.push({
      field: 'namespace',
      label: 'Project',
      width: 20,
      sortable: (a, b) => {
        const projectA = projects.find((p) => p.metadata.name === a.notebook.metadata.namespace);
        const projectB = projects.find((p) => p.metadata.name === b.notebook.metadata.namespace);
        if (!projectA) {
          if (!projectB) {
            return -1;
          }
          return 1;
        }
        if (!projectB) {
          return -1;
        }
        return getDisplayNameFromK8sResource(projectA).localeCompare(
          getDisplayNameFromK8sResource(projectB),
        );
      },
    });
  }
  columns.push(
    {
      field: 'image',
      label: 'Notebook image',
      width: 20,
      sortable: false,
    },
    {
      field: 'size',
      label: 'Container size',
      width: 15,
      sortable: false,
    },
    {
      field: 'status',
      label: 'Status',
      sortable: (a, b) => getNotebookStatusPriority(a) - getNotebookStatusPriority(b),
      width: 20,
    },
    {
      field: 'toggle-status',
      label: '',
      sortable: false,
    },
    {
      field: 'kebab',
      label: '',
      sortable: false,
    },
  );
  return columns;
};
