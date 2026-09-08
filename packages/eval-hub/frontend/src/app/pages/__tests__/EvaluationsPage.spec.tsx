import * as React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { EvaluationJob } from '~/app/types';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsPage from '~/app/pages/EvaluationsPage';

const mockRefresh = jest.fn();
const mockUseEvaluationJobs = jest.fn<
  [EvaluationJob[], boolean, Error | undefined, jest.Mock],
  []
>();

const mockUseEvalHubHealth = jest.fn<
  { isHealthy: boolean; loaded: boolean; error: Error | undefined },
  []
>();

jest.mock('~/app/hooks/useEvaluationJobs', () => ({
  useEvaluationJobs: () => mockUseEvaluationJobs(),
}));

jest.mock('~/app/hooks/useEvalHubHealth', () => ({
  __esModule: true,
  default: () => mockUseEvalHubHealth(),
}));

const mockUseUser = jest.fn<{ clusterAdmin: boolean }, []>();

jest.mock('~/app/hooks/useUser', () => ({
  __esModule: true,
  default: () => mockUseUser(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  WhosMyAdministrator: () => <div data-testid="whos-my-administrator" />,
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-project' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
  }),
  asEnumMember: jest.fn((val: unknown) => val),
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone', Kubeflow: 'kubeflow' },
  handleRestFailures: jest.fn((p: Promise<unknown>) => p),
  restDELETE: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(() => true),
}));

jest.mock('~/app/components/EvaluationStatusModal', () => ({
  __esModule: true,
  default: ({ job, namespace }: { job: unknown; namespace: string }) =>
    job ? <div data-testid="evaluation-status-modal" data-namespace={namespace} /> : null,
}));

jest.mock('~/app/context/CollectionsContext', () => ({
  useCollectionsContext: jest.fn().mockReturnValue({
    response: { items: [] },
    loaded: true,
    loadError: undefined,
    refresh: jest.fn(),
  }),
}));

jest.mock('~/app/hooks/collections', () => ({
  useCollectionsQuery: jest.fn().mockReturnValue({
    data: { items: [] },
    isLoading: false,
    error: null,
  }),
  useDeleteCollectionMutation: jest.fn().mockReturnValue({
    error: null,
    isPending: false,
    mutateAsync: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectIconWithSizeModule(),
);

jest.mock('@odh-dashboard/internal/types', () =>
  require('~/__tests__/unit/testUtils/mocks').mockIconSizeModule(),
);

jest.mock('@odh-dashboard/ui-core/components/projectSelector/ProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const LocationDisplay: React.FC = () => {
  const { search } = useLocation();
  return <div data-testid="location-search">{search}</div>;
};

describe('EvaluationsPage', () => {
  const renderPage = (namespace: string, search = '') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/${namespace}${search}`]}>
          <LocationDisplay />
          <Routes>
            <Route path="/:namespace" element={<EvaluationsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  const selectRunsTab = () => {
    fireEvent.click(screen.getByTestId('runs-tab'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockUseEvalHubHealth.mockReturnValue({ isHealthy: true, loaded: true, error: undefined });
    mockUseEvaluationJobs.mockReturnValue([[], true, undefined, mockRefresh]);
    mockUseUser.mockReturnValue({ clusterAdmin: true });
  });

  it('should render the page with correct title and description', () => {
    renderPage('test-project');
    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByTestId('evaluate-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('create-suite-card')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-model-suite-2')).toBeInTheDocument();
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Create benchmark suites and run evaluations to measure model, agent, and dataset performance.',
    );
  });

  it('should show the suite contextual actions and delete confirmation modal', () => {
    renderPage('test-project');

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite-2'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(screen.getByTestId('benchmark-suite-delete-modal')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-delete-modal')).toHaveTextContent(
      'The Model suite 2 benchmark suite will be permanently deleted.',
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-delete-cancel'));

    expect(screen.queryByTestId('benchmark-suite-delete-modal')).not.toBeInTheDocument();
  });

  it('should link to the tenant benchmark suites page', () => {
    renderPage('test-project');

    expect(screen.getByRole('link', { name: 'Go to Benchmark suites' })).toHaveAttribute(
      'href',
      '/evaluation/test-project/collections',
    );
  });

  it('should use the Runs tab from the URL and render its content description', () => {
    const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
    mockUseEvaluationJobs.mockReturnValue([jobs, true, undefined, mockRefresh]);
    renderPage('test-project', '?tab=runs');

    expect(screen.getByTestId('runs-tab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Create benchmark suites and run evaluations to measure model, agent, and dataset performance.',
    );
    expect(screen.getByTestId('runs-tab-description')).toHaveTextContent(
      'Start and manage evaluation runs for models, agents, and datasets.',
    );
  });

  it('should persist tab selection in the URL when switching tabs', () => {
    renderPage('test-project');
    selectRunsTab();

    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=runs');
  });

  it('should render the project selector with the current namespace', () => {
    renderPage('test-project');
    expect(screen.getByTestId('project-selector')).toHaveTextContent('test-project');
  });

  describe('when EvalHub service is unavailable', () => {
    beforeEach(() => {
      mockUseEvalHubHealth.mockReturnValue({ isHealthy: false, loaded: true, error: undefined });
    });

    describe('when user is a cluster admin', () => {
      beforeEach(() => {
        mockUseUser.mockReturnValue({ clusterAdmin: true });
      });

      it('should show the admin unavailable empty state', () => {
        renderPage('test-project');
        expect(screen.getByTestId('evalhub-unavailable-empty-state')).toBeInTheDocument();
      });

      it('should display the correct admin unavailable message', () => {
        renderPage('test-project');
        expect(
          screen.getByText(
            /To use evaluations, enable the evaluation service using the TrustyAI Operator/,
          ),
        ).toBeInTheDocument();
      });
    });

    describe('when user is not a cluster admin', () => {
      beforeEach(() => {
        mockUseUser.mockReturnValue({ clusterAdmin: false });
      });

      it('should show the non-admin empty state', () => {
        renderPage('test-project');
        expect(screen.getByTestId('evalhub-nonadmin-empty-state')).toBeInTheDocument();
      });

      it('should display the correct non-admin message', () => {
        renderPage('test-project');
        expect(
          screen.getByText(
            /To use this service, request that your administrator enable evaluations for this cluster/,
          ),
        ).toBeInTheDocument();
      });

      it('should show the Who is my administrator link', () => {
        renderPage('test-project');
        expect(screen.getByTestId('whos-my-administrator')).toBeInTheDocument();
      });
    });
  });

  describe('when the health check fails with a real error', () => {
    it('should not show the unavailable empty state', () => {
      mockUseEvalHubHealth.mockReturnValue({
        isHealthy: false,
        loaded: true,
        error: new Error('Network Error'),
      });
      renderPage('test-project');
      expect(screen.queryByTestId('evalhub-unavailable-empty-state')).not.toBeInTheDocument();
    });
  });

  describe('when EvalHub service is healthy', () => {
    it('should show empty state when there are no evaluation runs', () => {
      renderPage('test-project');
      selectRunsTab();
      expect(screen.getByTestId('eval-hub-empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('runs-tab-description')).not.toBeInTheDocument();
    });

    it('should render the evaluations table when evaluations exist', () => {
      const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
      mockUseEvaluationJobs.mockReturnValue([jobs, true, undefined, mockRefresh]);
      renderPage('test-project');
      selectRunsTab();

      expect(screen.queryByTestId('eval-hub-empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    });

    it('should clear the selected job when navigating to a different namespace', async () => {
      const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'failed' })];
      mockUseEvaluationJobs.mockReturnValue([jobs, true, undefined, mockRefresh]);

      const NavigateHelper: React.FC = () => {
        const navigate = useNavigate();
        return (
          <button data-testid="navigate-ns-b" onClick={() => navigate('/ns-b')}>
            Go to ns-b
          </button>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/ns-a']}>
            <LocationDisplay />
            <NavigateHelper />
            <Routes>
              <Route path="/:namespace" element={<EvaluationsPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      selectRunsTab();
      const statusLabel = screen.getByTestId('evaluation-status-button');
      fireEvent.click(within(statusLabel).getByRole('button'));
      await waitFor(() => {
        expect(screen.getByTestId('evaluation-status-modal')).toBeInTheDocument();
      });
      expect(screen.getByTestId('evaluation-status-modal')).toHaveAttribute(
        'data-namespace',
        'ns-a',
      );

      fireEvent.click(screen.getByTestId('navigate-ns-b'));
      await waitFor(() => {
        expect(screen.queryByTestId('evaluation-status-modal')).not.toBeInTheDocument();
      });
    });
  });
});
