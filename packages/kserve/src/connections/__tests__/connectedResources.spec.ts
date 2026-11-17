import type { Connection } from '@odh-dashboard/k8s-core';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { getConnectedKServeResourceLabels } from '../connectedResources';

describe('getConnectedKServeResourceLabels', () => {
  it('should return labels for InferenceServices connected to the connection', () => {
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
    const connectedService = mockInferenceServiceK8sResource({
      name: 'kserve-model',
      displayName: 'KServe model',
      secretName: 'test-connection',
    });
    const unconnectedService = mockInferenceServiceK8sResource({
      name: 'other-model',
      displayName: 'Other model',
      secretName: 'other-connection',
    });

    expect(
      getConnectedKServeResourceLabels(connection, {
        inferenceServices: [connectedService, unconnectedService],
      }),
    ).toEqual([{ key: 'kserve:kserve-model', title: 'KServe model', kind: 'connected-models' }]);
  });
});
