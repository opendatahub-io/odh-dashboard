import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CompareEvaluationsPage from '~/app/pages/CompareEvaluationsPage';

jest.mock('mod-arch-core', () => ({
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone' },
  useModularArchContext: () => ({ config: { deploymentMode: 'federated' } }),
}));

jest.mock('~/app/components/MlflowCompareRuns', () => {
  const MlflowCompareRuns = (props: { experimentIds: string[]; runUuids: string[] }) => (
    <div data-testid="mlflow-compare-runs">
      {props.experimentIds.join(',')}|{props.runUuids.join(',')}
    </div>
  );
  MlflowCompareRuns.displayName = 'MlflowCompareRuns';
  return MlflowCompareRuns;
});

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () =>
  require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
);

const renderPage = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/:namespace/compare-runs" element={<CompareEvaluationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CompareEvaluationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state when params are missing', () => {
    renderPage('/test-project/compare-runs');
    expect(screen.queryByTestId('mlflow-compare-runs')).not.toBeInTheDocument();
  });

  it('should render compare using runs and experiments params', () => {
    const runsParam = encodeURIComponent(JSON.stringify(['run-1', 'run-2']));
    const experimentsParam = encodeURIComponent(JSON.stringify(['exp-1', 'exp-2']));
    renderPage(`/test-project/compare-runs?runs=${runsParam}&experiments=${experimentsParam}`);

    expect(screen.getByTestId('mlflow-compare-runs')).toHaveTextContent('exp-1,exp-2|run-1,run-2');
  });
});
