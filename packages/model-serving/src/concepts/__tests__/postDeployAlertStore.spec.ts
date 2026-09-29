import { act, renderHook } from '@testing-library/react';
import {
  dismissPostDeployAlert,
  enqueuePostDeployAlert,
  useHasPostDeployAlert,
} from '../postDeployAlertStore';

const STORAGE_KEY = 'odh-dashboard.model-serving.post-deploy-alerts';

const getStoredIds = (): unknown => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

describe('postDeployAlertStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('enqueuePostDeployAlert', () => {
    it('should store the alert id in sessionStorage', () => {
      enqueuePostDeployAlert('alert-a');

      expect(getStoredIds()).toEqual(['alert-a']);
    });

    it('should not duplicate an existing alert id', () => {
      enqueuePostDeployAlert('alert-a');
      enqueuePostDeployAlert('alert-a');

      expect(getStoredIds()).toEqual(['alert-a']);
    });

    it('should allow multiple distinct alert ids', () => {
      enqueuePostDeployAlert('alert-a');
      enqueuePostDeployAlert('alert-b');

      expect(getStoredIds()).toEqual(['alert-a', 'alert-b']);
    });
  });

  describe('dismissPostDeployAlert', () => {
    it('should remove the alert id from sessionStorage', () => {
      enqueuePostDeployAlert('alert-a');
      enqueuePostDeployAlert('alert-b');

      dismissPostDeployAlert('alert-a');

      expect(getStoredIds()).toEqual(['alert-b']);
    });

    it('should clear sessionStorage when the last alert is dismissed', () => {
      enqueuePostDeployAlert('alert-a');

      dismissPostDeployAlert('alert-a');

      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
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
        enqueuePostDeployAlert('alert-a');
      });

      expect(result.current).toBe(true);
    });

    it('should return false after the alert is dismissed', () => {
      enqueuePostDeployAlert('alert-a');
      const { result } = renderHook(() => useHasPostDeployAlert('alert-a'));

      expect(result.current).toBe(true);

      act(() => {
        dismissPostDeployAlert('alert-a');
      });

      expect(result.current).toBe(false);
    });
  });
});
