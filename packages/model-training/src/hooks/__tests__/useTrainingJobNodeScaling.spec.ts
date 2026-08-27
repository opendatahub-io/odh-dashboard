import { renderHook } from '@testing-library/react';
import { useTrainingJobNodeScaling } from '../useTrainingJobNodeScaling';
import useClusterTrainingRuntime from '../useClusterTrainingRuntime';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';
import { TrainJobKind } from '../../k8sTypes';

jest.mock('../useClusterTrainingRuntime');

const mockUseClusterTrainingRuntime = jest.mocked(useClusterTrainingRuntime);

/** A TrainJob that inherits its node count from its runtime rather than declaring one. */
const mockTrainJobWithoutTrainer = (): TrainJobKind => {
  const job = mockTrainJobK8sResource({});
  const spec = { ...job.spec };
  delete spec.trainer;
  return { ...job, spec };
};

describe('useTrainingJobNodeScaling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseClusterTrainingRuntime.mockReturnValue({
      clusterTrainingRuntime: null,
      loaded: true,
      error: undefined,
    });
  });

  it('should return the node count from the trainer spec', () => {
    const { result } = renderHook(() =>
      useTrainingJobNodeScaling(mockTrainJobK8sResource({ numNodes: 5 })),
    );

    expect(result.current.nodesCount).toBe(5);
  });

  it('should return 0 nodes when job is undefined', () => {
    const { result } = renderHook(() => useTrainingJobNodeScaling(undefined));

    expect(result.current.nodesCount).toBe(0);
  });

  it('should fall back to the ClusterTrainingRuntime when the trainer spec is missing', () => {
    mockUseClusterTrainingRuntime.mockReturnValue({
      clusterTrainingRuntime: {
        spec: {
          mlPolicy: {
            numNodes: 7,
          },
        },
      } as never,
      loaded: true,
      error: undefined,
    });

    const { result } = renderHook(() => useTrainingJobNodeScaling(mockTrainJobWithoutTrainer()));

    expect(result.current.nodesCount).toBe(7);
  });

  it('should return 0 when the trainer spec is missing and the runtime has not loaded', () => {
    mockUseClusterTrainingRuntime.mockReturnValue({
      clusterTrainingRuntime: null,
      loaded: false,
      error: undefined,
    });

    const { result } = renderHook(() => useTrainingJobNodeScaling(mockTrainJobWithoutTrainer()));

    expect(result.current.nodesCount).toBe(0);
  });
});
