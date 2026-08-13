import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeploymentProgressPage from '../DeploymentProgressPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    children,
    title,
    loaded,
    loadError,
  }: {
    children: React.ReactNode;
    title: string;
    loaded: boolean;
    loadError?: Error;
  }) => (
    <div data-testid="mock-app-page" data-title={title}>
      {loadError && <div data-testid="load-error">{loadError.message}</div>}
      {loaded && children}
    </div>
  ),
}));

const mockDeploymentStatus = {
  featureStore: null,
  phase: 'Pending' as const,
  conditions: [],
  pods: [],
  podLogs: { data: {}, loaded: false, error: undefined, refresh: jest.fn() },
  isComplete: false,
  isFailed: false,
  loaded: true,
  error: undefined,
  refresh: jest.fn(),
};

jest.mock('../../../hooks/useWatchFeatureStoreDeployment', () => ({
  __esModule: true,
  default: jest.fn(() => mockDeploymentStatus),
}));

const renderPage = (namespace = 'test-ns', name = 'test-store') => {
  render(
    <MemoryRouter initialEntries={[`/create/deploy/${namespace}/${name}`]}>
      <Routes>
        <Route path="/create/deploy/:namespace/:name" element={<DeploymentProgressPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('DeploymentProgressPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReset();
    useWatchMock.mockReturnValue(mockDeploymentStatus);
  });

  it('renders default state with status card, progress bar, and "Back to overview" button', () => {
    renderPage();
    expect(screen.getByTestId('deployment-status-card')).toBeInTheDocument();
    expect(screen.getByTestId('deployment-status-card')).toHaveTextContent('Pending');
    expect(screen.getByTestId('deployment-progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('go-to-feature-store')).toHaveTextContent('Back to overview');
    expect(screen.getByText('Deployment in progress')).toBeInTheDocument();
  });

  it('navigates to overview on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('go-to-feature-store'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('feature-store/overview'));
  });

  it.each([
    ['Pending', 'Pending'],
    ['Installing', 'Installing'],
    ['Unknown', 'Pending'],
  ])('shows %s phase as "%s" in status card', (phase, expectedLabel) => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({ ...mockDeploymentStatus, phase });
    renderPage();
    expect(screen.getByTestId('deployment-status-card')).toHaveTextContent(expectedLabel);
  });

  it('shows success state with "Go to feature store" button and no progress text', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      phase: 'Ready',
      isComplete: true,
      loaded: true,
    });
    renderPage();
    expect(screen.getByTestId('deployment-success-alert')).toBeInTheDocument();
    expect(screen.getByTestId('go-to-feature-store')).toHaveTextContent('Go to feature store');
    expect(screen.queryByText('Deployment in progress')).not.toBeInTheDocument();
  });

  it('shows failed alert when deployment fails', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      phase: 'Failed',
      isFailed: true,
      loaded: true,
    });
    renderPage();
    expect(screen.getByTestId('deployment-failed-alert')).toBeInTheDocument();
  });

  it('shows Failed status when operator phase is Pending but conditions indicate failure', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      phase: 'Pending',
      loaded: true,
      conditions: [
        { type: 'OnlineStore', status: 'True', message: 'Online store installation complete' },
        {
          type: 'FeatureStore',
          status: 'Unknown',
          reason: 'DeploymentNotAvailable',
          message: 'CrashLoopBackOff - init container failed',
        },
      ],
    });
    renderPage();
    expect(screen.getByTestId('deployment-status-card')).toHaveTextContent('Failed');
    expect(screen.getByTestId('deployment-failed-alert')).toBeInTheDocument();
  });

  it('shows loading spinner when not loaded', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({ ...mockDeploymentStatus, loaded: false });
    renderPage();
    expect(screen.getByLabelText('Loading deployment status')).toBeInTheDocument();
  });

  it('shows error page when error occurs before load', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      loaded: false,
      error: new Error('Resource not found'),
    });
    renderPage();
    expect(screen.getByTestId('load-error')).toBeInTheDocument();
    expect(screen.getByText('Resource not found')).toBeInTheDocument();
  });

  it('renders conditions with Complete/Pending/Failed labels based on status, reason, and message', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      conditions: [
        { type: 'OnlineStore', status: 'True', message: 'Online store installation complete' },
        {
          type: 'FeatureStore',
          status: 'False',
          reason: 'FeatureStoreFailed',
          message: 'Object already owned',
        },
        {
          type: 'Client',
          status: 'Unknown',
          reason: 'DeploymentNotAvailable',
          message: 'CrashLoopBackOff - init container failed',
        },
        { type: 'Registry', status: 'False', reason: 'Deploying' },
        { type: 'CronJob', status: 'Unknown' },
      ],
    });
    renderPage();
    const card = screen.getByTestId('deployment-conditions-card');
    expect(card).toHaveTextContent('Online store');
    expect(card).toHaveTextContent('Complete');
    expect(card).toHaveTextContent('Online store installation complete');
    expect(card).toHaveTextContent('Feature store');
    expect(card).toHaveTextContent('Failed');
    expect(card).toHaveTextContent('Object already owned');
    expect(card).toHaveTextContent('Client');
    expect(card).toHaveTextContent('CrashLoopBackOff');
    expect(card).toHaveTextContent('Registry');
    expect(card).toHaveTextContent('Pending');
    expect(card).toHaveTextContent('Cron job');
  });

  it.each([
    ['Running', 'feast-pod-abc', 'Running'],
    ['Failed', 'feast-pod-fail', 'Failed'],
    ['Pending', 'init-pod', 'Pending'],
    [undefined, 'no-status-pod', 'Pending'],
  ] as [string | undefined, string, string][])(
    'renders pod with phase=%s as "%s"',
    (phase, podName, expectedLabel) => {
      const useWatchMock = jest.requireMock(
        '../../../hooks/useWatchFeatureStoreDeployment',
      ).default;
      useWatchMock.mockReturnValue({
        ...mockDeploymentStatus,
        pods: [{ metadata: { name: podName }, status: phase ? { phase } : undefined }],
      });
      renderPage();
      const podsCard = screen.getByTestId('deployment-pods-card');
      expect(podsCard).toBeInTheDocument();
      expect(within(podsCard).getByText(podName)).toBeInTheDocument();
      expect(within(podsCard).getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it('renders pod logs card when logs are available', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      podLogs: {
        data: { 'feast-pod-abc/main': 'Starting feast server...\nListening on port 6566' },
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      },
    });
    renderPage();
    expect(screen.getByTestId('deployment-logs-card')).toBeInTheDocument();
    expect(screen.getByText('feast-pod-abc/main')).toBeInTheDocument();
    expect(screen.getByText(/Starting feast server/)).toBeInTheDocument();
  });

  it('shows feast version when available', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      featureStore: { status: { feastVersion: '0.40.1' } },
    });
    renderPage();
    expect(screen.getByText('0.40.1')).toBeInTheDocument();
  });

  it('shows stale-data warning with retry when poll fails after initial load', async () => {
    const refreshMock = jest.fn();
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      loaded: true,
      error: new Error('Network timeout'),
      refresh: refreshMock,
    });
    renderPage();
    const staleAlert = screen.getByTestId('deployment-stale-alert');
    expect(staleAlert).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(within(staleAlert).getByRole('button', { name: 'Retry' }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('shows pod-log error with retry when log fetch fails and pods exist', async () => {
    const logRefreshMock = jest.fn();
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      loaded: true,
      pods: [{ metadata: { name: 'feast-pod-abc' }, status: { phase: 'Running' } }],
      podLogs: {
        data: {},
        loaded: true,
        error: new Error('Failed to fetch container logs'),
        refresh: logRefreshMock,
      },
    });
    renderPage();
    const logAlert = screen.getByTestId('deployment-pod-logs-error');
    expect(logAlert).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch container logs')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-logs-card')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(within(logAlert).getByRole('button', { name: 'Retry' }));
    expect(logRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('does not show pod-log error when no pods exist yet', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      loaded: true,
      pods: [],
      podLogs: {
        data: {},
        loaded: false,
        error: new Error('No pods available'),
        refresh: jest.fn(),
      },
    });
    renderPage();
    expect(screen.queryByTestId('deployment-pod-logs-error')).not.toBeInTheDocument();
  });

  it('does not show stale-data warning when there is no error', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({ ...mockDeploymentStatus, loaded: true, error: undefined });
    renderPage();
    expect(screen.queryByTestId('deployment-stale-alert')).not.toBeInTheDocument();
  });

  it('renders safely when conditions and pods are empty arrays', () => {
    const useWatchMock = jest.requireMock('../../../hooks/useWatchFeatureStoreDeployment').default;
    useWatchMock.mockReturnValue({
      ...mockDeploymentStatus,
      conditions: [],
      pods: [],
    });
    renderPage();
    expect(screen.getByTestId('deployment-status-card')).toBeInTheDocument();
    expect(screen.queryByTestId('deployment-conditions-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deployment-pods-card')).not.toBeInTheDocument();
  });
});
