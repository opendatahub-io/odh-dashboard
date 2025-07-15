import {
  ConfigMapKind,
  InferenceServiceKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
  TemplateKind,
} from '#~/k8sTypes';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '#~/types';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockConfigMap } from './mockConfigMap';
import { mockServingRuntimeK8sResource } from './mockServingRuntimeK8sResource';
import { mockInferenceServiceK8sResource } from './mockInferenceServiceK8sResource';
import { mockServingRuntimeTemplateK8sResource } from './mockServingRuntimeTemplateK8sResource';
import { mockSecretK8sResource } from './mockSecretK8sResource';
import { mockPVCK8sResource } from './mockPVCK8sResource';

export type NimServingResponse = {
  body: {
    body: ConfigMapKind | SecretKind;
  };
};

export const mockNimImages = (): ConfigMapKind =>
  mockConfigMap({
    name: 'mock-nvidia-nim-images-data',
    namespace: 'opendatahub',
    data: {
      alphafold2: JSON.stringify({
        name: 'alphafold2',
        displayName: 'AlphaFold2',
        shortDescription:
          'A widely used model for predicting the 3D structures of proteins from their amino acid sequences.',
        namespace: 'nim/deepmind',
        tags: ['1.0.0'],
        latestTag: '1.0.0',
        updatedDate: '2024-08-27T01:51:55.642Z',
      }),
      'arctic-embed-l': JSON.stringify({
        name: 'arctic-embed-l',
        displayName: 'Snowflake Arctic Embed Large Embedding',
        shortDescription:
          'NVIDIA NIM for GPU accelerated Snowflake Arctic Embed Large Embedding inference',
        namespace: 'nim/snowflake',
        tags: ['1.0.1', '1.0.0'],
        latestTag: '1.0.1',
        updatedDate: '2024-07-27T00:38:40.927Z',
      }),
    },
  });

type NimInferenceService = {
  namespace?: string;
  displayName?: string;
};

export const mockNimInferenceService = ({
  displayName = 'Test Name',
  namespace = 'test-project',
}: NimInferenceService = {}): InferenceServiceKind => {
  const inferenceService = mockInferenceServiceK8sResource({
    name: 'test-name',
    modelName: 'test-name',
    displayName,
    namespace,
    kserveInternalLabel: true,
    resources: {
      limits: { cpu: '16', memory: '64Gi' },
      requests: { cpu: '8', memory: '32Gi' },
    },
  });

  delete inferenceService.metadata.labels?.name;
  delete inferenceService.metadata.creationTimestamp;
  delete inferenceService.metadata.generation;
  delete inferenceService.metadata.resourceVersion;
  delete inferenceService.metadata.uid;
  if (inferenceService.spec.predictor.model?.modelFormat) {
    inferenceService.spec.predictor.model.modelFormat.name = 'arctic-embed-l';
  }
  delete inferenceService.spec.predictor.model?.modelFormat?.version;
  delete inferenceService.spec.predictor.model?.storage;
  delete inferenceService.spec.predictor.imagePullSecrets;
  delete inferenceService.status;

  return inferenceService;
};

export const mockNimServingRuntime = (): ServingRuntimeKind => {
  const servingRuntime = mockServingRuntimeK8sResource({
    name: 'test-name',
    displayName: 'Test Name',
  });
  if (servingRuntime.metadata.annotations) {
    servingRuntime.metadata.annotations['opendatahub.io/template-display-name'] = 'NVIDIA NIM';
    servingRuntime.metadata.annotations['opendatahub.io/template-name'] = 'nvidia-nim-runtime';
  }

  return servingRuntime;
};

export const mockNimServingRuntimeTemplate = (): TemplateKind => {
  const templateMock = mockServingRuntimeTemplateK8sResource({
    name: 'mock-nvidia-nim-serving-template',
    displayName: 'NVIDIA NIM',
    platforms: [ServingRuntimePlatform.SINGLE],
    apiProtocol: ServingRuntimeAPIProtocol.REST,
    namespace: 'opendatahub',
  });
  if (templateMock.metadata.annotations != null) {
    templateMock.metadata.annotations['opendatahub.io/dashboard'] = 'true';
  }

  return templateMock;
};

export const mockNvidiaNimAccessSecret = (): SecretKind => {
  const secret = mockSecretK8sResource({
    name: 'mock-nvidia-nim-access',
  });
  delete secret.data;
  secret.data = {};
  secret.data.api_key = 'api-key'; // eslint-disable-line camelcase
  secret.data.configMapName = 'bnZpZGlhLW5pbS12YWxpZGF0aW9uLXJlc3VsdA==';

  return secret;
};

export const mockNvidiaNimImagePullSecret = (): SecretKind => {
  const secret = mockSecretK8sResource({
    name: 'mock-nvidia-nim-image-pull',
  });
  delete secret.data;
  secret.data = {};
  secret.data['.dockerconfigjson'] = 'ZG9ja2VyY29uZmlnCg==';

  return secret;
};

type NimProjectType = {
  hasAllModels?: boolean;
  k8sName?: string;
  displayName?: string;
  enableNIM?: boolean;
};

export const mockNimProject = ({
  hasAllModels,
  k8sName,
  displayName,
  enableNIM,
}: NimProjectType): ProjectKind => {
  const project = mockProjectK8sResource({
    hasAnnotations: true,
    enableModelMesh: hasAllModels ? undefined : false,
    k8sName,
    displayName,
    enableNIM,
  });
  if (project.metadata.annotations != null) {
    project.metadata.annotations['opendatahub.io/nim-support'] = 'true';
  }
  return project;
};

export const mockNimModelPVC = (): PersistentVolumeClaimKind => {
  const pvc = mockPVCK8sResource({
    name: 'nim-pvc',
  });
  return pvc;
};

export const mockNimServingResource = (
  resource: ConfigMapKind | SecretKind,
): NimServingResponse => ({ body: { body: resource } });

// Mock PVC that contains a specific model
type MockNimPVCOptions = {
  name?: string;
  namespace?: string;
  modelName?: string;
  servingRuntimeName?: string;
  size?: string;
  storageClassName?: string;
  createdDaysAgo?: number;
};

export const mockNimModelPVCWithModel = ({
  name = 'nim-pvc-arctic-embed-l',
  namespace = 'test-project',
  modelName = 'arctic-embed-l',
  servingRuntimeName = 'test-serving-runtime',
  size = '50Gi',
  storageClassName = 'fast-ssd',
  createdDaysAgo = 2,
}: MockNimPVCOptions = {}): PersistentVolumeClaimKind => {
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - createdDaysAgo);

  const pvc = mockPVCK8sResource({
    name,
    namespace,
    storageClassName,
  });

  // Add annotations that indicate this PVC contains a specific model
  if (!pvc.metadata.annotations) {
    pvc.metadata.annotations = {};
  }
  pvc.metadata.annotations['nim.nvidia.com/model-name'] = modelName;
  pvc.metadata.annotations['nim.nvidia.com/serving-runtime'] = servingRuntimeName;
  pvc.metadata.annotations['openshift.io/description'] = `NIM PVC containing ${modelName} model`;

  // Set creation timestamp and storage size manually
  pvc.metadata.creationTimestamp = createdDate.toISOString();

  // Set the size in spec and status
  pvc.spec.resources.requests = { storage: size };
  if (pvc.status) {
    pvc.status.capacity = { storage: size };
  }

  return pvc;
};

// Mock ServingRuntime that uses a specific PVC
type MockNimServingRuntimeWithPVCOptions = {
  name?: string;
  namespace?: string;
  displayName?: string;
  pvcName?: string;
  modelName?: string;
  createdDaysAgo?: number;
};

export const mockNimServingRuntimeWithPVC = ({
  name = 'test-serving-runtime',
  namespace = 'test-project',
  displayName = 'Test Serving Runtime',
  pvcName = 'nim-pvc-arctic-embed-l',
  modelName = 'arctic-embed-l',
  createdDaysAgo = 2,
}: MockNimServingRuntimeWithPVCOptions = {}): ServingRuntimeKind => {
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - createdDaysAgo);

  const servingRuntime = mockServingRuntimeK8sResource({
    name,
    displayName,
    namespace,
  });

  // Add NIM-specific annotations
  if (!servingRuntime.metadata.annotations) {
    servingRuntime.metadata.annotations = {};
  }
  servingRuntime.metadata.annotations['opendatahub.io/template-display-name'] = 'NVIDIA NIM';
  servingRuntime.metadata.annotations['opendatahub.io/template-name'] = 'nvidia-nim-runtime';

  // Set creation timestamp
  servingRuntime.metadata.creationTimestamp = createdDate.toISOString();

  // Add PVC volume configuration - this is key for PVC discovery
  servingRuntime.spec.volumes = [
    {
      name: 'model-storage',
      persistentVolumeClaim: {
        claimName: pvcName,
      },
    },
  ];

  // Add volume mount to container
  if (!servingRuntime.spec.containers[0].volumeMounts) {
    servingRuntime.spec.containers[0].volumeMounts = [];
  }
  servingRuntime.spec.containers[0].volumeMounts.push({
    name: 'model-storage',
    mountPath: '/mnt/models/cache',
  });

  // Set supported model format to match the model - use the passed modelName
  servingRuntime.spec.supportedModelFormats = [
    {
      name: modelName, // Use the modelName parameter directly
      version: '1',
      autoSelect: true,
    },
  ];

  // Set NIM container image to include the model name
  servingRuntime.spec.containers[0].image = `nvcr.io/nim/snowflake/${modelName}:1.0.1`;

  return servingRuntime;
};

// Mock multiple PVCs for testing selection scenarios
export const mockMultipleNimPVCs = (): PersistentVolumeClaimKind[] => [
  // Recent PVC with arctic-embed-l
  mockNimModelPVCWithModel({
    name: 'nim-pvc-arctic-recent',
    modelName: 'arctic-embed-l',
    servingRuntimeName: 'arctic-runtime-1',
    createdDaysAgo: 1,
    size: '30Gi',
  }),
  // Older PVC with arctic-embed-l
  mockNimModelPVCWithModel({
    name: 'nim-pvc-arctic-old',
    modelName: 'arctic-embed-l',
    servingRuntimeName: 'arctic-runtime-2',
    createdDaysAgo: 5,
    size: '40Gi',
  }),
  // PVC with different model (should not show up when arctic is selected)
  mockNimModelPVCWithModel({
    name: 'nim-pvc-alphafold',
    modelName: 'alphafold2',
    servingRuntimeName: 'alphafold-runtime',
    createdDaysAgo: 3,
    size: '60Gi',
  }),
];

// Mock multiple ServingRuntimes that use different PVCs
export const mockMultipleNimServingRuntimes = (): ServingRuntimeKind[] => [
  // ServingRuntime using first PVC
  mockNimServingRuntimeWithPVC({
    name: 'arctic-runtime-1',
    displayName: 'Arctic Runtime 1',
    pvcName: 'nim-pvc-arctic-recent',
    modelName: 'arctic-embed-l',
    createdDaysAgo: 1,
  }),
  // ServingRuntime using second PVC
  mockNimServingRuntimeWithPVC({
    name: 'arctic-runtime-2',
    displayName: 'Arctic Runtime 2',
    pvcName: 'nim-pvc-arctic-old',
    modelName: 'arctic-embed-l',
    createdDaysAgo: 5,
  }),
  // ServingRuntime using different model PVC
  mockNimServingRuntimeWithPVC({
    name: 'alphafold-runtime',
    displayName: 'AlphaFold Runtime',
    pvcName: 'nim-pvc-alphafold',
    modelName: 'alphafold2',
    createdDaysAgo: 3,
  }),
];
