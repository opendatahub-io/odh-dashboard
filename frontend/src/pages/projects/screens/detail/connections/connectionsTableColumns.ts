import { Connection } from '~/concepts/connectionTypes/types';
import { SortableData } from '~/components/table';

export const columns: SortableData<Connection>[] = [
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
      a.metadata.annotations['opendatahub.io/connection-type'].localeCompare(
        b.metadata.annotations['opendatahub.io/connection-type'],
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
