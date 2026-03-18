import { renderHook } from '@testing-library/react';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import useNotification from '#~/utilities/useNotification';
import type { NotebookState } from '#~/pages/projects/notebook/types';
import useKueueNotebookAlerts from '#~/pages/projects/notebook/useKueueNotebookAlerts';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('#~/utilities/useNotification');
const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};
(useNotification as jest.Mock).mockReturnValue(mockNotification);

type StatusMap = Record<string, KueueWorkloadStatusWithMessage | null>;

type HookProps = {
  states: NotebookState[];
  statusMap: StatusMap;
  loaded: boolean;
};

function notebookState(name: string, namespace = 'test-project'): NotebookState {
  const notebook = mockNotebookK8sResource({ name, namespace });
  return {
    notebook,
    isStarting: false,
    isRunning: false,
    isStopping: false,
    isStopped: true,
    runningPodUid: '',
    refresh: jest.fn(),
  };
}

function kueueStatus(
  status: KueueWorkloadStatus,
  message?: string,
  opts?: { timestamp?: string; queueName?: string },
): KueueWorkloadStatusWithMessage {
  return { status, message, ...opts };
}

const renderAlertHook = (props: HookProps) =>
  renderHook(
    ({ states, statusMap, loaded }: HookProps) => useKueueNotebookAlerts(states, statusMap, loaded),
    {
      initialProps: props,
    },
  );

describe('useKueueNotebookAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should not fire notification while kueue data is still loading', () => {
      const states = [notebookState('nb1')];
      const statusMap: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
      };

      const { rerender } = renderAlertHook({ states, statusMap, loaded: false });

      expect(mockNotification.error).not.toHaveBeenCalled();

      rerender({ states, statusMap, loaded: false });
      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should not fire notification for pre-existing status once data loads', () => {
      const states = [notebookState('nb1')];
      const statusMap: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
      };

      const { rerender } = renderAlertHook({ states, statusMap, loaded: false });

      rerender({ states, statusMap, loaded: true });

      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should fire notification for transition that happens after initial load', () => {
      const states = [notebookState('nb1')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const failedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'quota exceeded', { queueName: 'test-queue' }),
      };
      rerender({ states, statusMap: failedStatus, loaded: true });

      expect(mockNotification.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('initial render', () => {
    it('should not fire notification on initial render even when status is Failed', () => {
      const states = [notebookState('nb1')];
      const statusMap: StatusMap = { nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed') };

      renderAlertHook({ states, statusMap, loaded: true });

      expect(mockNotification.error).not.toHaveBeenCalled();
    });

    it('should not fire notification on initial render even when status is Preempted', () => {
      const states = [notebookState('nb1')];
      const statusMap: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Preempted, 'Preempted', {
          timestamp: '2026-02-16T08:00:00Z',
        }),
      };

      renderAlertHook({ states, statusMap, loaded: true });

      expect(mockNotification.warning).not.toHaveBeenCalled();
    });

    it('should not fire notification for non-alert statuses', () => {
      const states = [notebookState('nb1')];
      const statusMap: StatusMap = { nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting') };

      renderAlertHook({ states, statusMap, loaded: true });

      expect(mockNotification.error).not.toHaveBeenCalled();
      expect(mockNotification.warning).not.toHaveBeenCalled();
    });

    it('should not fire notification when notebook has null kueue status', () => {
      const states = [notebookState('nb1')];
      const statusMap: StatusMap = { nb1: null };

      renderAlertHook({ states, statusMap, loaded: true });

      expect(mockNotification.error).not.toHaveBeenCalled();
      expect(mockNotification.warning).not.toHaveBeenCalled();
    });
  });

  describe('status transitions', () => {
    it('should fire error notification when transitioning to Failed', () => {
      const states = [notebookState('nb1')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const failedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'quota exceeded', { queueName: 'test-queue' }),
      };
      rerender({ states, statusMap: failedStatus, loaded: true });

      expect(mockNotification.error).toHaveBeenCalledTimes(1);
      expect(mockNotification.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to start'),
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ title: 'View details' })]),
      );
    });

    it('should fire warning notification when transitioning to Preempted', () => {
      const states = [notebookState('nb1')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Running, 'Running'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const preemptedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Preempted, 'Preempted', {
          timestamp: '2026-02-16T08:00:00Z',
        }),
      };
      rerender({ states, statusMap: preemptedStatus, loaded: true });

      expect(mockNotification.warning).toHaveBeenCalledTimes(1);
      expect(mockNotification.warning).toHaveBeenCalledWith(
        expect.stringContaining('was preempted'),
        expect.stringContaining('higher-priority job'),
        expect.arrayContaining([expect.objectContaining({ title: 'View details' })]),
      );
    });

    it('should not fire notification when transitioning to non-alert status', () => {
      const states = [notebookState('nb1')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const admittedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Admitted, 'Admitted'),
      };
      rerender({ states, statusMap: admittedStatus, loaded: true });

      expect(mockNotification.error).not.toHaveBeenCalled();
      expect(mockNotification.warning).not.toHaveBeenCalled();
    });

    it('should not fire duplicate notification when status does not change', () => {
      const states = [notebookState('nb1')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const failedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
      };
      rerender({ states, statusMap: failedStatus, loaded: true });
      expect(mockNotification.error).toHaveBeenCalledTimes(1);

      rerender({ states, statusMap: failedStatus, loaded: true });
      expect(mockNotification.error).toHaveBeenCalledTimes(1);
    });

    it('should fire again if status changes from Failed to something else and back to Failed', () => {
      const states = [notebookState('nb1')];

      const { rerender } = renderAlertHook({
        states,
        statusMap: { nb1: kueueStatus(KueueWorkloadStatus.Queued, 'waiting') },
        loaded: true,
      });

      rerender({
        states,
        statusMap: { nb1: kueueStatus(KueueWorkloadStatus.Failed, 'first failure') },
        loaded: true,
      });
      expect(mockNotification.error).toHaveBeenCalledTimes(1);

      rerender({
        states,
        statusMap: { nb1: kueueStatus(KueueWorkloadStatus.Queued, 'back in queue') },
        loaded: true,
      });

      rerender({
        states,
        statusMap: { nb1: kueueStatus(KueueWorkloadStatus.Failed, 'second failure') },
        loaded: true,
      });
      expect(mockNotification.error).toHaveBeenCalledTimes(2);
    });

    it('should fire notifications independently for multiple notebooks on transition', () => {
      const states = [notebookState('nb1'), notebookState('nb2')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
        nb2: kueueStatus(KueueWorkloadStatus.Running, 'Running'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const updatedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
        nb2: kueueStatus(KueueWorkloadStatus.Preempted, 'Preempted'),
      };
      rerender({ states, statusMap: updatedStatus, loaded: true });

      expect(mockNotification.error).toHaveBeenCalledTimes(1);
      expect(mockNotification.warning).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation', () => {
    it('should navigate to project page when View details action is clicked', () => {
      const states = [notebookState('nb1', 'my-project')];
      const initialStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
      };

      const { rerender } = renderAlertHook({ states, statusMap: initialStatus, loaded: true });

      const failedStatus: StatusMap = {
        nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
      };
      rerender({ states, statusMap: failedStatus, loaded: true });

      const actions = mockNotification.error.mock.calls[0][2];
      const viewDetailsAction = actions.find((a: { title: string }) => a.title === 'View details');
      viewDetailsAction.onClick();

      expect(mockNavigate).toHaveBeenCalledWith('/projects/my-project');
    });
  });
});
