import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import {
  getConnectedKServeResourceLabels,
  useConnectedKServeResources,
} from '../connectedResources';
import * as watchModule from '../../api/watch';

jest.mock('../../api/watch');

const mockUseWatchInferenceServices = watchModule.useWatchInferenceServices as jest.Mock;
const mockUseWatchServingRuntimes = watchModule.useWatchServingRuntimes as jest.Mock;

const runtimeWithClaims = (name: string, claimNames: string[]): ServingRuntimeKind => {
  const servingRuntime = mockServingRuntimeK8sResource({ name });
  return {
    ...servingRuntime,
    spec: {
      ...servingRuntime.spec,
      volumes: claimNames.map((claimName) => ({
        name: claimName,
        persistentVolumeClaim: { claimName },
      })),
    },
  };
};

describe('getConnectedKServeResourceLabels', () => {
  it('should label each inference service whose serving runtime mounts the PVC, using the inference service display name', () => {
    const pvc = mockPVCK8sResource({ name: 'my-pvc' });
    const servingRuntimes = [
      runtimeWithClaims('sr-match', ['my-pvc']),
      runtimeWithClaims('sr-other', ['different-pvc']),
    ];
    const inferenceServices = [
      mockInferenceServiceK8sResource({
        name: 'is-match',
        displayName: 'My NIM Model',
        runtimeName: 'sr-match',
      }),
      mockInferenceServiceK8sResource({
        name: 'is-other',
        displayName: 'Other Model',
        runtimeName: 'sr-other',
      }),
    ];

    const labels = getConnectedKServeResourceLabels(pvc, { inferenceServices, servingRuntimes });
    // Only the inference service whose runtime mounts the PVC, labeled with the inference service
    // display name (not the serving runtime name).
    expect(labels).toEqual([{ key: 'is-match', title: 'My NIM Model', kind: 'connected-models' }]);
  });

  it('should exclude an inference service whose runtime has no matching serving runtime', () => {
    const pvc = mockPVCK8sResource({ name: 'my-pvc' });
    const inferenceServices = [
      mockInferenceServiceK8sResource({ name: 'is-orphan', runtimeName: 'missing-sr' }),
    ];

    expect(
      getConnectedKServeResourceLabels(pvc, { inferenceServices, servingRuntimes: [] }),
    ).toHaveLength(0);
  });

  it('should return an empty array when no serving runtime references the PVC', () => {
    const pvc = mockPVCK8sResource({ name: 'lonely-pvc' });
    const servingRuntimes = [runtimeWithClaims('sr-a', ['other']), runtimeWithClaims('sr-b', [])];
    const inferenceServices = [
      mockInferenceServiceK8sResource({ name: 'is-a', runtimeName: 'sr-a' }),
      mockInferenceServiceK8sResource({ name: 'is-b', runtimeName: 'sr-b' }),
    ];

    expect(
      getConnectedKServeResourceLabels(pvc, { inferenceServices, servingRuntimes }),
    ).toHaveLength(0);
  });
});

describe('useConnectedKServeResources', () => {
  const project = mockProjectK8sResource({ k8sName: 'test-project' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not be loaded while both lists are still loading', () => {
    mockUseWatchInferenceServices.mockReturnValue([[], false, undefined]);
    mockUseWatchServingRuntimes.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useConnectedKServeResources)(project);
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should be loaded once inference services load empty, without waiting on serving runtimes', () => {
    mockUseWatchInferenceServices.mockReturnValue([[], true, undefined]);
    mockUseWatchServingRuntimes.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useConnectedKServeResources)(project);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should wait on serving runtimes when inference services are present', () => {
    mockUseWatchInferenceServices.mockReturnValue([
      [mockInferenceServiceK8sResource({ name: 'is-1', runtimeName: 'sr-1' })],
      true,
      undefined,
    ]);
    mockUseWatchServingRuntimes.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useConnectedKServeResources)(project);
    expect(renderResult.result.current.loaded).toBe(false);

    mockUseWatchServingRuntimes.mockReturnValue([[], true, undefined]);
    renderResult.rerender(project);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should be loaded when the inference services watch errors', () => {
    mockUseWatchInferenceServices.mockReturnValue([[], false, new Error('boom')]);
    mockUseWatchServingRuntimes.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useConnectedKServeResources)(project);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should be loaded when the serving runtimes watch errors, even with inference services present', () => {
    mockUseWatchInferenceServices.mockReturnValue([
      [mockInferenceServiceK8sResource({ name: 'is-1', runtimeName: 'sr-1' })],
      true,
      undefined,
    ]);
    mockUseWatchServingRuntimes.mockReturnValue([[], false, new Error('boom')]);

    const renderResult = testHook(useConnectedKServeResources)(project);
    expect(renderResult.result.current.loaded).toBe(true);
  });
});
