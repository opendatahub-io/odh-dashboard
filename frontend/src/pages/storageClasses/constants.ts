import { SortableData, kebabTableColumn } from '#~/components/table';
import { StorageClassKind } from '#~/k8sTypes';
import { getStorageClassConfig } from './utils';

export enum ColumnLabel {
  DisplayName = 'Display name',
  OpenshiftStorageClass = 'OpenShift storage class',
  Enable = 'Enable',
  Default = 'Default',
  LastModified = 'Last modified',
}

export const columns: SortableData<StorageClassKind>[] = [
  {
    field: 'displayName',
    label: ColumnLabel.DisplayName,
    sortable: (a: StorageClassKind, b: StorageClassKind): number => {
      const configDisplayNameA = getStorageClassConfig(a)?.displayName;
      const configDisplayNameB = getStorageClassConfig(b)?.displayName;

      if (configDisplayNameA && configDisplayNameB) {
        return configDisplayNameA.localeCompare(configDisplayNameB);
      }

      return -1;
    },
    info: {
      popoverProps: { headerContent: 'Display name' },
      popover:
        'The display name identifies a storage class within OpenShift AI, and can be edited.',
    },
  },
  {
    field: 'storageClassName',
    label: ColumnLabel.OpenshiftStorageClass,
    sortable: false,
    info: {
      popoverProps: { headerContent: 'OpenShift storage class' },
      popover:
        'Storage classes are defined and supported by OpenShift. Their details can be edited for use in OpenShift AI.',
    },
  },
  {
    field: 'isEnabled',
    label: ColumnLabel.Enable,
    sortable: false,
    info: {
      popoverProps: { headerContent: 'Enable' },
      popover:
        'Enable users in your organization to use this storage class when creating or editing cluster storage.',
    },
  },
  {
    field: 'isDefault',
    label: ColumnLabel.Default,
    sortable: false,
    info: {
      popoverProps: { headerContent: 'Default' },
      popover:
        'The default storage class is automatically selected for OpenShift AI users when creating new cluster storage.',
    },
  },
  {
    field: 'lastModified',
    label: ColumnLabel.LastModified,
    sortable: (a, b) =>
      new Date(getStorageClassConfig(a)?.lastModified || '').getTime() -
      new Date(getStorageClassConfig(b)?.lastModified || '').getTime(),
  },
  kebabTableColumn(),
];

export enum StorageClassFilterOption {
  DisplayName = 'displayName',
  OpenshiftScName = 'openshiftScName',
}

export const storageClassFilterOptions = {
  [StorageClassFilterOption.DisplayName]: 'Display name',
  [StorageClassFilterOption.OpenshiftScName]: 'OpenShift storage class',
};

export type StorageClassFilterData = Record<StorageClassFilterOption, string>;

export const initialScFilterData: StorageClassFilterData = {
  [StorageClassFilterOption.DisplayName]: '',
  [StorageClassFilterOption.OpenshiftScName]: '',
};
