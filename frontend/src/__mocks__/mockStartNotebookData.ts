import { ImageStreamKind } from '~/k8sTypes';
import {
  ConfigMapCategory,
  DataConnectionData,
  EnvironmentVariableType,
  EnvVariable,
  SecretCategory,
  StartNotebookData,
  StorageData,
  StorageType,
} from '~/pages/projects/types';
import { mockK8sNameDescriptionFieldData } from '~/__mocks__/mockK8sNameDescriptionFieldData';

type MockResourceConfigType = {
  volumeName?: string;
  notebookId?: string;
};
export const mockStartNotebookData = ({
  notebookId,
  volumeName = 'test-volume',
}: MockResourceConfigType): StartNotebookData => ({
  projectName: 'test-project',
  notebookData: mockK8sNameDescriptionFieldData({
    name: 'test-notebook',
    description: '',
    k8sName: { value: notebookId },
  }),
  image: {
    imageStream: {
      metadata: {
        name: 'sample-image-stream',
      },
      status: {
        dockerImageRepository: 'docker.io/sample-repo',
      },
    } as ImageStreamKind,
    imageVersion: {
      name: 'v1.0.0',
    },
  },
  notebookSize: {
    name: 'small',
    resources: {
      requests: {
        memory: '2Gi',
        cpu: '500m',
      },
      limits: {
        memory: '2Gi',
        cpu: '500m',
      },
    },
  },
  initialAcceleratorProfile: {
    acceleratorProfile: undefined,
    acceleratorProfiles: [],
    count: 0,
    unknownProfileDetected: false,
  },
  selectedAcceleratorProfile: {
    profile: undefined,
    count: 0,
    useExistingSettings: false,
  },
  volumes: [
    {
      name: volumeName,
      persistentVolumeClaim: {
        claimName: volumeName,
      },
    },
  ],
  volumeMounts: [
    {
      mountPath: '/opt/app-root/src/data',
      name: volumeName,
    },
  ],
  existingTolerations: [
    {
      key: 'key1',
      value: 'value1',
    },
  ],
  existingResources: {
    limits: {
      cpu: '1',
      memory: '1Gi',
    },
    requests: {
      cpu: '500m',
      memory: '512Mi',
    },
  },
});

export const mockStorageData: StorageData[] = [
  {
    storageType: StorageType.NEW_PVC,
    name: 'test-pvc',
    description: '',
    size: '20Gi',
    storageClassName: 'gp2-csi',
  },
];

export const mockDataConnectionData: DataConnectionData = {
  type: 'creating',
  enabled: true,
  creating: {
    type: EnvironmentVariableType.SECRET,
    values: {
      category: SecretCategory.AWS,
      data: [
        {
          key: 'Name',
          value: 'test-name',
        },
        {
          key: 'AWS_ACCESS_KEY_ID',
          value: 'test-access-key',
        },
        {
          key: 'AWS_SECRET_ACCESS_KEY',
          value: 'test-secret-key',
        },
        {
          key: 'AWS_S3_BUCKET',
          value: '',
        },
        {
          key: 'AWS_S3_ENDPOINT',
          value: 'test-endpoint',
        },
        {
          key: 'AWS_DEFAULT_REGION',
          value: '',
        },
      ],
    },
  },
};

export const mockEnvVariables: EnvVariable[] = [
  {
    type: EnvironmentVariableType.CONFIG_MAP,
    values: {
      category: ConfigMapCategory.GENERIC,
      data: [
        {
          key: 'test-key',
          value: 'test-value',
        },
      ],
    },
  },
  {
    type: EnvironmentVariableType.SECRET,
    values: {
      category: SecretCategory.GENERIC,
      data: [
        {
          key: 'test-key',
          value: 'test-value',
        },
      ],
    },
  },
];
