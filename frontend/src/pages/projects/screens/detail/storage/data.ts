import { SortableData } from '~/components/table';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getStorageClassConfig } from '~/pages/storageClasses/utils';
import { ProjectKind } from '~/k8sTypes';
import { StorageTableData } from './types';

export const getStorageColumns = (
  isStorageClassesAvailable: boolean,
  workbenchEnabled: boolean,
  projects: ProjectKind[],
  namespace?: string,
): SortableData<StorageTableData>[] => {
  const columns: SortableData<StorageTableData>[] = [
    {
      field: 'name',
      label: 'Name',
      width: 30,
      sortable: (a, b) =>
        getDisplayNameFromK8sResource(a.pvc).localeCompare(getDisplayNameFromK8sResource(b.pvc)),
    },
  ];
  if (!namespace) {
    columns.push({
      field: 'namespace',
      label: 'Project',
      width: 15,
      sortable: (a, b) => {
        const projectA = projects.find((p) => p.metadata.name === a.pvc.metadata.namespace);
        const projectB = projects.find((p) => p.metadata.name === b.pvc.metadata.namespace);
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

  if (isStorageClassesAvailable) {
    columns.push({
      field: 'storage',
      label: 'Storage class',
      width: 30,
      sortable: (a, b) =>
        (a.storageClass
          ? getStorageClassConfig(a.storageClass)?.displayName ?? a.storageClass.metadata.name
          : a.pvc.spec.storageClassName ?? ''
        ).localeCompare(
          b.storageClass
            ? getStorageClassConfig(b.storageClass)?.displayName ?? b.storageClass.metadata.name
            : b.pvc.spec.storageClassName ?? '',
        ),
    });
  }

  columns.push(
    {
      field: 'type',
      label: 'Type',
      width: 20,
      sortable: false,
    },
    {
      field: 'storage_size',
      label: 'Storage size',
      width: 20,
      sortable: false,
    },
  );

  if (workbenchEnabled) {
    columns.push({
      field: 'connected',
      label: 'Workbench connections',
      width: 20,
      sortable: false,
    });
  }

  columns.push({
    field: 'kebab',
    label: '',
    sortable: false,
  });

  return columns;
};
