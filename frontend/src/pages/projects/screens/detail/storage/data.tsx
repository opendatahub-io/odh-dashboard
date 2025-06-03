import * as React from 'react';
import { SortableData } from '#~/components/table';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import PopoverListContent from '#~/components/PopoverListContent';
import { StorageTableData } from './types';

const ACCESS_MODE_DESCRIPTIONS: Record<AccessMode, string> = {
  [AccessMode.RWO]: 'means that the storage can be attached to a single workbench at a given time.',
  [AccessMode.RWOP]:
    'means that the storage can be attached to a single pod on a single node as read-write',
  [AccessMode.RWX]: 'means that the storage can be attached to many workbenches simultaneously.',
  [AccessMode.ROX]: 'means that the storage can be attached to many workbenches as read-only.',
} as const;

export const AccessModeColumnInfo = (
  <PopoverListContent
    leadText="Access mode is a Kubernetes concept that determines how nodes can interact with the volume."
    listItems={[
      <React.Fragment key="rwo">
        <strong>ReadWriteOnce (RWO):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWO]}
      </React.Fragment>,
      <React.Fragment key="rwx">
        <strong>ReadWriteMany (RWX):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWX]}
      </React.Fragment>,
      <React.Fragment key="rox">
        <strong>ReadOnlyMany (ROX):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.ROX]}
      </React.Fragment>,
      <React.Fragment key="rwop">
        <strong>ReadWriteOncePod (RWOP):</strong> {ACCESS_MODE_DESCRIPTIONS[AccessMode.RWOP]}
      </React.Fragment>,
    ]}
  />
);

export const columns: SortableData<StorageTableData>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a.pvc).localeCompare(getDisplayNameFromK8sResource(b.pvc)),
  },
  {
    field: 'storage',
    label: 'Storage class',
    width: 20,
    sortable: (a, b) =>
      (a.storageClass
        ? getStorageClassConfig(a.storageClass)?.displayName ?? a.storageClass.metadata.name
        : a.pvc.spec.storageClassName ?? ''
      ).localeCompare(
        b.storageClass
          ? getStorageClassConfig(b.storageClass)?.displayName ?? b.storageClass.metadata.name
          : b.pvc.spec.storageClassName ?? '',
      ),
  },
  {
    field: 'accessMode',
    label: 'Access mode',
    width: 25,
    sortable: (a, b) => (a.pvc.spec.accessModes?.[0] ?? '').localeCompare(b.pvc.spec.accessModes?.[0] ?? ''),
    info: {
      popover: AccessModeColumnInfo,
      popoverProps: {
        showClose: true,
        maxWidth: '500px',
      },
    },
  },
  {
    field: 'type',
    label: 'Type',
    width: 25,
    sortable: false,
  },
  {
    field: 'storage_size',
    label: 'Storage size',
    width: 20,
    sortable: false,
  },
  {
    field: 'connected',
    label: 'Workbench connections',
    width: 20,
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
