import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import WorkloadOverview from '../WorkloadOverview';
import { GPUAAS_EVENTS } from '../../tracking/gpuaasTrackingConstants';
import type { WorkloadOverviewRow } from '../../utils/workloadOverview';

jest.mock('react', () => ({
  ...jest.requireActual<typeof React>('react'),
  lazy: () => () => null,
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('../../hooks/useWorkloadAdmissionMetrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    admissionRate: { value: 0, data: [] },
    admissionLeadTime: { value: null, data: [] },
    waitingWorkloads: { value: 1, data: [] },
    activeWorkloads: { value: 1, data: [] },
    loaded: true,
    error: undefined,
  })),
}));

const mockFireMisc = jest.mocked(fireMiscTrackingEvent);
const mockPopoverClosed = jest.fn();
const workloads: WorkloadOverviewRow[] = [
  { bucket: 'active', detail: 'running', statusFilters: ['Running'] },
  { bucket: 'waiting', detail: 'queued', statusFilters: ['Queued'] },
];

describe('WorkloadOverview tracking events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderOverview = () =>
    render(
      <WorkloadOverview
        workloads={workloads}
        loaded
        kueueAvailable
        canAccessAdminMetrics
        onPopoverClosed={mockPopoverClosed}
        onViewInTable={jest.fn()}
        onViewInTableClicked={(overviewSegment) =>
          fireMiscTrackingEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_VIEW_IN_TABLE_CLICKED, {
            overviewSegment,
          })
        }
        onStatusOverviewSegmentClick={(statusClicked) =>
          fireMiscTrackingEvent(GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_SEGMENT_CLICKED, {
            statusClicked,
          })
        }
      />,
    );

  it('tracks status segment clicks and section toggles', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByTestId('workload-segment-active'));
    await user.click(screen.getByRole('button', { name: /Workload overview/i }));

    expect(mockFireMisc).toHaveBeenCalledWith(
      GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_SEGMENT_CLICKED,
      { statusClicked: 'active' },
    );
    expect(mockFireMisc).toHaveBeenCalledWith(GPUAAS_EVENTS.WORKLOADS_TAB_SECTION_TOGGLED, {
      sectionName: 'workload-overview',
      action: 'collapse',
    });
  });

  it.each([
    ['status', 'status'],
    ['admissions', 'admission'],
  ] as const)('tracks overview tab selection: %s', async (tab, tabName) => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(
      screen.getByRole('tab', { name: tab === 'admissions' ? 'Admissions' : 'Status' }),
    );

    expect(mockFireMisc).toHaveBeenCalledWith(GPUAAS_EVENTS.WORKLOADS_TAB_OVERVIEW_TAB_SELECTED, {
      tabName,
    });
  });

  it('tracks view-in-table clicks with the selected overview segment', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByTestId('workload-count-active'));
    await user.click(screen.getByRole('button', { name: 'View in table' }));

    expect(mockFireMisc).toHaveBeenCalledWith(
      GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_VIEW_IN_TABLE_CLICKED,
      { overviewSegment: 'active' },
    );
  });

  it.each(['close-button', 'outside-click', 'escape'] as const)(
    'should report one popover dismissal with close method %s',
    async (closeMethod) => {
      const user = userEvent.setup();
      renderOverview();
      await user.click(screen.getByTestId('workload-segment-active'));
      const closeButton = await screen.findByRole('button', {
        name: 'Close workload status overview',
      });

      if (closeMethod === 'close-button') {
        // Exercise the nested icon target as well as the button's close callback.
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        closeButton.appendChild(icon);
        fireEvent.click(icon);
      } else if (closeMethod === 'escape') {
        await user.keyboard('{Escape}');
      } else {
        await user.click(document.body);
      }

      expect(mockPopoverClosed).toHaveBeenCalledTimes(1);
      expect(mockPopoverClosed).toHaveBeenCalledWith('active', closeMethod);
    },
  );

  it.each(['count', 'segment'] as const)(
    'should not report a dismissal when switching to a %s trigger',
    async (source) => {
      const user = userEvent.setup();
      renderOverview();
      await user.click(screen.getByTestId('workload-count-active'));
      const trigger = screen.getByTestId(`workload-${source}-waiting`);

      // Production detection must not depend on test IDs or the exact clicked child.
      trigger.removeAttribute('data-testid');
      const target = source === 'count' ? within(trigger).getByText('Waiting') : trigger;
      await user.click(target);

      expect(mockPopoverClosed).not.toHaveBeenCalled();
      expect(mockFireMisc).toHaveBeenLastCalledWith(
        GPUAAS_EVENTS.WORKLOADS_TAB_STATUS_OVERVIEW_SEGMENT_CLICKED,
        { statusClicked: 'waiting' },
      );
    },
  );
});
