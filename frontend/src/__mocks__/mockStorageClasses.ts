import { K8sResourceListResult, StorageClassKind } from '~/k8sTypes';

type MockStorageClass = Omit<StorageClassKind, 'apiVersion' | 'kind'>;

export type MockStorageClassList = Omit<K8sResourceListResult<MockStorageClass>, 'metadata'> & {
  metadata: {
    resourceVersion: string;
  };
};

export const mockStorageClassList = (
  storageClasses: MockStorageClass[] = mockStorageClasses,
): MockStorageClassList => ({
  kind: 'StorageClassList',
  apiVersion: 'storage.k8s.io/v1',
  metadata: {
    resourceVersion: '55571379',
  },
  items: storageClasses,
});

const mockStorageClasses: MockStorageClass[] = [
  {
    metadata: {
      name: 'csi-manila-ceph',
      uid: 'c3c05a4a-c1b7-4358-a246-da6b6dfd12cd',
      resourceVersion: '50902775',
      creationTimestamp: '2024-07-04T09:21:40Z',
      annotations: {
        'opendatahub.io/sc-config':
          '{"displayName":"csi-manila-ceph","isDefault":false,"isEnabled":false,"lastModified":"2024-08-22T15:42:53.100Z"}',
      },
      managedFields: [
        {
          manager: 'csi-driver-manila-operator',
          operation: 'Update',
          apiVersion: 'storage.k8s.io/v1',
          time: '2024-07-04T09:21:40Z',
          fieldsType: 'FieldsV1',
          fieldsV1: {
            'f:parameters': {
              '.': {},
              'f:csi.storage.k8s.io/node-publish-secret-name': {},
              'f:csi.storage.k8s.io/node-publish-secret-namespace': {},
              'f:csi.storage.k8s.io/node-stage-secret-name': {},
              'f:csi.storage.k8s.io/node-stage-secret-namespace': {},
              'f:csi.storage.k8s.io/provisioner-secret-name': {},
              'f:csi.storage.k8s.io/provisioner-secret-namespace': {},
              'f:type': {},
            },
            'f:provisioner': {},
            'f:reclaimPolicy': {},
            'f:volumeBindingMode': {},
          },
        },
        {
          manager: 'unknown',
          operation: 'Update',
          apiVersion: 'storage.k8s.io/v1',
          time: '2024-08-22T15:42:53Z',
          fieldsType: 'FieldsV1',
          fieldsV1: {
            'f:metadata': {
              'f:annotations': {
                '.': {},
                'f:opendatahub.io/sc-config': {},
              },
            },
          },
        },
      ],
    },
    provisioner: 'manila.csi.openstack.org',
    parameters: JSON.stringify({
      'csi.storage.k8s.io/node-publish-secret-name': 'csi-manila-secrets',
      'csi.storage.k8s.io/node-publish-secret-namespace': 'openshift-manila-csi-driver',
      'csi.storage.k8s.io/node-stage-secret-name': 'csi-manila-secrets',
      'csi.storage.k8s.io/node-stage-secret-namespace': 'openshift-manila-csi-driver',
      'csi.storage.k8s.io/provisioner-secret-name': 'csi-manila-secrets',
      'csi.storage.k8s.io/provisioner-secret-namespace': 'openshift-manila-csi-driver',
      type: 'ceph',
    }),
    reclaimPolicy: 'Delete',
    volumeBindingMode: 'Immediate',
  },
  {
    metadata: {
      name: 'csi-manila-netapp',
      uid: 'f818edb6-3936-4ca0-90af-87f469c177d8',
      resourceVersion: '50902773',
      creationTimestamp: '2024-07-04T09:21:40Z',
      annotations: {
        'opendatahub.io/sc-config':
          '{"displayName":"csi-manila-netapp","isDefault":false,"isEnabled":false,"lastModified":"2024-08-22T15:42:53.101Z"}',
      },
      managedFields: [
        {
          manager: 'csi-driver-manila-operator',
          operation: 'Update',
          apiVersion: 'storage.k8s.io/v1',
          time: '2024-07-04T09:21:40Z',
          fieldsType: 'FieldsV1',
          fieldsV1: {
            'f:parameters': {
              '.': {},
              'f:csi.storage.k8s.io/node-publish-secret-name': {},
              'f:csi.storage.k8s.io/node-publish-secret-namespace': {},
              'f:csi.storage.k8s.io/node-stage-secret-name': {},
              'f:csi.storage.k8s.io/node-stage-secret-namespace': {},
              'f:csi.storage.k8s.io/provisioner-secret-name': {},
              'f:csi.storage.k8s.io/provisioner-secret-namespace': {},
              'f:type': {},
            },
            'f:provisioner': {},
            'f:reclaimPolicy': {},
            'f:volumeBindingMode': {},
          },
        },
        {
          manager: 'unknown',
          operation: 'Update',
          apiVersion: 'storage.k8s.io/v1',
          time: '2024-08-22T15:42:53Z',
          fieldsType: 'FieldsV1',
          fieldsV1: {
            'f:metadata': {
              'f:annotations': {
                '.': {},
                'f:opendatahub.io/sc-config': {},
              },
            },
          },
        },
      ],
    },
    provisioner: 'manila.csi.openstack.org',
    parameters: JSON.stringify({
      'csi.storage.k8s.io/node-publish-secret-name': 'csi-manila-secrets',
      'csi.storage.k8s.io/node-publish-secret-namespace': 'openshift-manila-csi-driver',
      'csi.storage.k8s.io/node-stage-secret-name': 'csi-manila-secrets',
      'csi.storage.k8s.io/node-stage-secret-namespace': 'openshift-manila-csi-driver',
      'csi.storage.k8s.io/provisioner-secret-name': 'csi-manila-secrets',
      'csi.storage.k8s.io/provisioner-secret-namespace': 'openshift-manila-csi-driver',
      type: 'netapp',
    }),
    reclaimPolicy: 'Delete',
    volumeBindingMode: 'Immediate',
  },
  {
    metadata: {
      name: 'standard-csi',
      uid: '5de188ae-aa8e-43d1-a714-4d60ecc5c6da',
      resourceVersion: '50902774',
      creationTimestamp: '2024-07-04T09:20:40Z',
      annotations: {
        'opendatahub.io/sc-config':
          '{"displayName":"standard-csi","isDefault":true,"isEnabled":true,"lastModified":"2024-08-22T15:42:53.101Z"}',
        'storageclass.kubernetes.io/is-default-class': 'true',
      },
      managedFields: [
        {
          manager: 'openstack-cinder-csi-driver-operator',
          operation: 'Update',
          apiVersion: 'storage.k8s.io/v1',
          time: '2024-07-04T09:20:40Z',
          fieldsType: 'FieldsV1',
          fieldsV1: {
            'f:allowVolumeExpansion': {},
            'f:metadata': {
              'f:annotations': {
                '.': {},
                'f:storageclass.kubernetes.io/is-default-class': {},
              },
            },
            'f:provisioner': {},
            'f:reclaimPolicy': {},
            'f:volumeBindingMode': {},
          },
        },
        {
          manager: 'unknown',
          operation: 'Update',
          apiVersion: 'storage.k8s.io/v1',
          time: '2024-08-22T15:42:53Z',
          fieldsType: 'FieldsV1',
          fieldsV1: {
            'f:metadata': {
              'f:annotations': {
                'f:opendatahub.io/sc-config': {},
              },
            },
          },
        },
      ],
    },
    provisioner: 'cinder.csi.openstack.org',
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: true,
    volumeBindingMode: 'WaitForFirstConsumer',
  },
];
