import { act, renderHook } from '@testing-library/react';
import {
  cancelScheduledPostDeployAlertDismiss,
  dismissPostDeployAlert,
  enqueuePostDeployAlert,
  resetPostDeployAlerts,
  schedulePostDeployAlertDismiss,
  syncPostDeployAlertPath,
  useHasPostDeployAlert,
  usePostDeployAlert,
} from '~/app/utilities/postDeployAlertStore';

describe('postDeployAlertStore', () => {
  beforeEach(() => {
    resetPostDeployAlerts();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('enqueuePostDeployAlert', () => {
    it('should make the alert visible with modelName', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'My model' });

      const { result } = renderHook(() => usePostDeployAlert('alert-a'));
      expect(result.current).toEqual({ isVisible: true, modelName: 'My model' });
    });

    it('should not overwrite an existing alert id', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'First' });
      enqueuePostDeployAlert('alert-a', { modelName: 'Second' });

      const { result } = renderHook(() => usePostDeployAlert('alert-a'));
      expect(result.current.modelName).toBe('First');
    });

    it('should allow multiple distinct alert ids', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });
      enqueuePostDeployAlert('alert-b', { modelName: 'B' });

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(true);
      expect(renderHook(() => useHasPostDeployAlert('alert-b')).result.current).toBe(true);
    });
  });

  describe('dismissPostDeployAlert', () => {
    it('should remove the alert', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });
      enqueuePostDeployAlert('alert-b', { modelName: 'B' });

      dismissPostDeployAlert('alert-a');

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(false);
      expect(renderHook(() => useHasPostDeployAlert('alert-b')).result.current).toBe(true);
    });
  });

  describe('syncPostDeployAlertPath', () => {
    it('should bind the pathname on first sync', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });

      syncPostDeployAlertPath('alert-a', '/deployments/external/project-a');

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(true);
    });

    it('should keep the alert when synced with the same pathname', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });
      syncPostDeployAlertPath('alert-a', '/deployments/external/project-a');

      syncPostDeployAlertPath('alert-a', '/deployments/external/project-a');

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(true);
    });

    it('should dismiss the alert when synced with a different pathname', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });
      syncPostDeployAlertPath('alert-a', '/deployments/external/project-a');

      syncPostDeployAlertPath('alert-a', '/deployments/external/project-b');

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(false);
    });
  });

  describe('schedulePostDeployAlertDismiss', () => {
    it('should dismiss the alert after leaving when the timeout fires', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });

      schedulePostDeployAlertDismiss('alert-a');
      act(() => {
        jest.runAllTimers();
      });

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(false);
    });

    it('should not dismiss when remount cancels the scheduled dismiss', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });

      schedulePostDeployAlertDismiss('alert-a');
      cancelScheduledPostDeployAlertDismiss('alert-a');
      act(() => {
        jest.runAllTimers();
      });

      expect(renderHook(() => useHasPostDeployAlert('alert-a')).result.current).toBe(true);
    });
  });

  describe('useHasPostDeployAlert', () => {
    it('should return false when the alert id is not enqueued', () => {
      const { result } = renderHook(() => useHasPostDeployAlert('alert-a'));

      expect(result.current).toBe(false);
    });

    it('should return true when the alert id is enqueued', () => {
      const { result } = renderHook(() => useHasPostDeployAlert('alert-a'));

      act(() => {
        enqueuePostDeployAlert('alert-a', { modelName: 'A' });
      });

      expect(result.current).toBe(true);
    });

    it('should return false after the alert is dismissed', () => {
      enqueuePostDeployAlert('alert-a', { modelName: 'A' });
      const { result } = renderHook(() => useHasPostDeployAlert('alert-a'));

      expect(result.current).toBe(true);

      act(() => {
        dismissPostDeployAlert('alert-a');
      });

      expect(result.current).toBe(false);
    });
  });
});
