import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { SortableData } from '~/components/table';
import { getConnectionTypeDisplayName } from '~/concepts/connectionTypes/utils';
import { ProjectKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

export const getColumns = (
  connectionTypes: ConnectionTypeConfigMapObj[],
  projects: ProjectKind[],
  namespace?: string,
): SortableData<Connection>[] => {
  const columns: SortableData<Connection>[] = [
    {
      field: 'name',
      label: 'Name',
      width: 30,
      sortable: (a, b) =>
        (a.metadata.annotations['openshift.io/display-name'] ?? '').localeCompare(
          b.metadata.annotations['openshift.io/display-name'] ?? '',
        ),
    },
  ];
  if (!namespace) {
    columns.push({
      field: 'namespace',
      label: 'Project',
      width: 15,
      sortable: (a, b) => {
        const projectA = projects.find((p) => p.metadata.name === a.metadata.namespace);
        const projectB = projects.find((p) => p.metadata.name === b.metadata.namespace);
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
      field: 'type',
      label: 'Type',
      width: 20,
      sortable: (a, b) =>
        (getConnectionTypeDisplayName(a, connectionTypes) || '').localeCompare(
          getConnectionTypeDisplayName(b, connectionTypes) || '',
        ),
    },
    {
      field: 'compatibility',
      label: 'Model serving compatibility',
      width: 20,
      sortable: false,
      modifier: 'wrap',
    },
    {
      field: 'connections',
      label: 'Connected resources',
      width: 25,
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
