import { SortableData } from '~/components/table';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';

const sorter = (
  a: ConnectionTypeConfigMapObj,
  b: ConnectionTypeConfigMapObj,
  keyField: string,
): number => {
  let compValue = 0;

  if (keyField === 'creator') {
    const aValue =
      a.metadata.annotations?.['opendatahub.io/username'] === 'Pre-installed'
        ? 'Pre-installed'
        : a.metadata.annotations?.['opendatahub.io/username'] || 'unknown';
    const bValue =
      b.metadata.annotations?.['opendatahub.io/username'] === 'Pre-installed'
        ? 'Pre-installed'
        : b.metadata.annotations?.['opendatahub.io/username'] || 'unknown';
    compValue = aValue.localeCompare(bValue);
  }

  if (keyField === 'created') {
    const aValue = a.metadata.creationTimestamp
      ? new Date(a.metadata.creationTimestamp)
      : new Date();
    const bValue = b.metadata.creationTimestamp
      ? new Date(b.metadata.creationTimestamp)
      : new Date();
    return bValue.getTime() - aValue.getTime();
  }

  if (keyField === 'enable') {
    return a.metadata.annotations?.['opendatahub.io/enabled'] === 'true' ||
      b.metadata.annotations?.['opendatahub.io/enabled'] !== 'true'
      ? -1
      : 1;
  }

  if (compValue !== 0) {
    return compValue;
  }

  const aValue = a.metadata.annotations?.['openshift.io/display-name'] || a.metadata.name;
  const bValue = b.metadata.annotations?.['openshift.io/display-name'] || b.metadata.name;

  return aValue.localeCompare(bValue);
};

export const connectionTypeColumns: SortableData<ConnectionTypeConfigMapObj>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: sorter,
  },
  {
    label: 'Creator',
    field: 'creator',
    sortable: sorter,
  },
  {
    label: 'Created',
    field: 'created',
    sortable: sorter,
  },
  {
    label: 'Enable',
    field: 'Enable',
    sortable: sorter,
    info: {
      popover:
        'Enable users in your organization to use this connection type when adding connections. Disabling a connection type will not affect existing connections of that type.',
      popoverProps: {
        headerContent: 'Enable',
      },
    },
  },
];
