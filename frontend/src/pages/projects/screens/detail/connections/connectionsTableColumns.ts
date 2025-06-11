import { Connection, ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { SortableData } from '#~/components/table';
import { getConnectionTypeDisplayName } from '#~/concepts/connectionTypes/utils';

export const getColumns = (
  connectionTypes?: ConnectionTypeConfigMapObj[],
): SortableData<Connection>[] => [
  {
    field: 'name',
    label: 'Name',
    width: 30,
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
];
