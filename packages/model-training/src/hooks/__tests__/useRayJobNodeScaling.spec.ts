import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';
import { useRayJobNodeScaling } from '../useRayJobNodeScaling';
import { updateRayJobNumNodes } from '../../api';
import { mockRayJobK8sResource } from '../../__mocks__/mockRayJobK8sResource';
import { RayJobDeploymentStatus, RayJobStatusValue, TrainingJobState } from '../../types';

jest.mock('../../api');
jest.mock('@odh-dashboard/internal/utilities/useNotification');
jest.mock('@odh-dashboard/internal/api/useAccessReview');

const mockUpdateRayJobNumNodes = jest.mocked(updateRayJobNumNodes);
const mockUseAccessReview = jest.mocked(useAccessReview);

describe('useRayJobNodeScaling', () => {
  const mockNotification = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const jobWithWorkerGroups = mockRayJobK8sResource({
    name: 'test-ray-job',
    namespace: 'test-namespace',
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    workerGroupSpecs: [
      { groupName: 'cpu-workers', replicas: 2, template: {} },
      { groupName: 'gpu-workers', replicas: 1, template: {} },
    ],
  });

  const workspaceJob = mockRayJobK8sResource({
    name: 'workspace-job',
    namespace: 'test-namespace',
    clusterSelector: { 'ray.io/cluster': 'shared-cluster' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock('@odh-dashboard/internal/utilities/useNotification').default = jest.fn(
      () => mockNotification,
    );
    mockUpdateRayJobNumNodes.mockResolvedValue(jobWithWorkerGroups);
    mockUseAccessReview.mockReturnValue([true, true]);
  });

  describe('initialization', () => {
    it('should initialize workerGroupReplicas from job spec', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      expect(result.current.workerGroupReplicas).toEqual([
        { groupName: 'cpu-workers', replicas: 2 },
        { groupName: 'gpu-workers', replicas: 1 },
      ]);
    });

    it('should return empty workerGroupReplicas when job is undefined', () => {
      const { result } = renderHook(() => useRayJobNodeScaling(undefined, undefined));

      expect(result.current.workerGroupReplicas).toEqual([]);
    });

    it('should return empty workerGroupReplicas for workspace-cluster job', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(workspaceJob, TrainingJobState.RUNNING),
      );

      expect(result.current.workerGroupReplicas).toEqual([]);
    });

    it('should initialize modalOpen as false', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      expect(result.current.modalOpen).toBe(false);
    });

    it('should initialize isScaling as false', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      expect(result.current.isScaling).toBe(false);
    });
  });

  describe('canEditNodes', () => {
    it('should be true for a lifecycle RayJob with a known jobStatus', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      expect(result.current.canEditNodes).toBe(true);
    });

    it('should be false for a workspace-cluster job (no inline rayClusterSpec)', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(workspaceJob, TrainingJobState.RUNNING),
      );

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be false when jobStatus is undefined (status still loading)', () => {
      const { result } = renderHook(() => useRayJobNodeScaling(jobWithWorkerGroups, undefined));

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be false when job is undefined', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(undefined, TrainingJobState.RUNNING),
      );

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be false when user lacks patch permission on RayJob', () => {
      mockUseAccessReview.mockReturnValue([false, true]);

      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be false when the job has SUCCEEDED (terminal state)', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.SUCCEEDED),
      );

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be false when the job has FAILED (terminal state)', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.FAILED),
      );

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be false when the job is DELETING', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.DELETING),
      );

      expect(result.current.canEditNodes).toBe(false);
    });

    it('should be true for a SUSPENDED (non-terminal) job', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.SUSPENDED),
      );

      expect(result.current.canEditNodes).toBe(true);
    });

    it('should be true for a QUEUED (non-terminal) job', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.QUEUED),
      );

      expect(result.current.canEditNodes).toBe(true);
    });
  });

  describe('hasChanges', () => {
    it('should be false initially (no changes made)', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      expect(result.current.hasChanges).toBe(false);
    });

    it('should be true after a replica count is changed', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setWorkerGroupReplicas([
          { groupName: 'cpu-workers', replicas: 5 },
          { groupName: 'gpu-workers', replicas: 1 },
        ]);
      });

      expect(result.current.hasChanges).toBe(true);
    });

    it('should be false after reverting to original values', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setWorkerGroupReplicas([
          { groupName: 'cpu-workers', replicas: 99 },
          { groupName: 'gpu-workers', replicas: 1 },
        ]);
      });

      expect(result.current.hasChanges).toBe(true);

      act(() => {
        result.current.setWorkerGroupReplicas([
          { groupName: 'cpu-workers', replicas: 2 },
          { groupName: 'gpu-workers', replicas: 1 },
        ]);
      });

      expect(result.current.hasChanges).toBe(false);
    });

    it('should handle worker group set to 0 as a change', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setWorkerGroupReplicas([
          { groupName: 'cpu-workers', replicas: 0 },
          { groupName: 'gpu-workers', replicas: 1 },
        ]);
      });

      expect(result.current.hasChanges).toBe(true);
    });
  });

  describe('modal state', () => {
    it('should open modal when setModalOpen(true) is called', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setModalOpen(true);
      });

      expect(result.current.modalOpen).toBe(true);
    });

    it('should close modal when setModalOpen(false) is called', () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setModalOpen(true);
      });
      act(() => {
        result.current.setModalOpen(false);
      });

      expect(result.current.modalOpen).toBe(false);
    });
  });

  describe('handleSave', () => {
    it('should call updateRayJobNumNodes with current worker group replicas', async () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setWorkerGroupReplicas([
          { groupName: 'cpu-workers', replicas: 4 },
          { groupName: 'gpu-workers', replicas: 2 },
        ]);
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockUpdateRayJobNumNodes).toHaveBeenCalledWith(jobWithWorkerGroups, [
        { groupName: 'cpu-workers', replicas: 4 },
        { groupName: 'gpu-workers', replicas: 2 },
      ]);
    });

    it('should show success notification and close modal after successful save', async () => {
      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setModalOpen(true);
      });

      await act(async () => {
        await result.current.handleSave();
      });

      await waitFor(() => {
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Node count updated',
          'Worker node counts have been saved.',
        );
        expect(result.current.modalOpen).toBe(false);
        expect(result.current.isScaling).toBe(false);
      });
    });

    it('should show error notification on failure and keep modal open', async () => {
      mockUpdateRayJobNumNodes.mockRejectedValue(new Error('Patch failed'));

      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.setModalOpen(true);
      });

      await act(async () => {
        await result.current.handleSave();
      });

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Failed to update node count',
          'Patch failed',
        );
        expect(result.current.modalOpen).toBe(true);
        expect(result.current.isScaling).toBe(false);
      });
    });

    it('should not call updateRayJobNumNodes when job is undefined', async () => {
      const { result } = renderHook(() => useRayJobNodeScaling(undefined, undefined));

      await act(async () => {
        await result.current.handleSave();
      });

      expect(mockUpdateRayJobNumNodes).not.toHaveBeenCalled();
    });

    it('should set isScaling to true during the save operation', async () => {
      let resolvePatch: (value: typeof jobWithWorkerGroups) => void;
      const patchPromise = new Promise<typeof jobWithWorkerGroups>((resolve) => {
        resolvePatch = resolve;
      });
      mockUpdateRayJobNumNodes.mockReturnValue(patchPromise);

      const { result } = renderHook(() =>
        useRayJobNodeScaling(jobWithWorkerGroups, TrainingJobState.RUNNING),
      );

      act(() => {
        result.current.handleSave();
      });

      await waitFor(() => {
        expect(result.current.isScaling).toBe(true);
      });

      await act(async () => {
        resolvePatch(jobWithWorkerGroups);
        await patchPromise;
      });

      await waitFor(() => {
        expect(result.current.isScaling).toBe(false);
      });
    });
  });
});
