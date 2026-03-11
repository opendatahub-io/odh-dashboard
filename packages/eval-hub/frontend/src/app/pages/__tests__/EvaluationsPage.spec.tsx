import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EvalHubCRStatus, EvaluationJob } from '~/app/types';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import EvaluationsPage from '~/app/pages/EvaluationsPage';

const mockRefresh = jest.fn();
const mockUseEvaluationJobs = jest.fn<
  [EvaluationJob[], boolean, Error | undefined, jest.Mock],
  []
>();

const mockUseFetchEvalHubStatus = jest.fn<
  { data: EvalHubCRStatus | null; loaded: boolean; error: Error | undefined; refresh: jest.Mock },
  []
>();

jest.mock('~/app/hooks/useEvaluationJobs', () => ({
  useEvaluationJobs: () => mockUseEvaluationJobs(),
}));

jest.mock('~/app/hooks/useFetchEvalHubStatus', () => ({
  __esModule: true,
  default: () => mockUseFetchEvalHubStatus(),
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

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () =>
  require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
);

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectIconWithSizeModule(),
);

jest.mock('@odh-dashboard/internal/types', () =>
  require('~/__tests__/unit/testUtils/mocks').mockIconSizeModule(),
);

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectSelector', () =>
  require('~/__tests__/unit/testUtils/mocks').mockProjectSelectorModule(),
);

const mockCRStatus = (phase: string): EvalHubCRStatus => ({
  name: 'evalhub-instance',
  namespace: 'test-project',
  phase: phase as EvalHubCRStatus['phase'],
  ready: phase === 'Ready' ? 'True' : 'False',
  readyReplicas: phase === 'Ready' ? 1 : 0,
  replicas: 1,
});

describe('EvaluationsPage', () => {
  const renderPage = (namespace: string) =>
    render(
      <MemoryRouter initialEntries={[`/${namespace}`]}>
        <Routes>
          <Route path="/:namespace" element={<EvaluationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchEvalHubStatus.mockReturnValue({
      data: mockCRStatus('Ready'),
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockUseEvaluationJobs.mockReturnValue([[], true, undefined, mockRefresh]);
  });

  it('should render the page with correct title and description', () => {
    renderPage('test-project');
    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Run evaluations on models, agents, and datasets to optimize performance.',
    );
  });

  it('should render the project selector with the current namespace', () => {
    renderPage('test-project');
    expect(screen.getByTestId('project-selector')).toHaveTextContent('test-project');
  });

  describe('when CR is not found (null)', () => {
    beforeEach(() => {
      mockUseFetchEvalHubStatus.mockReturnValue({
        data: null,
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
    });

    it('should show the not-found empty state', () => {
      renderPage('test-project');
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('evalhub-not-found-empty-state')).toBeInTheDocument();
    });

    it('should display the correct empty state message', () => {
      renderPage('test-project');
      expect(screen.getByText(/The evaluation service is not enabled/)).toBeInTheDocument();
    });
  });

  describe('when CR phase is Initializing', () => {
    beforeEach(() => {
      mockUseFetchEvalHubStatus.mockReturnValue({
        data: mockCRStatus('Initializing'),
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
    });

    it('should show the initializing state', () => {
      renderPage('test-project');
      expect(screen.getByTestId('evalhub-initializing-state')).toBeInTheDocument();
    });

    it('should display the initializing message', () => {
      renderPage('test-project');
      expect(screen.getByText(/EvalHub is being initialized/)).toBeInTheDocument();
    });
  });

  describe('when CR phase is Failed', () => {
    beforeEach(() => {
      mockUseFetchEvalHubStatus.mockReturnValue({
        data: mockCRStatus('Failed'),
        loaded: true,
        error: undefined,
        refresh: jest.fn(),
      });
    });

    it('should show the failed state', () => {
      renderPage('test-project');
      expect(screen.getByTestId('evalhub-failed-state')).toBeInTheDocument();
    });

    it('should display the failed message', () => {
      renderPage('test-project');
      expect(screen.getByText(/failed to initialize/)).toBeInTheDocument();
    });
  });

  describe('when CR phase is Ready', () => {
    it('should show empty state when there are no evaluation runs', () => {
      renderPage('test-project');
      expect(screen.getByTestId('eval-hub-empty-state')).toBeInTheDocument();
    });

    it('should render the evaluations table when evaluations exist', () => {
      const jobs = [mockEvaluationJob({ id: 'job-1', name: 'Test Eval', state: 'completed' })];
      mockUseEvaluationJobs.mockReturnValue([jobs, true, undefined, mockRefresh]);
      renderPage('test-project');

      expect(screen.queryByTestId('eval-hub-empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('evaluations-table')).toBeInTheDocument();
    });
  });
});
