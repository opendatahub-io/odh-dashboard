import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-project' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
  }),
  useFetchState: jest.fn().mockReturnValue([null, false, undefined]),
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
    mockUseEvalHubHealth.mockReturnValue({ isHealthy: true, loaded: true, error: undefined });
    mockUseEvaluationJobs.mockReturnValue([[], true, undefined, mockRefresh]);
  });

  it('should render the page with correct title and description', () => {
    renderPage('test-project');
    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
  });

  it('should render the project selector with the current namespace', () => {
    renderPage('test-project');
    expect(screen.getByTestId('project-selector')).toHaveTextContent('test-project');
  });

  describe('when EvalHub service is unavailable', () => {
    beforeEach(() => {
      mockUseEvalHubHealth.mockReturnValue({ isHealthy: false, loaded: true, error: undefined });
    });

    it('should show the unavailable empty state', () => {
      renderPage('test-project');
      expect(screen.getByTestId('evalhub-unavailable-empty-state')).toBeInTheDocument();
    });

    it('should display the correct unavailable message', () => {
      renderPage('test-project');
      expect(
        screen.getByText(
          /To use evaluations, enable the evaluation service using the TrustyAI Operator/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('when EvalHub service is healthy', () => {
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
