import { SortableData } from '#~/components/table';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { getCreatorFromK8sResource, getResourceNameFromK8sResource } from '#~/concepts/k8s/utils';

// testing
const sorter = (
  a: ConnectionTypeConfigMapObj,
  b: ConnectionTypeConfigMapObj,
  keyField: string,
): number => {
  let compValue = 0;

  if (keyField === 'creator') {
    const aValue = getCreatorFromK8sResource(a);
    const bValue = getCreatorFromK8sResource(b);
    compValue = aValue.localeCompare(bValue);
  } else if (keyField === 'created') {
    const aValue = a.metadata.creationTimestamp
      ? new Date(a.metadata.creationTimestamp)
      : new Date();
    const bValue = b.metadata.creationTimestamp
      ? new Date(b.metadata.creationTimestamp)
      : new Date();
    return bValue.getTime() - aValue.getTime();
  } else if (keyField === 'enable') {
    const aDisabled = a.metadata.annotations?.['opendatahub.io/disabled'] === 'true';
    const bDisabled = b.metadata.annotations?.['opendatahub.io/disabled'] === 'true';
    compValue = aDisabled === bDisabled ? 0 : aDisabled ? 1 : -1;
  }

  if (compValue !== 0) {
    return compValue;
  }

  const aValue = getResourceNameFromK8sResource(a);
  const bValue = getResourceNameFromK8sResource(b);

  return aValue.localeCompare(bValue);
};

export const connectionTypeColumns: SortableData<ConnectionTypeConfigMapObj>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: sorter,
    width: 25,
  },
  {
    label: 'Category',
    field: 'category',
    sortable: false,
    width: 15,
  },
  {
    label: 'Model serving compatibility',
    field: 'compatibility',
    sortable: false,
    width: 15,
    modifier: 'wrap',
  },
  {
    label: 'Creator',
    field: 'creator',
    sortable: sorter,
    width: 15,
  },
  {
    label: 'Created',
    field: 'created',
    sortable: sorter,
    width: 15,
  },
  {
    label: 'Enable',
    field: 'enable',
    sortable: sorter,
    info: {
      popover:
        'Enable users in your organization to use this connection type when adding connections. Disabling a connection type will not affect existing connections of that type.',
      popoverProps: {
        headerContent: 'Enable',
      },
    },
    width: 10,
  },
];
