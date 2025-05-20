import { SortableData, kebabTableColumn } from '~/components/table';
import { StorageClassKind } from '~/k8sTypes';
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

export enum ProvisionerList {
  No_Provisioner = "kubernetes.io/no-provisioner",
  Aws_Ebs = "kubernetes.io/aws-ebs",
  Gce_Pd = "kubernetes.io/gce-pd",
  Glusterfs = "kubernetes.io/glusterfs",
  Cinder = "kubernetes.io/cinder",
  Azure_File = "kubernetes.io/azure-file",
  Azure_Disk = "kubernetes.io/azure-disk",
  Quobyte = "kubernetes.io/quobyte",
  Vsphere_Volume = "kubernetes.io/vsphere-volume",
  Portworx_Volume = "kubernetes.io/portworx-volume",
  Scaleio = "kubernetes.io/scaleio",
  Storageos = "kubernetes.io/storageos",
  Openstack = "cinder.csi.openstack.org"
}

export enum AccessModes {
  RWO = 'RWO',
  RWOP = 'RWOP',
  ROX = 'ROX',
  RWX = 'RWX'
}

export const ProvisionAccessModeMap = {
  [ProvisionerList.No_Provisioner]: [],
  [ProvisionerList.Aws_Ebs]: [AccessModes.RWO, AccessModes.RWOP],
  [ProvisionerList.Azure_File]:[AccessModes.RWO, AccessModes.RWOP, AccessModes.ROX, AccessModes.RWX],
  [ProvisionerList.Azure_Disk]:[AccessModes.RWO, AccessModes.RWOP],
  [ProvisionerList.Cinder]:[AccessModes.RWO, AccessModes.RWOP],
  [ProvisionerList.Gce_Pd]:[AccessModes.RWO, AccessModes.RWOP],
  [ProvisionerList.Glusterfs]:[],
  [ProvisionerList.Openstack]:[AccessModes.RWOP, AccessModes.RWX],
  [ProvisionerList.Portworx_Volume]:[],
  [ProvisionerList.Quobyte]:[],
  [ProvisionerList.Scaleio]:[],
  [ProvisionerList.Storageos]:[],
  [ProvisionerList.Vsphere_Volume]:[AccessModes.RWO, AccessModes.RWOP, AccessModes.RWX]
}

