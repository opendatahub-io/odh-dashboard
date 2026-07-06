import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useTrainingJobNodeScaling } from '../useTrainingJobNodeScaling';
import { TrainingJobState } from '../../types';
import { scaleNodes } from '../../api';
import { getStatusFlags, getTrainingJobStatusSync } from '../../global/trainingJobList/utils';
import useClusterTrainingRuntime from '../useClusterTrainingRuntime';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';

// Mock dependencies
jest.mock('../../api');
jest.mock('../../global/trainingJobList/utils');
jest.mock('../useClusterTrainingRuntime');
jest.mock('@odh-dashboard/internal/utilities/useNotification');

const mockScaleNodes = jest.mocked(scaleNodes);
const mockGetStatusFlags = jest.mocked(getStatusFlags);
const mockGetTrainingJobStatusSync = jest.mocked(getTrainingJobStatusSync);
const mockUseClusterTrainingRuntime = jest.mocked(useClusterTrainingRuntime);

describe('useTrainingJobNodeScaling', () => {
  const mockJob = mockTrainJobK8sResource({});
  const mockNotification = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useNotification
    jest.requireMock('@odh-dashboard/internal/utilities/useNotification').default = jest.fn(
      () => mockNotification,
    );

    // Default mock implementations
    mockGetStatusFlags.mockReturnValue({
      isRunning: true,
      isPaused: false,
      isQueued: false,
      isPreempted: false,
      isPending: false,
      isFailed: false,
      isComplete: false,
      isInadmissible: false,
      isSuspended: false,
      isDeleting: false,
      isCreated: false,
      isRestarting: false,
      isUnknown: false,
      inProgress: true,
      canPauseResume: true,
    });

    mockGetTrainingJobStatusSync.mockReturnValue(TrainingJobState.RUNNING);

    mockUseClusterTrainingRuntime.mockReturnValue({
      clusterTrainingRuntime: null,
      loaded: true,
      error: undefined,
    });
  });

  describe('initialization', () => {
    it('should return correct initial values when job has numNodes', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: false,
        isPaused: true,
        isQueued: false,
        isPreempted: false,
        isPending: false,
        isFailed: false,
        isComplete: false,
        isInadmissible: false,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: false,
        canPauseResume: true,
      });

      const jobWithNodes = mockTrainJobK8sResource({
        numNodes: 5,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(jobWithNodes, TrainingJobState.PAUSED),
      );

      expect(result.current.nodesCount).toBe(5);
      expect(result.current.canScaleNodes).toBe(true);
      expect(result.current.isScaling).toBe(false);
      expect(result.current.scaleNodesModalOpen).toBe(false);
    });

    it('should return 0 nodes when job is undefined', () => {
      const { result } = renderHook(() => useTrainingJobNodeScaling(undefined, undefined));

      expect(result.current.nodesCount).toBe(0);
      expect(result.current.canScaleNodes).toBe(false);
    });

    it('should get nodes from ClusterTrainingRuntime when trainer spec is missing', () => {
      const jobWithoutTrainer = mockTrainJobK8sResource({});

      mockUseClusterTrainingRuntime.mockReturnValue({
        clusterTrainingRuntime: {
          spec: {
            mlPolicy: {
              numNodes: 3,
            },
          },
        } as never,
        loaded: true,
        error: undefined,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(jobWithoutTrainer, TrainingJobState.RUNNING),
      );

      expect(result.current.nodesCount).toBe(3);
    });
  });

  describe('canScaleNodes', () => {
    it('should not allow scaling when job is running', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: true,
        isPaused: false,
        isQueued: false,
        isPreempted: false,
        isPending: false,
        isFailed: false,
        isComplete: false,
        isInadmissible: false,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: true,
        canPauseResume: true,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING),
      );

      expect(result.current.canScaleNodes).toBe(false);
    });

    it('should allow scaling when job is paused and status is loaded', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: false,
        isPaused: true,
        isQueued: false,
        isPreempted: false,
        isPending: false,
        isFailed: false,
        isComplete: false,
        isInadmissible: false,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: false,
        canPauseResume: true,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.PAUSED),
      );

      expect(result.current.canScaleNodes).toBe(true);
    });

    it('should allow scaling when job is queued and status is loaded', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: false,
        isPaused: false,
        isQueued: true,
        isPreempted: false,
        isPending: false,
        isFailed: false,
        isComplete: false,
        isInadmissible: false,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: true,
        canPauseResume: false,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.QUEUED),
      );

      expect(result.current.canScaleNodes).toBe(true);
    });

    it('should allow scaling when job is inadmissible and status is loaded', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: false,
        isPaused: false,
        isQueued: false,
        isPreempted: false,
        isPending: false,
        isFailed: false,
        isComplete: false,
        isInadmissible: true,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: true,
        canPauseResume: false,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.INADMISSIBLE),
      );

      expect(result.current.canScaleNodes).toBe(true);
    });

    it('should allow scaling when job is preempted and status is loaded', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: false,
        isPaused: false,
        isQueued: false,
        isPreempted: true,
        isPending: false,
        isFailed: false,
        isComplete: false,
        isInadmissible: false,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: true,
        canPauseResume: false,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.PREEMPTED),
      );

      expect(result.current.canScaleNodes).toBe(true);
    });

    it('should not allow scaling when jobStatus is undefined', () => {
      const { result } = renderHook(() => useTrainingJobNodeScaling(mockJob, undefined));

      expect(result.current.canScaleNodes).toBe(false);
    });

    it('should not allow scaling when job is completed', () => {
      mockGetStatusFlags.mockReturnValue({
        isRunning: false,
        isPaused: false,
        isQueued: false,
        isPreempted: false,
        isPending: false,
        isFailed: false,
        isComplete: true,
        isInadmissible: false,
        isSuspended: false,
        isDeleting: false,
        isCreated: false,
        isRestarting: false,
        isUnknown: false,
        inProgress: false,
        canPauseResume: false,
      });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.SUCCEEDED),
      );

      expect(result.current.canScaleNodes).toBe(false);
    });
  });

  describe('modal state management', () => {
    it('should open modal when setScaleNodesModalOpen is called with true', () => {
      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING),
      );

      expect(result.current.scaleNodesModalOpen).toBe(false);

      act(() => {
        result.current.setScaleNodesModalOpen(true);
      });

      expect(result.current.scaleNodesModalOpen).toBe(true);
    });

    it('should close modal when setScaleNodesModalOpen is called with false', () => {
      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setScaleNodesModalOpen(true);
      });

      expect(result.current.scaleNodesModalOpen).toBe(true);

      act(() => {
        result.current.setScaleNodesModalOpen(false);
      });

      expect(result.current.scaleNodesModalOpen).toBe(false);
    });
  });

  describe('handleScaleNodes', () => {
    it('should successfully scale nodes and show success notification', async () => {
      mockScaleNodes.mockResolvedValue({ updatedJob: mockJob });

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setScaleNodesModalOpen(true);
      });

      await act(async () => {
        await result.current.handleScaleNodes(10);
      });

      await waitFor(() => {
        expect(mockScaleNodes).toHaveBeenCalledWith(mockJob, 10);
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Node scaling successful',
          'Scaled to 10 nodes',
        );
        expect(result.current.isScaling).toBe(false);
        expect(result.current.scaleNodesModalOpen).toBe(false);
      });
    });

    it('should handle scaling error and show error notification', async () => {
      const error = new Error('Scaling failed');
      mockScaleNodes.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setScaleNodesModalOpen(true);
      });

      await act(async () => {
        await result.current.handleScaleNodes(10);
      });

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Failed to scale nodes',
          'Scaling failed',
        );
        expect(result.current.isScaling).toBe(false);
        expect(result.current.scaleNodesModalOpen).toBe(false);
      });
    });

    it('should set isScaling to true during scaling operation', async () => {
      let resolveScaling: (value: { updatedJob: typeof mockJob }) => void;
      const scalingPromise = new Promise<{ updatedJob: typeof mockJob }>((resolve) => {
        resolveScaling = resolve;
      });
      mockScaleNodes.mockReturnValue(scalingPromise as never);

      const { result } = renderHook(() =>
        useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.handleScaleNodes(10);
      });

      await waitFor(() => {
        expect(result.current.isScaling).toBe(true);
      });

      await act(async () => {
        resolveScaling({ updatedJob: mockJob });
        await scalingPromise;
      });

      await waitFor(() => {
        expect(result.current.isScaling).toBe(false);
      });
    });

    it('should not call scaleNodes when job is undefined', async () => {
      const { result } = renderHook(() => useTrainingJobNodeScaling(undefined, undefined));

      await act(async () => {
        await result.current.handleScaleNodes(10);
      });

      expect(mockScaleNodes).not.toHaveBeenCalled();
    });
  });

  describe('status fallback', () => {
    it('should use getTrainingJobStatusSync when jobStatus is undefined', () => {
      mockGetTrainingJobStatusSync.mockReturnValue(TrainingJobState.RUNNING);

      renderHook(() => useTrainingJobNodeScaling(mockJob, undefined));

      expect(mockGetTrainingJobStatusSync).toHaveBeenCalledWith(mockJob);
    });

    it('should not call getTrainingJobStatusSync when jobStatus is provided', () => {
      renderHook(() => useTrainingJobNodeScaling(mockJob, TrainingJobState.RUNNING));

      expect(mockGetTrainingJobStatusSync).not.toHaveBeenCalled();
    });
  });
});
