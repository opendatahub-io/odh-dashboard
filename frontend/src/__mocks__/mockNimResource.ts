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
