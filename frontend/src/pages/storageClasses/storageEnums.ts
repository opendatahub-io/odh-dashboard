// list of storage provisioners
// reference docs:
// 1. https://github.com/openshift/console/blob/1b1c0b8832b523f958e3a4a196677e3c227b8166/frontend/public/components/storage/shared.ts#L33
// 2. https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/storage/understanding-persistent-storage#pv-access-modes_understanding-persistent-storage
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
  FILE_CSI_AZURE = 'file.csi.azure.com',
}

// list of access modes
export enum AccessMode {
  RWO = 'ReadWriteOnce',
  RWX = 'ReadWriteMany',
  ROX = 'ReadOnlyMany',
  RWOP = 'ReadWriteOncePod',
}

export const AccessLabelToTextMap = {
  ReadWriteOnce: 'RWO',
  ReadWriteMany: 'RWX',
  ReadOnlyMany: 'ROX',
  ReadWriteOncePod: 'RWOP',
};

// object that maps provisioners to their supported access modes
export const provisionerAccessModes: Record<StorageProvisioner, AccessMode[]> = {
  [StorageProvisioner.NO_PROVISIONER]: [AccessMode.RWO],
  [StorageProvisioner.AWS_EBS]: [AccessMode.RWO, AccessMode.RWOP],
  [StorageProvisioner.GCE_PD]: [AccessMode.RWO, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.GLUSTERFS]: [AccessMode.RWO, AccessMode.RWX, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.CINDER]: [AccessMode.RWO, AccessMode.RWOP],
  [StorageProvisioner.AZURE_FILE]: [
    AccessMode.RWO,
    AccessMode.RWX,
    AccessMode.ROX,
    AccessMode.RWOP,
  ],
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
  [StorageProvisioner.CEPHFS_CSI]: [
    AccessMode.RWO,
    AccessMode.RWX,
    AccessMode.ROX,
    AccessMode.RWOP,
  ],
  [StorageProvisioner.RBD_CSI]: [AccessMode.RWO, AccessMode.ROX, AccessMode.RWOP],
  [StorageProvisioner.FILE_CSI_AZURE]: [
    AccessMode.RWO,
    AccessMode.RWX,
    AccessMode.ROX,
    AccessMode.RWOP,
  ],
};
