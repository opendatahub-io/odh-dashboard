import { SortableData } from '~/components/table';
import { Connection } from './types';

export const columns: SortableData<Connection>[] = [
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
      a.metadata.annotations['opendatahub.io/connection-type'].localeCompare(
        b.metadata.annotations['opendatahub.io/connection-type'],
      ),
  },
  {
    field: 'compatibility',
    label: 'Compatibility',
    width: 20,
    sortable: true,
  },
  {
    field: 'connections',
    label: 'Connected resources',
    width: 30,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
