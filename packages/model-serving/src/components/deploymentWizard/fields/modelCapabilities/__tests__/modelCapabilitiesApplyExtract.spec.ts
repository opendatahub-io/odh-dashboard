import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { MODEL_CAPABILITIES_ANNOTATION } from '../../../../../shared/modelCapabilities';
import { applyModelCapabilities, extractModelCapabilities } from '../modelCapabilitiesApplyExtract';

const mockDeployment = (annotations?: Record<string, string>): Deployment => ({
  modelServingPlatformId: 'kserve',
  model: {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: {
      name: 'test-model',
      namespace: 'test-project',
      ...(annotations ? { annotations } : {}),
    },
  },
});

describe('applyModelCapabilities', () => {
  it('should set the model capabilities annotation as a JSON string array', () => {
    const deployment = mockDeployment();
    const result = applyModelCapabilities(deployment, ['Vision', 'Transcription']);

    expect(result.model.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION]).toBe(
      JSON.stringify(['Vision', 'Transcription']),
    );
  });

  it('should remove the annotation when field data is empty', () => {
    const deployment = mockDeployment({
      [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision']),
    });
    const result = applyModelCapabilities(deployment, []);

    expect(result.model.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION]).toBeUndefined();
  });

  it('should initialize annotations when missing', () => {
    const deployment = mockDeployment();
    const result = applyModelCapabilities(deployment, ['Vision']);

    expect(result.model.metadata.annotations).toBeDefined();
    expect(result.model.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION]).toBe(
      JSON.stringify(['Vision']),
    );
  });

  it('should not mutate the original deployment', () => {
    const deployment = mockDeployment();
    applyModelCapabilities(deployment, ['Vision']);

    expect(deployment.model.metadata.annotations).toBeUndefined();
  });
});

describe('extractModelCapabilities', () => {
  it('should return parsed capabilities from the annotation', () => {
    const deployment = mockDeployment({
      [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision', 'Custom']),
    });

    expect(extractModelCapabilities(deployment)).toEqual(['Vision', 'Custom']);
  });

  it('should return undefined when annotation is missing', () => {
    expect(extractModelCapabilities(mockDeployment())).toBeUndefined();
  });

  it('should return undefined for invalid JSON', () => {
    const deployment = mockDeployment({
      [MODEL_CAPABILITIES_ANNOTATION]: 'not-json',
    });

    expect(extractModelCapabilities(deployment)).toBeUndefined();
  });

  it('should return undefined when parsed value is not a string array', () => {
    const deployment = mockDeployment({
      [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify({ capability: 'Vision' }),
    });

    expect(extractModelCapabilities(deployment)).toBeUndefined();
  });

  it('should return undefined when array contains non-string values', () => {
    const deployment = mockDeployment({
      [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(['Vision', 123]),
    });

    expect(extractModelCapabilities(deployment)).toBeUndefined();
  });
});
