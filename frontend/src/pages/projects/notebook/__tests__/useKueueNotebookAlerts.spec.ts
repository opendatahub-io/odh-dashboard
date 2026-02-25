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

describe('useKueueNotebookAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fire notification on initial render even when status is Failed', () => {
    const states = [notebookState('nb1')];
    const statusMap = { nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed') };

    renderHook(() => useKueueNotebookAlerts(states, statusMap));

    expect(mockNotification.error).not.toHaveBeenCalled();
  });

  it('should not fire notification on initial render even when status is Preempted', () => {
    const states = [notebookState('nb1')];
    const statusMap = {
      nb1: kueueStatus(KueueWorkloadStatus.Preempted, 'Preempted', {
        timestamp: '2026-02-16T08:00:00Z',
      }),
    };

    renderHook(() => useKueueNotebookAlerts(states, statusMap));

    expect(mockNotification.warning).not.toHaveBeenCalled();
  });

  it('should not fire notification for non-alert statuses on initial render', () => {
    const states = [notebookState('nb1')];
    const statusMap = { nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting') };

    renderHook(() => useKueueNotebookAlerts(states, statusMap));

    expect(mockNotification.error).not.toHaveBeenCalled();
    expect(mockNotification.warning).not.toHaveBeenCalled();
  });

  it('should fire error notification when transitioning to Failed', () => {
    const states = [notebookState('nb1')];
    const initialStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
    };

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: { s: states, m: initialStatus },
    });

    const failedStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Failed, 'quota exceeded', {
        queueName: 'test-queue',
      }),
    };

    rerender({ s: states, m: failedStatus });

    expect(mockNotification.error).toHaveBeenCalledTimes(1);
    expect(mockNotification.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to start'),
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ title: 'View details' })]),
    );
  });

  it('should fire warning notification when transitioning to Preempted', () => {
    const states = [notebookState('nb1')];
    const initialStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Running, 'Running'),
    };

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: { s: states, m: initialStatus },
    });

    const preemptedStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Preempted, 'Preempted', {
        timestamp: '2026-02-16T08:00:00Z',
      }),
    };

    rerender({ s: states, m: preemptedStatus });

    expect(mockNotification.warning).toHaveBeenCalledTimes(1);
    expect(mockNotification.warning).toHaveBeenCalledWith(
      expect.stringContaining('was preempted'),
      expect.stringContaining('higher-priority job'),
      expect.arrayContaining([expect.objectContaining({ title: 'View details' })]),
    );
  });

  it('should not fire duplicate notification when status does not change', () => {
    const states = [notebookState('nb1')];
    const initialStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
    };

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: { s: states, m: initialStatus },
    });

    const failedStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
    };

    rerender({ s: states, m: failedStatus });
    expect(mockNotification.error).toHaveBeenCalledTimes(1);

    rerender({ s: states, m: failedStatus });
    expect(mockNotification.error).toHaveBeenCalledTimes(1);
  });

  it('should not fire notification when transitioning to non-alert status', () => {
    const states = [notebookState('nb1')];
    const initialStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
    };

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: { s: states, m: initialStatus },
    });

    const admittedStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Admitted, 'Admitted'),
    };

    rerender({ s: states, m: admittedStatus });

    expect(mockNotification.error).not.toHaveBeenCalled();
    expect(mockNotification.warning).not.toHaveBeenCalled();
  });

  it('should fire notifications independently for multiple notebooks on transition', () => {
    const states = [notebookState('nb1'), notebookState('nb2')];
    const initialStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
      nb2: kueueStatus(KueueWorkloadStatus.Running, 'Running'),
    };

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: { s: states, m: initialStatus },
    });

    const updatedStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
      nb2: kueueStatus(KueueWorkloadStatus.Preempted, 'Preempted'),
    };

    rerender({ s: states, m: updatedStatus });

    expect(mockNotification.error).toHaveBeenCalledTimes(1);
    expect(mockNotification.warning).toHaveBeenCalledTimes(1);
  });

  it('should navigate to project page when View details action is clicked', () => {
    const states = [notebookState('nb1', 'my-project')];
    const initialStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Queued, 'Waiting'),
    };

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: { s: states, m: initialStatus },
    });

    const failedStatus: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: kueueStatus(KueueWorkloadStatus.Failed, 'Job failed'),
    };

    rerender({ s: states, m: failedStatus });

    const actions = mockNotification.error.mock.calls[0][2];
    const viewDetailsAction = actions.find((a: { title: string }) => a.title === 'View details');
    viewDetailsAction.onClick();

    expect(mockNavigate).toHaveBeenCalledWith('/projects/my-project');
  });

  it('should not fire notification when notebook has null kueue status', () => {
    const states = [notebookState('nb1')];
    const statusMap: Record<string, KueueWorkloadStatusWithMessage | null> = {
      nb1: null,
    };

    renderHook(() => useKueueNotebookAlerts(states, statusMap));

    expect(mockNotification.error).not.toHaveBeenCalled();
    expect(mockNotification.warning).not.toHaveBeenCalled();
  });

  it('should fire again if status changes from Failed to something else and back to Failed', () => {
    const states = [notebookState('nb1')];

    const { rerender } = renderHook(({ s, m }) => useKueueNotebookAlerts(s, m), {
      initialProps: {
        s: states,
        m: { nb1: kueueStatus(KueueWorkloadStatus.Queued, 'waiting') } as Record<
          string,
          KueueWorkloadStatusWithMessage | null
        >,
      },
    });

    rerender({
      s: states,
      m: { nb1: kueueStatus(KueueWorkloadStatus.Failed, 'first failure') },
    });

    expect(mockNotification.error).toHaveBeenCalledTimes(1);

    rerender({
      s: states,
      m: { nb1: kueueStatus(KueueWorkloadStatus.Queued, 'back in queue') },
    });

    rerender({
      s: states,
      m: { nb1: kueueStatus(KueueWorkloadStatus.Failed, 'second failure') },
    });

    expect(mockNotification.error).toHaveBeenCalledTimes(2);
  });
});
