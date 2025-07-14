import {
  K8sResourceListResult,
  MetadataAnnotation,
  StorageClassConfig,
  StorageClassKind,
} from '#~/k8sTypes';

export const mockStorageClassList = (
  storageClasses: StorageClassKind[] = mockStorageClasses,
): K8sResourceListResult<StorageClassKind> => ({
  kind: 'StorageClassList',
  apiVersion: 'storage.k8s.io/v1',
  metadata: {
    resourceVersion: '55571379',
    continue: '',
  },
  items: storageClasses,
});

export const buildMockStorageClassConfig = (
  mockStorageClass: StorageClassKind,
  config: Partial<StorageClassConfig>,
): string =>
  JSON.stringify({
    ...JSON.parse(
      String(
        mockStorageClass.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig] ?? null,
      ),
    ),
    ...config,
  });

export const buildMockStorageClass = (
  mockStorageClass: StorageClassKind,
  config: Partial<StorageClassConfig> | string,
): StorageClassKind => ({
  ...mockStorageClass,
  metadata: {
    ...mockStorageClass.metadata,
    annotations: {
      ...mockStorageClass.metadata.annotations,
      [MetadataAnnotation.OdhStorageClassConfig]:
        typeof config !== 'string' ? buildMockStorageClassConfig(mockStorageClass, config) : config,
    },
  },
});

export const mockStorageClasses: StorageClassKind[] = [
  {
    apiVersion: 'storage.k8s.io/v1',
    kind: 'StorageClass',
    metadata: {
      name: 'openshift-default-sc',
      uid: '5de188ae-aa8e-43d1-a714-4d60ecc5c6da',
      resourceVersion: '50902774',
      creationTimestamp: '2024-07-04T09:20:40Z',
      annotations: {
        'opendatahub.io/sc-config': JSON.stringify({
          displayName: 'openshift-default-sc',
          accessModeSettings: {
            ReadWriteOnce: true,
            ReadWriteMany: false,
            ReadOnlyMany: false,
            ReadWriteOncePod: false,
          },
          isDefault: true,
          isEnabled: true,
          lastModified: '2024-08-22T15:42:53.101Z',
        }),
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
  {
    apiVersion: 'storage.k8s.io/v1',
    kind: 'StorageClass',
    metadata: {
      name: 'test-storage-class-1',
      uid: 'c3c05a4a-c1b7-4358-a246-da6b6dfd12cd',
      resourceVersion: '50902775',
      creationTimestamp: '2024-07-04T09:21:40Z',
      annotations: {
        'opendatahub.io/sc-config': JSON.stringify({
          displayName: 'Test SC 1',
          accessModeSettings: {
            ReadWriteOnce: true,
            ReadWriteMany: true,
            ReadOnlyMany: false,
            ReadWriteOncePod: false,
          },
          isDefault: false,
          isEnabled: false,
          lastModified: '2024-08-22T15:42:53.100Z',
        }),
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
    provisioner: 'kubernetes.io/glusterfs',
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
];
