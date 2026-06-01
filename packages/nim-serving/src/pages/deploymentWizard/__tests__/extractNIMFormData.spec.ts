import { ModelLocationType } from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import type { NIMDeployment } from '../../../api/nimservices/types';
import { NIM_ID } from '../../../../extensions';
import {
  extractNIMHardwareProfileConfig,
  extractNIMReplicas,
  extractNIMEnvironmentVariables,
  extractNIMModelLocationData,
  extractNIMModelType,
  extractNIMRuntimeArgs,
  extractNIMModelAvailabilityData,
  extractNIMModelServerTemplate,
} from '../extractNIMFormData';

jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/utils', () => ({
  getExistingHardwareProfileData: jest.fn((resource) => ({
    name: resource?.metadata?.labels?.['opendatahub.io/hardware-profile-name'],
    namespace: resource?.metadata?.labels?.['opendatahub.io/hardware-profile-namespace'],
  })),
  getExistingResources: jest.fn((resource) => ({
    existingContainerResources: resource?.spec?.resources,
    existingTolerations: resource?.spec?.tolerations,
    existingNodeSelector: resource?.spec?.nodeSelector,
  })),
}));

jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/const', () => ({
  MODEL_SERVING_VISIBILITY: ['modelServing'],
}));

const makeDeployment = (
  specOverrides?: Partial<NIMDeployment['model']['spec']>,
  metadataOverrides?: Partial<NIMDeployment['model']['metadata']>,
): NIMDeployment => ({
  modelServingPlatformId: NIM_ID,
  model: {
    apiVersion: 'apps.nvidia.com/v1alpha1',
    kind: 'NIMService',
    metadata: { name: 'test-nim', namespace: 'test-ns', ...metadataOverrides },
    spec: {
      image: { repository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct', tag: '1.8' },
      ...specOverrides,
    },
  },
});

describe('extractNIMHardwareProfileConfig', () => {
  it('should extract hardware profile config from deployment', () => {
    const deployment = makeDeployment({
      resources: { limits: { cpu: '4', memory: '8Gi' }, requests: { cpu: '2', memory: '4Gi' } },
      tolerations: [{ key: 'nvidia.com/gpu', operator: 'Exists', effect: 'NoSchedule' }],
      nodeSelector: { 'nvidia.com/gpu.present': 'true' },
    });

    const result = extractNIMHardwareProfileConfig(deployment);

    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();

    const { data } = result;
    expect(data).not.toBeNull();
    if (!data) {
      return;
    }
    const [, existingResources, existingTolerations, existingNodeSelector] = data;
    expect(existingResources).toEqual({
      limits: { cpu: '4', memory: '8Gi' },
      requests: { cpu: '2', memory: '4Gi' },
    });
    expect(existingTolerations).toEqual([
      { key: 'nvidia.com/gpu', operator: 'Exists', effect: 'NoSchedule' },
    ]);
    expect(existingNodeSelector).toEqual({ 'nvidia.com/gpu.present': 'true' });
  });

  it('should use deployment namespace', () => {
    const deployment = makeDeployment();
    const result = extractNIMHardwareProfileConfig(deployment);
    expect(result.data).not.toBeNull();
    expect(result.data?.[5]).toBe('test-ns');
  });
});

describe('extractNIMReplicas', () => {
  it('should extract replicas from deployment', () => {
    const deployment = makeDeployment({ replicas: 3 });
    const result = extractNIMReplicas(deployment);
    expect(result).toEqual({ data: 3 });
  });

  it('should return null when replicas not set', () => {
    const deployment = makeDeployment();
    const result = extractNIMReplicas(deployment);
    expect(result).toEqual({ data: null });
  });
});

describe('extractNIMEnvironmentVariables', () => {
  it('should extract env vars from deployment', () => {
    const deployment = makeDeployment({
      env: [
        { name: 'NIM_LOG_LEVEL', value: 'DEBUG' },
        { name: 'CUDA_VISIBLE_DEVICES', value: '0,1' },
      ],
    });

    const result = extractNIMEnvironmentVariables(deployment);
    expect(result).toEqual({
      enabled: true,
      variables: [
        { name: 'NIM_LOG_LEVEL', value: 'DEBUG' },
        { name: 'CUDA_VISIBLE_DEVICES', value: '0,1' },
      ],
    });
  });

  it('should return null when no env vars', () => {
    const deployment = makeDeployment();
    expect(extractNIMEnvironmentVariables(deployment)).toBeNull();
  });

  it('should return null for empty env array', () => {
    const deployment = makeDeployment({ env: [] });
    expect(extractNIMEnvironmentVariables(deployment)).toBeNull();
  });

  it('should default missing values to empty string', () => {
    const deployment = makeDeployment({
      env: [{ name: 'KEY' }],
    });
    const result = extractNIMEnvironmentVariables(deployment);
    expect(result?.variables[0].value).toBe('');
  });
});

describe('extractNIMModelLocationData', () => {
  it('should return NIM model location type', () => {
    const result = extractNIMModelLocationData();
    expect(result).toEqual({
      type: ModelLocationType.NIM,
      fieldValues: {},
      additionalFields: {},
    });
  });
});

describe('extractNIMModelType', () => {
  it('should extract model type from annotation', () => {
    const deployment = makeDeployment(undefined, {
      annotations: {
        'opendatahub.io/model-type': 'generative_ai',
      },
    });
    const result = extractNIMModelType(deployment);
    expect(result).toEqual({ type: 'generative_ai', legacyVLLM: false });
  });

  it('should return null when no model type annotation', () => {
    const deployment = makeDeployment();
    expect(extractNIMModelType(deployment)).toBeNull();
  });
});

describe('null extractors', () => {
  it('extractNIMRuntimeArgs should return null', () => {
    expect(extractNIMRuntimeArgs()).toBeNull();
  });

  it('extractNIMModelAvailabilityData should return null', () => {
    expect(extractNIMModelAvailabilityData()).toBeNull();
  });

  it('extractNIMModelServerTemplate should return null', () => {
    expect(extractNIMModelServerTemplate()).toBeNull();
  });
});
