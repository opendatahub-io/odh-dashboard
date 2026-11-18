import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuotaUsageDetailPanel from '../QuotaUsageDetailPanel';
import useClusterQueueWorkloads from '../../../hooks/useClusterQueueWorkloads';
import useKueueProjectsForClusterQueue from '../../../hooks/useKueueProjectsForClusterQueue';
import { useClusterQueueBorrowingSince } from '../../../hooks/useBorrowingLendingMetrics';
import type { QuotaUsageDetailData } from '../../../hooks/useQuotaUsageDetail';
import { createTrackingWrapper } from '../../../__tests__/unit/testUtils/TrackingProvider';
import { buildCohortOnlyQuotaTree, makeCQ } from '../../../utils/__tests__/quotaHierarchyFixtures';
import type { QuotaSelection } from '../../../types';

jest.mock('../../../hooks/useClusterQueueWorkloads', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../../hooks/useKueueProjectsForClusterQueue', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../../hooks/useBorrowingLendingMetrics', () => ({
  ...jest.requireActual('../../../hooks/useBorrowingLendingMetrics'),
  useClusterQueueBorrowingSince: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockTrackPageEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent, mockTrackPageEvent);
const selection: QuotaSelection = {
  type: 'clusterQueue',
  clusterQueueName: 'prod-serving',
  clusterQueue: makeCQ('prod-serving', 'production'),
  path: ['production', 'prod-serving'],
};
const makeDetail = (): QuotaUsageDetailData => ({
  summary: {
    admittedWorkloads: 0,
    pendingWorkloads: 0,
    workloadSummaryLine: '0 active, 0 pending',
    totalNominal: 8,
    totalUsed: 10,
    totalBorrowed: 2,
    capacityDisplayNominal: 8,
    computeUtilization: 50,
    memoryUtilization: 25,
    isOverQuota: true,
    isBorrowing: true,
    borrowingEnabled: true,
    showBorrowingInfo: true,
    borrowSourceCohortName: 'production',
    borrowingClusterQueues: [],
  },
  acceleratorRows: [],
  showKueueProjectsLink: true,
  clusterQueueName: 'prod-serving',
});

const renderDetail = (loaded = true) => {
  const onSelectionChange = jest.fn();
  const detail = makeDetail();
  const element = (detailLoaded: boolean) => (
    <MemoryRouter>
      <QuotaUsageDetailPanel
        tree={buildCohortOnlyQuotaTree()}
        selection={selection}
        onSelectionChange={onSelectionChange}
        detail={detail}
        detailLoaded={detailLoaded}
        tabLoadedAt={{ current: Date.now() - 10_000 }}
      />
    </MemoryRouter>
  );
  return { ...render(element(loaded), { wrapper: TrackingWrapper }), element, onSelectionChange };
};

describe('QuotaUsageDetailPanel tracking', () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useClusterQueueWorkloads).mockReturnValue({
      workloads: [],
      loaded: true,
      error: undefined,
      isEmpty: true,
      refresh: jest.fn(),
    });
    jest.mocked(useKueueProjectsForClusterQueue).mockReturnValue({
      data: [{ name: 'private-project-a' }, { name: 'private-project-b' }],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    jest
      .mocked(useClusterQueueBorrowingSince)
      .mockReturnValue({ borrowingSinceMs: undefined, loaded: true });
  });

  it('should preserve breadcrumb selection and its two events', () => {
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    const { onSelectionChange } = renderDetail();
    fireEvent.click(screen.getByTestId('quota-usage-breadcrumb-production'));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith({
      type: 'cohort',
      cohortName: 'production',
      path: ['production'],
    });
    expect(mockTrackEvent.mock.calls).toEqual([
      [
        'Infrastructure Cohort Breadcrumb Selected',
        { breadcrumbLevel: 1, targetNodeType: 'cohort' },
      ],
      [
        'Infrastructure Quota Usage Tab Interacted',
        { interactionType: 'breadcrumb', secondsSinceTabLoad: 10 },
      ],
    ]);
  });

  it('should emit project count once after loading without adding names or render events', () => {
    const { rerender, element } = renderDetail(false);
    rerender(element(true));
    expect(mockTrackEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('quota-usage-view-kueue-projects'));
    rerender(element(true));
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Infrastructure View Kueue Projects Selected', { projectCount: 2 }],
    ]);
    expect(mockTrackPageEvent).not.toHaveBeenCalled();
  });

  it('should preserve borrowing popover telemetry and summary toggle counts', () => {
    renderDetail();
    fireEvent.click(screen.getByTestId('quota-usage-borrowing-link'));
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Infrastructure Borrowing Popover Link Selected', { gpusBorrowing: 2 }],
      [
        'Infrastructure Quota Usage Detail Section Toggled',
        { sectionName: 'summary', isExpanded: false, nodeType: 'cluster-queue' },
      ],
    ]);
  });
});
