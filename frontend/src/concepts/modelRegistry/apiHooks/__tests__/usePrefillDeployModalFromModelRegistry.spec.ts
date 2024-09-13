import { renderHook } from '@testing-library/react';
import usePrefillDeployModalFromModelRegistry from '~/pages/modelRegistry/screens/RegisteredModels/usePrefillDeployModalFromModelRegistry';
import { ProjectKind } from '~/k8sTypes';
import { RegisteredModelDeployInfo } from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
import { mockInferenceServiceModalData } from '~/__mocks__/mockInferenceServiceModalData';
import { DataConnection } from '~/pages/projects/types';

describe('usePrefillDeployModalFromModelRegistry', () => {
  const mockProjectContext = {
    currentProject: {
      apiVersion: 'v1',
      kind: 'Project',
      metadata: {
        name: 'test-project',
        namespace: 'test-namespace',
      },
    } as ProjectKind,
    dataConnections: [] as DataConnection[],
  };

  const data = mockInferenceServiceModalData({});

  const mockSetCreateData = jest.fn();

  const mockRegisteredModelDeployInfo: RegisteredModelDeployInfo = {
    modelName: 'test-model',
    modelArtifactUri: 's3://bucket/path',
    modelArtifactStorageKey: 'test-key',
  };

  it('should ensure awsData array never has more than one element per key', () => {
    renderHook(() =>
      usePrefillDeployModalFromModelRegistry(
        mockProjectContext,
        data,
        mockSetCreateData,
        mockRegisteredModelDeployInfo,
      ),
    );

    const { awsData } = mockSetCreateData.mock.calls.find(([key]) => key === 'storage')[1];

    const keys = awsData.map((item: { key: string }) => item.key);
    const uniqueKeys = new Set(keys);

    expect(keys.length).toBe(uniqueKeys.size);
  });
});
