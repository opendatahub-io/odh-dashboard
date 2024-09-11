import { Connection } from '~/concepts/connectionTypes/types';
import { SortableData } from '~/components/table';

export const columns: SortableData<Connection>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 35,
    sortable: (a, b) =>
      (a.metadata.annotations['openshift.io/display-name'] ?? '').localeCompare(
        b.metadata.annotations['openshift.io/display-name'] ?? '',
      ),
  },
  {
    field: 'type',
    label: 'Type',
    width: 25,
    sortable: (a, b) =>
      a.metadata.annotations['opendatahub.io/connection-type'].localeCompare(
        b.metadata.annotations['opendatahub.io/connection-type'],
      ),
  },
  {
    field: 'connections',
    label: 'Connected resources',
    width: 35,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
