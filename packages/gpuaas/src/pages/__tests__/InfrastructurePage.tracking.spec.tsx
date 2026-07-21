import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { GPUAAS_EVENTS } from '../../tracking/gpuaasTrackingConstants';
import type { ClusterMetrics } from '../../hooks/useInfrastructureMetrics';
import InfrastructurePage from '../InfrastructurePage';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  SupportedArea: { KUEUE: 'kueue' },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () => {
  const ApplicationsPage: React.FC<{
    children: React.ReactNode;
    headerAction?: React.ReactNode;
  }> = ({ children, headerAction }) => (
    <div data-testid="applications-page">
      {headerAction}
      {children}
    </div>
  );
  return { __esModule: true, default: ApplicationsPage };
});

jest.mock('@odh-dashboard/internal/utilities/time', () => ({
  relativeTime: () => 'a few seconds ago',
}));

const mockRefresh = jest.fn();
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
  default: () => mockCurrentMetrics,
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
  default: () => <div data-testid="borrowing-lending" />,
}));

jest.mock('../../components/ClusterQueueUtilizationSection', () => ({
  __esModule: true,
  default: () => <div data-testid="cluster-queue" />,
}));

const mockFireMisc = jest.mocked(fireMiscTrackingEvent);
const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

describe('InfrastructurePage - Tracking Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentMetrics = { ...mockMetrics, refresh: mockRefresh };
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: null,
      featureFlags: null,
      reliantAreas: null,
      requiredComponents: null,
      requiredCapabilities: null,
      customCondition: () => false,
    });
  });

  describe('Infrastructure Page Viewed', () => {
    it('fires page-viewed event when metrics are loaded', async () => {
      render(<InfrastructurePage />);

      await waitFor(() => {
        expect(mockFireMisc).toHaveBeenCalledWith(
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
      const { rerender } = render(<InfrastructurePage />);

      await waitFor(() => {
        expect(mockFireMisc).toHaveBeenCalledTimes(1);
      });

      rerender(<InfrastructurePage />);

      expect(mockFireMisc).toHaveBeenCalledTimes(1);
    });

    it('does not fire page-viewed when metrics are not loaded', () => {
      mockCurrentMetrics = { ...mockMetrics, loaded: false, refresh: mockRefresh };
      render(<InfrastructurePage />);

      expect(mockFireMisc).not.toHaveBeenCalledWith(GPUAAS_EVENTS.PAGE_VIEWED, expect.anything());
    });
  });

  describe('Infrastructure Data Refreshed', () => {
    it('fires data-refreshed event on refresh button click', async () => {
      const user = userEvent.setup();
      render(<InfrastructurePage />);

      const refreshButton = screen.getByRole('button', { name: 'Refresh page data' });
      await user.click(refreshButton);

      expect(mockFireMisc).toHaveBeenCalledWith(GPUAAS_EVENTS.DATA_REFRESHED, expect.any(Object));
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('includes secondsSinceLastUpdate when lastRefreshed is available', async () => {
      const user = userEvent.setup();
      mockCurrentMetrics = {
        ...mockMetrics,
        lastRefreshed: new Date(Date.now() - 30_000),
        refresh: mockRefresh,
      };
      render(<InfrastructurePage />);

      const refreshButton = screen.getByRole('button', { name: 'Refresh page data' });
      await user.click(refreshButton);

      expect(mockFireMisc).toHaveBeenCalledWith(
        GPUAAS_EVENTS.DATA_REFRESHED,
        expect.objectContaining({
          secondsSinceLastUpdate: expect.any(Number),
        }),
      );
    });
  });
});
