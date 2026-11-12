import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { createTrackingWrapper } from '../../__tests__/unit/testUtils/TrackingProvider';
import { GPUAAS_EVENTS } from '../../tracking/gpuaasTrackingConstants';
import type { ClusterMetrics } from '../../hooks/useInfrastructureMetrics';
import InfrastructurePage from '../InfrastructurePage';

type InfrastructureLocationState = {
  tab?: string;
};

const mockUseLocation = jest.fn(() => ({
  state: undefined as InfrastructureLocationState | undefined,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { KUEUE: 'kueue' },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed', () => ({
  useAccessAllowed: jest.fn(),
}));

jest.mock('../../components/InfrastructureKueueHelpLink', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@odh-dashboard/ui-core', () => {
  const ApplicationsPage: React.FC<{
    children: React.ReactNode;
    headerAction?: React.ReactNode;
  }> = ({ children, headerAction }) => (
    <div data-testid="applications-page">
      {headerAction}
      {children}
    </div>
  );
  return { ApplicationsPage };
});

jest.mock('@odh-dashboard/internal/utilities/time', () => ({
  relativeTime: () => 'Just now',
}));

const mockRefresh = jest.fn();
const mockBorrowingRefresh = jest.fn();
const mockQuotaRefresh = jest.fn();
const mockMetrics: ClusterMetrics = {
  accelerators: { total: 8, inUse: 3 },
  computeUtilization: { percentage: 65 },
  memoryUtilization: { percentage: 42 },
  hardwareUsage: null,
  clusterLoaded: true,
  hardwareLoaded: true,
  loaded: true,
  lastRefreshed: new Date(),
  refresh: mockRefresh,
};

let mockCurrentMetrics = { ...mockMetrics };

jest.mock('../../hooks/useInfrastructureMetrics', () => ({
  __esModule: true,
  default: jest.fn(() => mockCurrentMetrics),
}));

jest.mock('../../components/ClusterSummaryCards', () => ({
  __esModule: true,
  default: () => <div data-testid="cluster-summary" />,
}));

jest.mock('../../components/HardwareUsageSection', () => ({
  __esModule: true,
  default: () => <div data-testid="hardware-usage" />,
}));

jest.mock('../../components/BorrowingLendingSection', () => ({
  __esModule: true,
  default: function BorrowingLendingSectionMock({
    onRegisterRefresh,
  }: {
    onRegisterRefresh?: (refresh: () => void) => void;
  }) {
    jest.requireActual<typeof React>('react').useEffect(() => {
      onRegisterRefresh?.(mockBorrowingRefresh);
    }, [onRegisterRefresh]);
    return <div data-testid="borrowing" />;
  },
}));

jest.mock('../../hooks/useQuotaHierarchy', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: { tree: [] },
    loaded: true,
    lastRefreshed: new Date(),
    refresh: mockQuotaRefresh,
  })),
}));

jest.mock('../../components/QuotaUsageSection', () => ({
  __esModule: true,
  default: () => <div data-testid="quota-usage" />,
}));

const mockTrackEvent = jest.fn();
const mockTrackPageEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent, mockTrackPageEvent);
const renderTracked = (element: React.ReactElement) =>
  render(element, { wrapper: TrackingWrapper });
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);
const mockUseAccessAllowed = jest.mocked(useAccessAllowed);
const mockUseInfrastructureMetrics = jest.requireMock('../../hooks/useInfrastructureMetrics')
  .default as jest.Mock;
const mockUseQuotaHierarchy = jest.requireMock('../../hooks/useQuotaHierarchy')
  .default as jest.Mock;

describe('InfrastructurePage - Tracking Events', () => {
  afterEach(() => expect(mockTrackPageEvent).not.toHaveBeenCalled());
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentMetrics = { ...mockMetrics, refresh: mockRefresh };
    mockUseLocation.mockReturnValue({ state: undefined });
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: null,
      featureFlags: null,
      reliantAreas: null,
      requiredComponents: null,
      requiredCapabilities: null,
      customCondition: () => false,
    });
    mockUseAccessAllowed.mockReturnValue([true, true]);
  });

  describe('Infrastructure Page Viewed', () => {
    it('fires page-viewed event when metrics are loaded', async () => {
      renderTracked(<InfrastructurePage />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          GPUAAS_EVENTS.PAGE_VIEWED,
          expect.objectContaining({
            path: '/observe-and-monitor/infrastructure',
            sectionCount: 4,
            hasKueueEnabled: true,
            totalAccelerators: 8,
            acceleratorsInUse: 3,
            totalUtilizationPct: 38,
            avgComputeUtilPct: 65,
            avgMemoryUtilPct: 42,
          }),
        );
      });
    });

    it('fires page-viewed only once even if metrics update', async () => {
      const { rerender } = renderTracked(<InfrastructurePage />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      });

      mockCurrentMetrics = { ...mockCurrentMetrics, accelerators: { total: 16, inUse: 4 } };
      rerender(<InfrastructurePage />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('fires page-viewed for non-admin users without metrics', async () => {
      mockCurrentMetrics = { ...mockMetrics, loaded: false, refresh: mockRefresh };
      mockUseAccessAllowed.mockReturnValue([false, true]);
      renderTracked(<InfrastructurePage />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          GPUAAS_EVENTS.PAGE_VIEWED,
          expect.objectContaining({
            path: '/observe-and-monitor/infrastructure',
            sectionCount: 4,
            hasKueueEnabled: true,
          }),
        );
      });
    });

    it('does not fire page-viewed for admin users until metrics are loaded', () => {
      mockCurrentMetrics = { ...mockMetrics, loaded: false, refresh: mockRefresh };
      renderTracked(<InfrastructurePage />);

      expect(mockTrackEvent).not.toHaveBeenCalledWith(GPUAAS_EVENTS.PAGE_VIEWED, expect.anything());
    });
  });

  it('should track quota view once per visit, preserving its literal payload', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTracked(<InfrastructurePage />);
    mockTrackEvent.mockClear();
    await user.click(screen.getByTestId('infrastructure-tab-quota-usage'));
    rerender(<InfrastructurePage />);
    const viewedEvent = [
      'Infrastructure Quota Usage Tab Viewed',
      {
        path: '/observe-and-monitor/infrastructure',
        tabName: 'quota-usage',
        cohortCount: 0,
        clusterQueueCount: 0,
        hasUnassignedBucket: false,
        hasKueueEnabled: true,
      },
    ];
    expect(mockTrackEvent.mock.calls).toEqual([viewedEvent]);
    await user.click(screen.getByTestId('infrastructure-tab-utilization'));
    await user.click(screen.getByTestId('infrastructure-tab-quota-usage'));
    expect(mockTrackEvent.mock.calls).toEqual([viewedEvent, viewedEvent]);
  });

  describe('Infrastructure access failures', () => {
    it('passes access loading state to quota hierarchy', () => {
      mockUseAccessAllowed.mockReturnValue([false, false]);

      renderTracked(<InfrastructurePage />);

      expect(mockUseInfrastructureMetrics).toHaveBeenCalledWith(false);
      expect(mockUseQuotaHierarchy).toHaveBeenCalledWith(false, false);
    });

    it('keeps admin content disabled when access is denied', () => {
      mockUseAccessAllowed.mockReturnValue([false, true]);

      renderTracked(<InfrastructurePage />);

      expect(screen.getByTestId('infrastructure-tab-workloads')).toBeInTheDocument();
      expect(screen.queryByTestId('infrastructure-tab-utilization')).not.toBeInTheDocument();
      expect(screen.queryByTestId('infrastructure-tab-quota-usage')).not.toBeInTheDocument();
      expect(mockUseInfrastructureMetrics).toHaveBeenCalledWith(false);
      expect(mockUseQuotaHierarchy).toHaveBeenCalledWith(false, true);
    });
  });

  it('selects the Workloads tab from location state after access loads', async () => {
    mockUseLocation.mockReturnValue({ state: { tab: 'workloads' } });

    renderTracked(<InfrastructurePage />);

    await waitFor(() => {
      expect(screen.getByTestId('infrastructure-tab-workloads')).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  describe('Infrastructure Data Refresh', () => {
    it('renders just now with lowercase after the Updated prefix', () => {
      renderTracked(<InfrastructurePage />);

      expect(screen.getByText('Updated just now')).toBeInTheDocument();
      expect(screen.queryByText('Updated Just now')).not.toBeInTheDocument();
    });

    it('refreshes active tab data after switching tabs', async () => {
      const user = userEvent.setup();
      renderTracked(<InfrastructurePage />);

      await user.click(screen.getByTestId('infrastructure-tab-quota-usage'));
      await waitFor(() => expect(mockQuotaRefresh).toHaveBeenCalled());

      const utilizationRefreshCount = mockRefresh.mock.calls.length;
      await user.click(screen.getByTestId('infrastructure-tab-utilization'));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(utilizationRefreshCount + 1);
        expect(mockBorrowingRefresh).toHaveBeenCalled();
      });
    });

    it('refreshes utilization and borrowing metrics on refresh button click', async () => {
      const user = userEvent.setup();
      renderTracked(<InfrastructurePage />);

      const refreshButton = within(screen.getByTestId('infrastructure-refresh-badge')).getByRole(
        'button',
        { name: 'Refresh' },
      );
      mockTrackEvent.mockClear();
      await user.click(refreshButton);

      expect(mockTrackEvent.mock.calls).toEqual([
        [
          'Infrastructure Data Refreshed',
          {
            refreshSource: 'utilization',
            outcome: 'click',
            secondsSinceLastUpdate: expect.any(Number),
          },
        ],
      ]);
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockBorrowingRefresh).toHaveBeenCalled();
    });

    it('tracks workloads refresh on refresh button click', async () => {
      const user = userEvent.setup();
      renderTracked(<InfrastructurePage />);

      await user.click(screen.getByTestId('infrastructure-tab-workloads'));
      const refreshButton = within(
        screen.getByTestId('infrastructure-workloads-refresh'),
      ).getByRole('button', { name: 'Refresh' });
      mockTrackEvent.mockClear();
      await user.click(refreshButton);

      expect(mockTrackEvent.mock.calls).toEqual([
        [
          'Infrastructure Data Refreshed',
          {
            refreshSource: 'workloads',
            outcome: 'click',
            secondsSinceLastUpdate: expect.any(Number),
          },
        ],
        [
          'Workloads Tab Interacted',
          { interactionType: 'refresh', secondsSinceTabLoad: expect.any(Number) },
        ],
      ]);
    });

    it('tracks quota usage refresh on refresh button click', async () => {
      const user = userEvent.setup();
      renderTracked(<InfrastructurePage />);

      await user.click(screen.getByTestId('infrastructure-tab-quota-usage'));
      const refreshButton = within(screen.getByTestId('quota-usage-refresh-badge')).getByRole(
        'button',
        { name: 'Refresh' },
      );
      mockTrackEvent.mockClear();
      await user.click(refreshButton);

      expect(mockTrackEvent.mock.calls).toEqual([
        [
          'Infrastructure Data Refreshed',
          {
            refreshSource: 'quota-usage',
            outcome: 'click',
            secondsSinceLastUpdate: expect.any(Number),
          },
        ],
        [
          'Infrastructure Quota Usage Tab Interacted',
          { interactionType: 'refresh', secondsSinceTabLoad: expect.any(Number) },
        ],
      ]);
    });

    it('includes secondsSinceLastUpdate when lastRefreshed is available', async () => {
      const user = userEvent.setup();
      mockCurrentMetrics = {
        ...mockMetrics,
        lastRefreshed: new Date(Date.now() - 30_000),
        refresh: mockRefresh,
      };
      renderTracked(<InfrastructurePage />);

      const refreshButton = within(screen.getByTestId('infrastructure-refresh-badge')).getByRole(
        'button',
        { name: 'Refresh' },
      );
      await user.click(refreshButton);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        GPUAAS_EVENTS.DATA_REFRESHED,
        expect.objectContaining({
          secondsSinceLastUpdate: expect.any(Number),
        }),
      );
    });
  });
});
