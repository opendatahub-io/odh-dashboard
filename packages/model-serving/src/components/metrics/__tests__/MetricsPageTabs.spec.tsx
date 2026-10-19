import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import {
  AreaContext,
  SupportedArea,
  type IsAreaAvailableStatus,
} from '@odh-dashboard/plugin-core/areas';
import { TrustyInstallState } from '@odh-dashboard/trustyai/types';
import { useModelBiasData } from '@odh-dashboard/trustyai/hooks/useModelBiasData';
import useDoesTrustyAICRExist from '@odh-dashboard/trustyai/hooks/useDoesTrustyAICRExist';
import { mockInferenceServiceK8sResource } from '../../../__mocks__/mockInferenceServiceK8sResource';
import MetricsPageTabs from '../MetricsPageTabs';
import { useIsNIMModel } from '../useIsNIMModel';

jest.mock('../useIsNIMModel', () => ({ useIsNIMModel: jest.fn() }));
jest.mock('@odh-dashboard/trustyai/hooks/useModelBiasData', () => ({
  useModelBiasData: jest.fn(),
}));
jest.mock('@odh-dashboard/trustyai/hooks/useDoesTrustyAICRExist', () => jest.fn());
jest.mock('../performance/PerformanceTab', () => ({
  __esModule: true,
  default: () => <div data-testid="performance-content" />,
}));
jest.mock('../nim/NimTab', () => ({
  __esModule: true,
  default: () => <div data-testid="nim-content" />,
}));
jest.mock('../bias/BiasTab', () => ({ __esModule: true, default: () => null }));

const areaStatus = (status: boolean): IsAreaAvailableStatus => ({
  status,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredCapabilities: null,
  requiredComponents: null,
  customCondition: () => false,
});
const LocationDisplay: React.FC = () => (
  <span data-testid="current-path">{useLocation().pathname}</span>
);

const renderPage = (
  state: Partial<ReturnType<typeof useIsNIMModel>> = {},
  nimEnabled = true,
  performanceEnabled = true,
  tab = 'nim',
) => {
  jest.mocked(useIsNIMModel).mockReturnValue({
    isNIMModel: nimEnabled,
    loading: false,
    ...state,
  });
  return render(
    <AreaContext.Provider
      value={{
        dscStatus: null,
        dsciStatus: null,
        areasStatus: {
          [SupportedArea.PERFORMANCE_METRICS]: areaStatus(performanceEnabled),
          // No wizard, project, or integration provider is needed to identify NIM.
        },
      }}
    >
      <MemoryRouter initialEntries={[`/metrics/${tab}`]}>
        <LocationDisplay />
        <Routes>
          <Route path="/metrics" element={<Outlet />}>
            <Route
              path=":tab"
              element={<MetricsPageTabs model={mockInferenceServiceK8sResource({})} />}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AreaContext.Provider>,
  );
};

describe('MetricsPageTabs NIM identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useModelBiasData).mockReturnValue({
      biasMetricConfigs: [],
      statusState: { type: TrustyInstallState.UNINSTALLED },
      refresh: jest.fn(),
    });
    jest.mocked(useDoesTrustyAICRExist).mockReturnValue([false]);
  });
  it('should allow NIM without wizard, project annotation, or integration availability', () => {
    renderPage();
    expect(screen.getByTestId('nim-tab')).toBeInTheDocument();
    expect(screen.getByTestId('nim-content')).toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/metrics/nim');
  });
  it('should reject a plain KServe runtime', () => {
    renderPage({ isNIMModel: false });
    expect(screen.queryByTestId('nim-tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/metrics/performance');
  });
  it('should redirect when NIM model detection is unavailable', () => {
    renderPage({}, false);
    expect(screen.queryByTestId('nim-tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/metrics/performance');
  });
  it('should wait on a direct NIM URL rather than redirect during runtime loading', () => {
    renderPage({ isNIMModel: false, loading: true });
    expect(screen.getByLabelText('Loading available metrics tabs')).toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/metrics/nim');
  });
  it('should explain runtime read failures instead of redirecting silently', () => {
    renderPage({ error: new Error('Forbidden') });
    expect(screen.getByTestId('metrics-tabs-error')).toHaveTextContent('Forbidden');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/metrics/nim');
  });
  it('should keep known tabs usable while discovery is pending', () => {
    renderPage({ isNIMModel: false, loading: true }, true, true, 'performance');
    expect(screen.getByTestId('performance-content')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading available metrics tabs')).not.toBeInTheDocument();
  });
  it('should short-circuit on discovery errors even for a known tab', () => {
    renderPage({ error: new Error('Forbidden') }, true, true, 'performance');
    expect(screen.queryByTestId('performance-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('metrics-tabs-error')).toHaveTextContent('Forbidden');
  });
  it('should not redirect to undefined when all tabs are disabled', () => {
    renderPage({}, false, false);
    expect(screen.getByTestId('current-path')).toHaveTextContent('/metrics/nim');
    expect(screen.queryByTestId('nim-content')).not.toBeInTheDocument();
  });
  it('should render NIM content when it is the only enabled tab', () => {
    renderPage({}, true, false);
    expect(screen.getByTestId('nim-content')).toBeInTheDocument();
  });
});
