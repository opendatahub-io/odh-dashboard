import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { AiAssetFieldValue } from '../AiAssetEndpointCheckbox';
import {
  applyAiAssetEndpointData,
  extractAiAssetEndpointData,
} from '../aiAssetDeploymentTransformer';

// Regression test for RHOAIENG-37896: AAA checkbox feature flag gating
// These tests ensure AAA data is correctly applied to and extracted from deployments

const createMockDeployment = (
  overrides: Partial<LLMdDeployment['model']> = {},
): LLMdDeployment => ({
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'LLMInferenceService',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-namespace',
      annotations: {},
      labels: {},
    },
    spec: {
      model: {
        uri: 's3://bucket/model',
      },
    },
    ...overrides,
  },
});

describe('aiAssetDeploymentTransformer', () => {
  describe('applyAiAssetEndpointData', () => {
    it('should not add label or annotation when AAA is not enabled', () => {
      const deployment = createMockDeployment();
      const fieldData: AiAssetFieldValue = { saveAsAiAsset: false };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBeUndefined();
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBeUndefined();
    });

    it('should add genai-asset label when AAA is enabled', () => {
      const deployment = createMockDeployment();
      const fieldData: AiAssetFieldValue = { saveAsAiAsset: true };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBe('true');
    });

    it('should add use case annotation when AAA is enabled with use case', () => {
      const deployment = createMockDeployment();
      const fieldData: AiAssetFieldValue = {
        saveAsAiAsset: true,
        useCase: 'chat, multimodal',
      };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBe('true');
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBe(
        'chat, multimodal',
      );
    });

    it('should not add use case annotation when AAA is enabled but use case is empty', () => {
      const deployment = createMockDeployment();
      const fieldData: AiAssetFieldValue = {
        saveAsAiAsset: true,
        useCase: '',
      };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBe('true');
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBeUndefined();
    });

    it('should not add use case annotation when AAA is enabled but use case is whitespace', () => {
      const deployment = createMockDeployment();
      const fieldData: AiAssetFieldValue = {
        saveAsAiAsset: true,
        useCase: '   ',
      };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBe('true');
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBeUndefined();
    });

    it('should remove genai-asset label when AAA is disabled', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'opendatahub.io/genai-asset': 'true',
          },
          annotations: {
            'opendatahub.io/genai-use-case': 'chat',
          },
        },
      });
      const fieldData: AiAssetFieldValue = { saveAsAiAsset: false };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBeUndefined();
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBeUndefined();
    });

    it('should preserve other labels when AAA is enabled', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'custom-label': 'custom-value',
          },
        },
      });
      const fieldData: AiAssetFieldValue = { saveAsAiAsset: true };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['custom-label']).toBe('custom-value');
      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBe('true');
    });

    it('should preserve other annotations when AAA is enabled', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          annotations: {
            'custom-annotation': 'custom-value',
          },
        },
      });
      const fieldData: AiAssetFieldValue = {
        saveAsAiAsset: true,
        useCase: 'chat',
      };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.annotations?.['custom-annotation']).toBe('custom-value');
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBe('chat');
    });

    it('should not mutate the original deployment', () => {
      const deployment = createMockDeployment();
      const originalLabels = deployment.model.metadata.labels;
      const fieldData: AiAssetFieldValue = { saveAsAiAsset: true, useCase: 'chat' };

      applyAiAssetEndpointData(deployment, fieldData);

      expect(deployment.model.metadata.labels).toEqual(originalLabels);
      expect(deployment.model.metadata.labels?.['opendatahub.io/genai-asset']).toBeUndefined();
    });

    it('should update use case when AAA was already enabled', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'opendatahub.io/genai-asset': 'true',
          },
          annotations: {
            'opendatahub.io/genai-use-case': 'old-use-case',
          },
        },
      });
      const fieldData: AiAssetFieldValue = {
        saveAsAiAsset: true,
        useCase: 'new-use-case',
      };

      const result = applyAiAssetEndpointData(deployment, fieldData);

      expect(result.model.metadata.labels?.['opendatahub.io/genai-asset']).toBe('true');
      expect(result.model.metadata.annotations?.['opendatahub.io/genai-use-case']).toBe(
        'new-use-case',
      );
    });
  });

  describe('extractAiAssetEndpointData', () => {
    it('should return undefined when no genai-asset label exists', () => {
      const deployment = createMockDeployment();

      const result = extractAiAssetEndpointData(deployment);

      expect(result).toBeUndefined();
    });

    it('should return undefined when genai-asset label is false', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'opendatahub.io/genai-asset': 'false',
          },
        },
      });

      const result = extractAiAssetEndpointData(deployment);

      expect(result).toBeUndefined();
    });

    it('should return saveAsAiAsset: true when genai-asset label is true', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'opendatahub.io/genai-asset': 'true',
          },
        },
      });

      const result = extractAiAssetEndpointData(deployment);

      expect(result).toEqual({ saveAsAiAsset: true, useCase: '' });
    });

    it('should extract use case when present', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'opendatahub.io/genai-asset': 'true',
          },
          annotations: {
            'opendatahub.io/genai-use-case': 'chat, multimodal',
          },
        },
      });

      const result = extractAiAssetEndpointData(deployment);

      expect(result).toEqual({
        saveAsAiAsset: true,
        useCase: 'chat, multimodal',
      });
    });

    it('should return empty use case when annotation is missing', () => {
      const deployment = createMockDeployment({
        metadata: {
          name: 'test',
          namespace: 'test',
          labels: {
            'opendatahub.io/genai-asset': 'true',
          },
        },
      });

      const result = extractAiAssetEndpointData(deployment);

      expect(result).toEqual({ saveAsAiAsset: true, useCase: '' });
    });
  });
});
