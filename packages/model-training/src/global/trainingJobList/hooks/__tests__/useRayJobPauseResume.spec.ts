import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useRayJobPauseResume } from '../useRayJobPauseResume';
import { setRayJobPauseState } from '../../../../api';
import { RayJobState } from '../../../../types';
import { mockRayJobK8sResource } from '../../../../__mocks__/mockRayJobK8sResource';

jest.mock('../../../../api');
jest.mock('@odh-dashboard/internal/utilities/useNotification');
jest.mock('../usePauseRayJobModalAvailability');

const mockSetRayJobPauseState = jest.mocked(setRayJobPauseState);

describe('useRayJobPauseResume', () => {
  const mockNotification = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const mockSetDontShowModalValue = jest.fn();

  const mockJob = mockRayJobK8sResource({
    name: 'test-ray-job',
    namespace: 'test-namespace',
    uid: 'test-uid-123',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.requireMock('@odh-dashboard/internal/utilities/useNotification').default = jest.fn(
      () => mockNotification,
    );
    jest.requireMock('../usePauseRayJobModalAvailability').default = jest.fn(() => [
      false,
      mockSetDontShowModalValue,
    ]);
    mockSetRayJobPauseState.mockResolvedValue({ success: true });
  });

  describe('initial state', () => {
    it('should initialize with isSubmitting false', () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should initialize with pauseModalOpen false', () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      expect(result.current.pauseModalOpen).toBe(false);
    });

    it('should initialize with dontShowModalValue from storage', () => {
      jest.requireMock('../usePauseRayJobModalAvailability').default = jest.fn(() => [
        true,
        mockSetDontShowModalValue,
      ]);

      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      expect(result.current.dontShowModalValue).toBe(true);
    });
  });

  describe('onPauseClick', () => {
    it('should open pause modal when dontShowModalValue is false', () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      act(() => {
        result.current.onPauseClick();
      });

      expect(result.current.pauseModalOpen).toBe(true);
      expect(mockSetRayJobPauseState).not.toHaveBeenCalled();
    });

    it('should call handlePause directly when dontShowModalValue is true', async () => {
      jest.requireMock('../usePauseRayJobModalAvailability').default = jest.fn(() => [
        true,
        mockSetDontShowModalValue,
      ]);

      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      await act(async () => {
        result.current.onPauseClick();
      });

      await waitFor(() => {
        expect(mockSetRayJobPauseState).toHaveBeenCalledWith(mockJob, true);
      });
      expect(result.current.pauseModalOpen).toBe(false);
    });
  });

  describe('closePauseModal', () => {
    it('should close the modal and reset dontShowModalValue', () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      act(() => {
        result.current.onPauseClick();
      });
      expect(result.current.pauseModalOpen).toBe(true);

      act(() => {
        result.current.closePauseModal();
      });

      expect(result.current.pauseModalOpen).toBe(false);
      expect(mockSetDontShowModalValue).toHaveBeenCalledWith(false);
    });
  });

  describe('handlePause', () => {
    it('should call setRayJobPauseState with pause=true', async () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      await act(async () => {
        await result.current.handlePause();
      });

      expect(mockSetRayJobPauseState).toHaveBeenCalledWith(mockJob, true);
    });

    it('should call onStatusUpdate with PAUSED status on success', async () => {
      const onStatusUpdate = jest.fn();
      const { result } = renderHook(() => useRayJobPauseResume(mockJob, onStatusUpdate));

      await act(async () => {
        await result.current.handlePause();
      });

      await waitFor(() => {
        expect(onStatusUpdate).toHaveBeenCalledWith('test-uid-123', RayJobState.PAUSED);
      });
    });

    it('should close the modal after successful pause', async () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      act(() => {
        result.current.onPauseClick();
      });
      expect(result.current.pauseModalOpen).toBe(true);

      await act(async () => {
        await result.current.handlePause();
      });

      await waitFor(() => {
        expect(result.current.pauseModalOpen).toBe(false);
      });
    });

    it('should show error notification when API returns success=false', async () => {
      mockSetRayJobPauseState.mockResolvedValue({
        success: false,
        error: 'Quota exceeded',
      });

      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      await act(async () => {
        await result.current.handlePause();
      });

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Failed to pause job',
          'Quota exceeded',
        );
      });
    });

    it('should show error notification when API throws', async () => {
      mockSetRayJobPauseState.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      await act(async () => {
        await result.current.handlePause();
      });

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith('Failed to pause job', 'Network error');
      });
    });

    it('should set isSubmitting to true during operation then false after', async () => {
      let resolvePause: (value: { success: boolean }) => void;
      const pausePromise = new Promise<{ success: boolean }>((resolve) => {
        resolvePause = resolve;
      });
      mockSetRayJobPauseState.mockReturnValue(pausePromise);

      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      act(() => {
        result.current.handlePause();
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true);
      });

      await act(async () => {
        resolvePause({ success: true });
        await pausePromise;
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should not call API when job is undefined', async () => {
      const { result } = renderHook(() => useRayJobPauseResume(undefined));

      await act(async () => {
        await result.current.handlePause();
      });

      expect(mockSetRayJobPauseState).not.toHaveBeenCalled();
    });
  });

  describe('handleResume', () => {
    it('should call setRayJobPauseState with pause=false', async () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      await act(async () => {
        await result.current.handleResume();
      });

      expect(mockSetRayJobPauseState).toHaveBeenCalledWith(mockJob, false);
    });

    it('should call onStatusUpdate with RUNNING status on success', async () => {
      const onStatusUpdate = jest.fn();
      const { result } = renderHook(() => useRayJobPauseResume(mockJob, onStatusUpdate));

      await act(async () => {
        await result.current.handleResume();
      });

      await waitFor(() => {
        expect(onStatusUpdate).toHaveBeenCalledWith('test-uid-123', RayJobState.RUNNING);
      });
    });

    it('should NOT close the modal after resume (modal is only for pause)', async () => {
      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      act(() => {
        result.current.onPauseClick();
      });
      expect(result.current.pauseModalOpen).toBe(true);

      await act(async () => {
        await result.current.handleResume();
      });

      expect(result.current.pauseModalOpen).toBe(true);
    });

    it('should show error notification when resume fails', async () => {
      mockSetRayJobPauseState.mockRejectedValue(new Error('Resume failed'));

      const { result } = renderHook(() => useRayJobPauseResume(mockJob));

      await act(async () => {
        await result.current.handleResume();
      });

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Failed to resume job',
          'Resume failed',
        );
      });
    });
  });
});
