import { PersistentVolumeClaimKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  storage?: string;
};

export const mockPVCK8sResource = ({
  name = 'test-storage',
  namespace = 'test-project',
  storage = '5Gi',
}: MockResourceConfigType): PersistentVolumeClaimKind => ({
  kind: 'PersistentVolumeClaim',
  apiVersion: 'v1',
  metadata: {
    annotations: {
      'openshift.io/description': '',
      'openshift.io/display-name': 'Test Storage',
      'pv.kubernetes.io/bind-completed': 'yes',
      'pv.kubernetes.io/bound-by-controller': 'yes',
      'volume.beta.kubernetes.io/storage-provisioner': 'ebs.csi.aws.com',
      'volume.kubernetes.io/selected-node': 'ip-10-0-133-119.us-west-2.compute.internal',
      'volume.kubernetes.io/storage-provisioner': 'ebs.csi.aws.com',
    },
    resourceVersion: '864084751',
    name,
    uid: '8644e33b-a710-45a3-9d54-7f987494643a',
    creationTimestamp: '2023-03-03T03:17:32Z',
    managedFields: [
      {
        manager: 'unknown',
        operation: 'Update',
        apiVersion: 'v1',
        time: '2023-03-03T03:17:32Z',
        fieldsType: 'FieldsV1',
        fieldsV1: {
          'f:metadata': {
            'f:annotations': {
              '.': {},
              'f:openshift.io/description': {},
              'f:openshift.io/display-name': {},
            },
            'f:labels': {
              '.': {},
              'f:opendatahub.io/dashboard': {},
            },
          },
          'f:spec': {
            'f:accessModes': {},
            'f:resources': {
              'f:requests': {
                '.': {},
                'f:storage': {},
              },
            },
            'f:volumeMode': {},
          },
        },
      },
      {
        manager: 'kube-scheduler',
        operation: 'Update',
        apiVersion: 'v1',
        time: '2023-03-03T03:17:33Z',
        fieldsType: 'FieldsV1',
        fieldsV1: {
          'f:metadata': {
            'f:annotations': {
              'f:volume.kubernetes.io/selected-node': {},
            },
          },
        },
      },
      {
        manager: 'kube-controller-manager',
        operation: 'Update',
        apiVersion: 'v1',
        time: '2023-03-03T03:17:36Z',
        fieldsType: 'FieldsV1',
        fieldsV1: {
          'f:metadata': {
            'f:annotations': {
              'f:pv.kubernetes.io/bind-completed': {},
              'f:pv.kubernetes.io/bound-by-controller': {},
              'f:volume.beta.kubernetes.io/storage-provisioner': {},
              'f:volume.kubernetes.io/storage-provisioner': {},
            },
          },
          'f:spec': {
            'f:volumeName': {},
          },
        },
      },
      {
        manager: 'kube-controller-manager',
        operation: 'Update',
        apiVersion: 'v1',
        time: '2023-03-03T03:17:36Z',
        fieldsType: 'FieldsV1',
        fieldsV1: {
          'f:status': {
            'f:accessModes': {},
            'f:capacity': {
              '.': {},
              'f:storage': {},
            },
            'f:phase': {},
          },
        },
        subresource: 'status',
      },
    ],
    namespace,
    finalizers: ['kubernetes.io/pvc-protection'],
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
  },
  spec: {
    accessModes: ['ReadWriteOnce'],
    resources: {
      requests: {
        storage,
      },
    },
    volumeName: 'pvc-8644e33b-a710-45a3-9d54-7f987494643a',
    storageClassName: 'gp3',
    volumeMode: 'Filesystem',
  },
  status: {
    phase: 'Bound',
    accessModes: ['ReadWriteOnce'],
    capacity: {
      storage,
    },
  },
});
