import { MetadataAnnotation, type Connection } from '@odh-dashboard/k8s-core';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { getConnectedResourceLabels } from '../connectedResources';

describe('getConnectedResourceLabels', () => {
  it('should return labels for LLMInferenceServices connected to the connection', () => {
    const connection: Connection = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'test-connection',
        namespace: 'test-project',
        labels: { 'opendatahub.io/dashboard': 'true' },
        annotations: {},
      },
      type: 'Opaque',
    };
    const connectedService = mockLLMInferenceServiceK8sResource({
      name: 'llmd-model',
      displayName: 'LLM-D model',
      additionalAnnotations: {
        [MetadataAnnotation.ConnectionName]: 'test-connection',
      },
    });
    const connectedServiceWithoutModel = mockLLMInferenceServiceK8sResource({
      name: 'llmd-without-model',
      displayName: 'LLM-D service without a model spec',
      additionalAnnotations: {
        [MetadataAnnotation.ConnectionName]: 'test-connection',
      },
    });
    delete connectedServiceWithoutModel.spec.model;
    const unconnectedService = mockLLMInferenceServiceK8sResource({
      name: 'other-llmd-model',
      displayName: 'Other LLM-D model',
      additionalAnnotations: {
        [MetadataAnnotation.ConnectionName]: 'other-connection',
      },
    });

    expect(
      getConnectedResourceLabels(connection, {
        llmInferenceServices: [connectedService, connectedServiceWithoutModel, unconnectedService],
      }),
    ).toEqual([
      { key: 'llmd:llmd-model', title: 'LLM-D model', kind: 'connected-models' },
      {
        key: 'llmd:llmd-without-model',
        title: 'LLM-D service without a model spec',
        kind: 'connected-models',
      },
    ]);
  });
});
