import { SortableData } from '@odh-dashboard/ui-core';
import {
  Connection,
  ConnectionTestStatus,
  ConnectionTypeConfigMapObj,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';
import { getConnectionTypeDisplayName } from '#~/concepts/connectionTypes/utils';

export const getColumns = (
  connectionTypes?: ConnectionTypeConfigMapObj[],
  showStatusColumn = false,
): SortableData<Connection>[] => [
  {
    field: 'name',
    label: 'Name',
    width: showStatusColumn ? 25 : 30,
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
    width: showStatusColumn ? 15 : 20,
    sortable: false,
  },
  ...(showStatusColumn
    ? ([
        {
          field: 'status',
          label: 'Status',
          width: 15 as const,
          sortable: (a: Connection, b: Connection) => {
            const statusA =
              a.metadata.annotations[CONNECTION_TEST_ANNOTATIONS.STATUS] ||
              ConnectionTestStatus.NOT_TESTED;
            const statusB =
              b.metadata.annotations[CONNECTION_TEST_ANNOTATIONS.STATUS] ||
              ConnectionTestStatus.NOT_TESTED;
            return statusA.localeCompare(statusB);
          },
        },
      ] satisfies SortableData<Connection>[])
    : []),
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
