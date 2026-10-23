import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import CompareEvaluationsPage from '~/app/pages/CompareEvaluationsPage';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

jest.mock('mod-arch-core', () => ({
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone' },
  useModularArchContext: () => ({ config: { deploymentMode: 'federated' } }),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-project', displayName: 'Test Project' }],
    namespacesLoaded: true,
  }),
}));

let mockRemoteAvailable = true;

jest.mock('~/app/components/MlflowCompareRuns', () => {
  const reactModule = require('react');
  const MlflowCompareRuns = ({
    experimentIds,
    runUuids,
    onRemoteReady,
  }: {
    experimentIds: string[];
    runUuids: string[];
    onRemoteReady?: (available: boolean) => void;
  }) => {
    reactModule.useEffect(() => {
      onRemoteReady?.(mockRemoteAvailable);
    }, [onRemoteReady]);
    return (
      <div data-testid="mlflow-compare-runs">
        {experimentIds.join(',')}|{runUuids.join(',')}
      </div>
    );
  };
  MlflowCompareRuns.displayName = 'MlflowCompareRuns';
  return MlflowCompareRuns;
});

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const renderPage = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/:namespace/compare-runs" element={<CompareEvaluationsPage />} />
      </Routes>
    </MemoryRouter>,
  );

const validCompareUrl = (runs: string[], experiments: string[]): string =>
  `/test-project/compare-runs?runs=${encodeURIComponent(JSON.stringify(runs))}&experiments=${encodeURIComponent(
    JSON.stringify(experiments),
  )}`;

describe('CompareEvaluationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoteAvailable = true;
  });

  it('should show empty state when params are missing', () => {
    renderPage('/test-project/compare-runs');
    expect(screen.queryByTestId('mlflow-compare-runs')).not.toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should render compare using runs and experiments params', () => {
    renderPage(validCompareUrl(['run-1', 'run-2'], ['exp-1', 'exp-2']));

    expect(screen.getByTestId('mlflow-compare-runs')).toHaveTextContent('exp-1,exp-2|run-1,run-2');
  });

  it('should track comparison view rendered once the remote compare UI renders', () => {
    renderPage(validCompareUrl(['run-3', 'run-4'], ['exp-3', 'exp-4']));

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(1);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED,
      expect.objectContaining({ surface: 'comparison_view', countOfRuns: 2 }),
    );
  });

  it('should not track comparison view rendered when the compare UI is unavailable', () => {
    mockRemoteAvailable = false;

    renderPage(validCompareUrl(['run-5', 'run-6'], ['exp-5', 'exp-6']));

    expect(screen.getByTestId('mlflow-compare-runs')).toBeInTheDocument();
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });
});
