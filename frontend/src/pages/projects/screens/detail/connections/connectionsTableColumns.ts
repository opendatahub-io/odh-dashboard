import { SortableData } from '@odh-dashboard/ui-core';
import { Connection, ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { getConnectionTypeDisplayName } from '#~/concepts/connectionTypes/utils';

export const getColumns = (
  connectionTypes?: ConnectionTypeConfigMapObj[],
): SortableData<Connection>[] => [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a, b) =>
      (a.metadata.annotations['openshift.io/display-name'] ?? '').localeCompare(
        b.metadata.annotations['openshift.io/display-name'] ?? '',
      ),
  },
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
    width: 15,
    sortable: false,
    modifier: 'wrap',
  },
  {
    field: 'connections',
    label: 'Connected resources',
    width: 15,
    sortable: false,
  },
  {
    field: 'status',
    label: 'Status',
    width: 15,
    sortable: (a, b) => {
      const statusA =
        a.metadata.annotations['opendatahub.io/connection-test-status'] ?? 'not-tested';
      const statusB =
        b.metadata.annotations['opendatahub.io/connection-test-status'] ?? 'not-tested';
      return statusA.localeCompare(statusB);
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
