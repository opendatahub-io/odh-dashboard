import type { NotebookStatus } from '#~/types';
import { EventStatus } from '#~/types';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import { getStatusSubtitle } from '#~/pages/projects/notebook/NotebookStateStatus';

describe('getStatusSubtitle', () => {
  describe('isStopping priority', () => {
    it('should return null when isStopping is true', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: true,
          notebookStatus: null,
          kueueStatus: null,
        }),
      ).toBeNull();
    });

    it('should return null when isStopping is true even with Kueue override status', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: true,
          notebookStatus: null,
          kueueStatus: {
            status: KueueWorkloadStatus.Queued,
            message: 'insufficient unused quota',
          },
        }),
      ).toBeNull();
    });

    it('should return null when isStopping is true even when isStarting is true', () => {
      const notebookStatus: NotebookStatus = {
        currentStatus: EventStatus.IN_PROGRESS,
        currentEvent: 'Starting...',
        currentEventReason: '',
        currentEventDescription: '',
      };
      expect(
        getStatusSubtitle({
          isStarting: true,
          isStopping: true,
          notebookStatus,
          kueueStatus: null,
        }),
      ).toBeNull();
    });
  });

  describe('Kueue override status', () => {
    it('should return Kueue message when status is in override list and not stopping', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: {
            status: KueueWorkloadStatus.Queued,
            message: 'insufficient unused quota in cluster',
          },
        }),
      ).toBe('insufficient unused quota in cluster');
    });

    it('should return trimmed Kueue message when message has surrounding whitespace', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: {
            status: KueueWorkloadStatus.Inadmissible,
            message: '  quota exceeded  ',
          },
        }),
      ).toBe('quota exceeded');
    });

    it('should return status when message is empty and status is in override list', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: { status: KueueWorkloadStatus.Queued },
        }),
      ).toBe(KueueWorkloadStatus.Queued);
    });

    it('should return status when message is whitespace-only', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: {
            status: KueueWorkloadStatus.Failed,
            message: '   ',
          },
        }),
      ).toBe(KueueWorkloadStatus.Failed);
    });

    it('should return null when kueueStatus is null', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: null,
        }),
      ).toBeNull();
    });

    it('should return null when status is not in override list (e.g. Running)', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: { status: KueueWorkloadStatus.Running },
        }),
      ).toBeNull();
    });
  });

  describe('isStarting', () => {
    it('should return notebook currentEvent when isStarting and notebookStatus has event', () => {
      const notebookStatus: NotebookStatus = {
        currentStatus: EventStatus.IN_PROGRESS,
        currentEvent: 'Pulling image...',
        currentEventReason: '',
        currentEventDescription: '',
      };
      expect(
        getStatusSubtitle({
          isStarting: true,
          isStopping: false,
          notebookStatus,
          kueueStatus: null,
        }),
      ).toBe('Pulling image...');
    });

    it('should return fallback when isStarting and notebookStatus is null', () => {
      expect(
        getStatusSubtitle({
          isStarting: true,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: null,
        }),
      ).toBe('Waiting for server request to start...');
    });

    it('should return fallback when isStarting and notebookStatus has no currentEvent', () => {
      const notebookStatus: NotebookStatus = {
        currentStatus: EventStatus.IN_PROGRESS,
        currentEvent: '',
        currentEventReason: '',
        currentEventDescription: '',
      };
      expect(
        getStatusSubtitle({
          isStarting: true,
          isStopping: false,
          notebookStatus,
          kueueStatus: null,
        }),
      ).toBe('Waiting for server request to start...');
    });
  });

  describe('no subtitle', () => {
    it('should return null when not starting, not stopping, and no Kueue override', () => {
      expect(
        getStatusSubtitle({
          isStarting: false,
          isStopping: false,
          notebookStatus: null,
          kueueStatus: null,
        }),
      ).toBeNull();
    });
  });
});
