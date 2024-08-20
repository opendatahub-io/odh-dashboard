import { ImageStreamKind } from '~/k8sTypes';
import { StartNotebookData } from '~/pages/projects/types';

type MockResourceConfigType = {
  volumeName?: string;
};
export const mockStartNotebookData = ({
  volumeName = 'test-volume',
}: MockResourceConfigType): StartNotebookData => ({
  projectName: 'test-project',
  notebookName: 'test-notebook',
  description: '',
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
