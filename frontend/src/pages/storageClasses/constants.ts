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

// list of storage provisioners
// reference: https://github.com/openshift/console/blob/1b1c0b8832b523f958e3a4a196677e3c227b8166/frontend/public/components/storage/shared.ts#L33
export enum StorageProvisioner {
  NO_PROVISIONER = 'kubernetes.io/no-provisioner',
  AWS_EBS = 'kubernetes.io/aws-ebs',
  GCE_PD = 'kubernetes.io/gce-pd',
  GLUSTERFS = 'kubernetes.io/glusterfs',
  CINDER = 'kubernetes.io/cinder',
  AZURE_FILE = 'kubernetes.io/azure-file',
  AZURE_DISK = 'kubernetes.io/azure-disk',
  QUOBYTE = 'kubernetes.io/quobyte',
  RBD = 'kubernetes.io/rbd',
  VSPHERE_VOLUME = 'kubernetes.io/vsphere-volume',
  PORTWORX_VOLUME = 'kubernetes.io/portworx-volume',
  SCALEIO = 'kubernetes.io/scaleio',
  STORAGEOS = 'kubernetes.io/storageos',
  MANILA_CSI = 'manila.csi.openstack.org',
  EBS_CSI = 'ebs.csi.aws.com',
  BLOCK_CSI_IBM = 'block.csi.ibm.com',
  OVIRT_CSI = 'csi.ovirt.org',
  CINDER_CSI = 'cinder.csi.openstack.org',
  PD_CSI_GKE = 'pd.csi.storage.gke.io',
  CEPHFS_CSI = 'cephfs.csi.ceph.com',
  RBD_CSI = 'rbd.csi.ceph.com',
  FILE_CSI_AZURE = 'file.csi.azure.com'
}

// list of access modes
export enum AccessMode {
  RWO = 'ReadWriteOnce',
  RWX = 'ReadWriteMany',
  ROX = 'ReadOnlyMany',
  RWOP = 'ReadWriteOncePod'
}

// object that maps provisioners to their supported access modes
export const provisionerAccessModes: Record<StorageProvisioner, AccessMode[]> = {
  [StorageProvisioner.NO_PROVISIONER]: [AccessMode.RWO],
  [StorageProvisioner.AWS_EBS]: [AccessMode.RWO, AccessMode.RWOP],
  [StorageProvisioner.GCE_PD]: [AccessMode.RWO, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.GLUSTERFS]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.CINDER]: [AccessMode.RWO, AccessMode.RWOP],
  [StorageProvisioner.AZURE_FILE]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.AZURE_DISK]: [AccessMode.RWO],
  [StorageProvisioner.QUOBYTE]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX],
  [StorageProvisioner.RBD]: [AccessMode.RWO, AccessMode.ROX],
  [StorageProvisioner.VSPHERE_VOLUME]: [AccessMode.RWO, AccessMode.RWX],
  [StorageProvisioner.PORTWORX_VOLUME]: [AccessMode.RWO, AccessMode.RWX],
  [StorageProvisioner.SCALEIO]: [AccessMode.RWO, AccessMode.ROX],
  [StorageProvisioner.STORAGEOS]: [AccessMode.RWO],
  [StorageProvisioner.MANILA_CSI]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX],
  [StorageProvisioner.EBS_CSI]: [AccessMode.RWO],
  [StorageProvisioner.BLOCK_CSI_IBM]: [AccessMode.RWO, AccessMode.RWX],
  [StorageProvisioner.OVIRT_CSI]: [AccessMode.RWO],
  [StorageProvisioner.CINDER_CSI]: [AccessMode.RWO],
  [StorageProvisioner.PD_CSI_GKE]: [AccessMode.RWO, AccessMode.RWOP],
  [StorageProvisioner.CEPHFS_CSI]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.RBD_CSI]: [AccessMode.RWO, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.FILE_CSI_AZURE]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP]
} as const;

export type ProvisionerAccessModes = typeof provisionerAccessModes; 

