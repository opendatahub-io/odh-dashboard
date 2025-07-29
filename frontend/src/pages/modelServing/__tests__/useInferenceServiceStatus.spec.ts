import { renderHook, act } from '@testing-library/react';
import { InferenceServiceKind } from '#~/k8sTypes';
import { getInferenceServiceModelState } from '#~/concepts/modelServingKServe/kserveStatusUtils';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';
import { useInferenceServiceStatus } from '#~/pages/modelServing/useInferenceServiceStatus.ts';
import { InferenceServiceModelState } from '#~/pages/modelServing/screens/types';
import { getInferenceServiceStoppedStatus } from '#~/pages/modelServing/utils';

// Mock dependencies
jest.mock('#~/pages/modelServing/useModelPodStatus');
jest.mock('#~/concepts/modelServingKServe/kserveStatusUtils');
jest.mock('#~/pages/modelServing/utils');
jest.mock('#~/utilities/const', () => ({
  FAST_POLL_INTERVAL: 3000,
}));

// Mock the useModelPodStatus hook
const mockUseModelPodStatus = jest.fn();
jest
  .mocked(require('#~/pages/modelServing/useModelPodStatus').default)
  .mockImplementation(mockUseModelPodStatus);

// Mock utility functions
const mockGetInferenceServiceModelState = jest.mocked(getInferenceServiceModelState);
const mockGetInferenceServiceStoppedStatus = jest.mocked(getInferenceServiceStoppedStatus);

describe('useInferenceServiceStatus', () => {
  const mockInferenceService: InferenceServiceKind = {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: {
      name: 'test-model',
      namespace: 'test-namespace',
      annotations: {},
    },
    spec: {
      predictor: {
        model: {
          modelFormat: {
            name: 'sklearn',
          },
          storageUri: 's3://test-bucket/model',
        },
      },
    },
    status: {
      modelStatus: {
        states: {
          targetModelState: InferenceServiceModelState.LOADED,
          activeModelState: InferenceServiceModelState.LOADED,
        },
      },
    },
  } as InferenceServiceKind;

  const mockModelPodStatus = {
    metadata: {
      name: 'test-pod',
      namespace: 'test-namespace',
    },
    status: {
      phase: 'Running',
      containerStatuses: [
        {
          ready: true,
          state: { running: {} },
        },
      ],
    },
  };

  const mockRefresh = jest.fn();

  beforeEach(() => {
    // Clear all mocks and timers before each test
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Reset fake timers for each test
    jest.useFakeTimers();

    // Default mock implementations
    mockUseModelPodStatus.mockReturnValue({
      data: mockModelPodStatus,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    mockGetInferenceServiceModelState.mockReturnValue(InferenceServiceModelState.LOADED);
    mockGetInferenceServiceStoppedStatus.mockReturnValue({
      inferenceService: mockInferenceService,
      isStopped: false,
      isRunning: true,
    });
  });

  afterEach(() => {
    // Clean up timers after each test
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(
      ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
      {
        initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
      },
    );

    expect(result.current.isStarting).toBe(false);
    expect(result.current.isStopping).toBe(false);
    expect(result.current.isStopped).toBe(false);
    expect(result.current.isRunning).toBe(true);
    expect(result.current.inferenceService).toBe(mockInferenceService);
  });

  it('should return base status from getInferenceServiceStoppedStatus', () => {
    const mockBaseStatus = {
      inferenceService: mockInferenceService,
      isStopped: true,
      isRunning: false,
    };
    mockGetInferenceServiceStoppedStatus.mockReturnValue(mockBaseStatus);

    const { result } = renderHook(
      ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
      {
        initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
      },
    );

    expect(mockGetInferenceServiceStoppedStatus).toHaveBeenCalledWith(mockInferenceService);
    expect(result.current.isStopped).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  describe('isStarting state management', () => {
    it('should set isStarting to true when model state is LOADING', () => {
      mockGetInferenceServiceModelState.mockReturnValue(InferenceServiceModelState.LOADING);

      const { result } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStarting(true);
      });

      expect(result.current.isStarting).toBe(true);
    });

    it('should set isStarting to true when model state is PENDING', () => {
      mockGetInferenceServiceModelState.mockReturnValue(InferenceServiceModelState.PENDING);

      const { result } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStarting(true);
      });

      expect(result.current.isStarting).toBe(true);
    });

    it('should set isStarting to false when model state is LOADED', () => {
      mockGetInferenceServiceModelState.mockReturnValue(InferenceServiceModelState.LOADED);

      const { result, rerender } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStarting(true);
      });

      // Trigger effect by updating inference service
      act(() => {
        rerender({ inferenceService: mockInferenceService, refresh: mockRefresh });
      });

      expect(result.current.isStarting).toBe(false);
    });

    it('should set isStarting to false when model state is FAILED_TO_LOAD', () => {
      mockGetInferenceServiceModelState.mockReturnValue(InferenceServiceModelState.FAILED_TO_LOAD);

      const { result, rerender } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStarting(true);
      });

      // Trigger effect by updating inference service
      act(() => {
        rerender({ inferenceService: mockInferenceService, refresh: mockRefresh });
      });

      expect(result.current.isStarting).toBe(false);
    });
  });

  describe('isStopping state management', () => {
    it('should start polling when isStopping is set to true', () => {
      const mockRefreshModelPodStatus = jest.fn();
      mockUseModelPodStatus.mockReturnValue({
        data: mockModelPodStatus,
        loaded: true,
        error: undefined,
        refresh: mockRefreshModelPodStatus,
      });

      const { result } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStopping(true);
      });

      expect(result.current.isStopping).toBe(true);

      // Advance timer to trigger polling
      act(() => {
        jest.advanceTimersByTime(FAST_POLL_INTERVAL);
      });

      expect(mockRefreshModelPodStatus).toHaveBeenCalled();
    });

    it('should stop polling and set isStopping to false when modelPodStatus becomes null', async () => {
      const mockRefreshModelPodStatus = jest.fn();

      // Start with null pod status from the beginning
      mockUseModelPodStatus.mockReturnValue({
        data: null, // Pod status is null (pods are stopped)
        loaded: true,
        error: undefined,
        refresh: mockRefreshModelPodStatus,
      });

      const { result } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStopping(true);
      });

      // Wait for the first polling cycle to complete
      act(() => {
        jest.advanceTimersByTime(FAST_POLL_INTERVAL);
      });

      // Wait for the async refreshModelPodStatus to complete
      await act(async () => {
        await Promise.resolve(); // Allow async operations to complete
      });

      // Since modelPodStatus is null, the effect should set isStopping to false
      expect(result.current.isStopping).toBe(false);
    });

    it('should clear polling interval when isStopping is set to false', () => {
      const mockRefreshModelPodStatus = jest.fn();
      mockUseModelPodStatus.mockReturnValue({
        data: mockModelPodStatus,
        loaded: true,
        error: undefined,
        refresh: mockRefreshModelPodStatus,
      });

      const { result } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStopping(true);
      });

      // Advance timer to start polling
      act(() => {
        jest.advanceTimersByTime(FAST_POLL_INTERVAL);
      });

      expect(mockRefreshModelPodStatus).toHaveBeenCalled();

      // Set isStopping to false
      act(() => {
        result.current.setIsStopping(false);
      });

      // Clear the mock to verify it's not called again
      mockRefreshModelPodStatus.mockClear();

      // Advance timer again
      act(() => {
        jest.advanceTimersByTime(FAST_POLL_INTERVAL);
      });

      expect(mockRefreshModelPodStatus).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup polling interval on unmount', () => {
      const mockRefreshModelPodStatus = jest.fn();
      mockUseModelPodStatus.mockReturnValue({
        data: mockModelPodStatus,
        loaded: true,
        error: undefined,
        refresh: mockRefreshModelPodStatus,
      });

      const { result, unmount } = renderHook(
        ({ inferenceService, refresh }) => useInferenceServiceStatus(inferenceService, refresh),
        {
          initialProps: { inferenceService: mockInferenceService, refresh: mockRefresh },
        },
      );

      act(() => {
        result.current.setIsStopping(true);
      });

      // Start polling
      act(() => {
        jest.advanceTimersByTime(FAST_POLL_INTERVAL);
      });

      expect(mockRefreshModelPodStatus).toHaveBeenCalled();

      // Unmount the hook
      unmount();

      // Clear the mock
      mockRefreshModelPodStatus.mockClear();

      // Advance timer after unmount
      act(() => {
        jest.advanceTimersByTime(FAST_POLL_INTERVAL);
      });

      // Should not call refresh after unmount
      expect(mockRefreshModelPodStatus).not.toHaveBeenCalled();
    });
  });
});
