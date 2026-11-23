import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { createTrackingWrapper } from '../../__tests__/unit/testUtils/TrackingProvider';
import InfrastructureWorkloadsTable from '../InfrastructureWorkloadsTable';
import { GPUAAS_EVENTS } from '../../tracking/gpuaasTrackingConstants';

jest.mock('@odh-dashboard/model-training/components/TrainingJobStatusModal', () => () => null);
jest.mock('@odh-dashboard/model-training/components/RayJobStatusModal', () => () => null);
jest.mock('@odh-dashboard/model-serving/components/DeploymentStatusModal', () => () => null);
jest.mock('@odh-dashboard/internal/concepts/notebooks/StartNotebookModal', () => () => null);
jest.mock('@odh-dashboard/internal/pages/projects/ProjectDetailsContext', () => ({
  ProjectDetailsContext: jest.requireActual<typeof React>('react').createContext({}),
}));
jest.mock('@odh-dashboard/internal/utilities/notebookControllerUtils', () => ({
  useNotebookStatus: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/api', () => ({
  startNotebook: jest.fn(),
  stopNotebook: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/kueue/workbenchTracking', () => ({
  fireWorkbenchStatusModalAction: jest.fn(),
}));
jest.mock('../InfrastructureWorkloadComponents', () => ({
  HardwareProfileCell: () => null,
  StatusCell: () => null,
}));
jest.mock('../../utils/infrastructureWorkloads', () => ({
  ...jest.requireActual('../../utils/infrastructureWorkloads'),
  getInfrastructureWorkloadFilterValues: () => ['Running'],
}));

const mockTrackEvent = jest.fn();
const mockTrackPageEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent, mockTrackPageEvent);
const renderTracked = (element: React.ReactElement) =>
  render(element, { wrapper: TrackingWrapper });

const TableWithFilters: React.FC<{ initialFilters?: string[] }> = ({ initialFilters = [] }) => {
  const [statusFilters, setStatusFilters] = React.useState<string[]>(initialFilters);
  return (
    <InfrastructureWorkloadsTable
      workloads={[]}
      kueueEnabled={false}
      hardwareProfilesLoading={false}
      notebookStates={[]}
      failedSources={[]}
      overviewStatusFilters={statusFilters}
      onOverviewStatusFiltersChange={setStatusFilters}
    />
  );
};

describe('InfrastructureWorkloadsTable filter tracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    { removal: 'dropdown', initialFilters: [], remainingCount: 0 },
    { removal: 'chip', initialFilters: [], remainingCount: 0 },
    { removal: 'clear-all', initialFilters: [], remainingCount: 0 },
    { removal: 'dropdown', initialFilters: ['Queued'], remainingCount: 1 },
    { removal: 'chip', initialFilters: ['Queued'], remainingCount: 1 },
    { removal: 'clear-all', initialFilters: ['Queued'], remainingCount: 0 },
  ])(
    'should report $remainingCount remaining filters after $removal with $initialFilters',
    async ({ removal, initialFilters, remainingCount }) => {
      const user = userEvent.setup();
      renderTracked(<TableWithFilters initialFilters={initialFilters} />);
      await user.click(screen.getByTestId('infrastructure-workloads-type-filter'));
      await user.click(screen.getByRole('option', { name: 'Running' }));

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        GPUAAS_EVENTS.WORKLOADS_TAB_ATTRIBUTE_FILTER_APPLIED,
        { filterType: 'type', filterValue: 'Running' },
      );
      mockTrackEvent.mockClear();

      if (removal === 'dropdown') {
        await user.click(screen.getByTestId('infrastructure-workloads-type-filter'));
        await user.click(screen.getByRole('option', { name: 'Running' }));
      } else if (removal === 'chip') {
        await user.click(screen.getByRole('button', { name: /close Running/i }));
      } else {
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      }

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(GPUAAS_EVENTS.WORKLOADS_TAB_FILTERS_CLEARED, {
        hadActiveFilters: true,
        filterCount: remainingCount,
      });
      expect(
        screen.queryByTestId('infrastructure-workloads-type-chip-Running'),
      ).not.toBeInTheDocument();
    },
  );
});

describe('InfrastructureWorkloadsTable search debounce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should debounce the real search and send only its length', () => {
    const { rerender } = renderTracked(<TableWithFilters />);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    const input = screen.getByRole('textbox', { name: 'Find by name' });
    fireEvent.change(input, { target: { value: 'private' } });
    act(() => jest.advanceTimersByTime(250));
    fireEvent.change(input, { target: { value: 'private-model' } });
    rerender(<TableWithFilters />);
    act(() => jest.advanceTimersByTime(499));
    expect(mockTrackEvent).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Workloads Tab Workload Search Used', { queryLength: 13 }],
    ]);
    expect(mockTrackPageEvent).not.toHaveBeenCalled();
  });

  it('should cancel a pending search when all filters are reset', () => {
    renderTracked(<TableWithFilters />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Find by name' }), {
      target: { value: 'private-model' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    act(() => jest.advanceTimersByTime(500));
    expect(mockTrackEvent.mock.calls).toEqual([
      ['Workloads Tab Filters Cleared', { hadActiveFilters: false, filterCount: 0 }],
    ]);
  });

  it.each(['', '   '])('should cancel pending telemetry for blank search %j', (value) => {
    renderTracked(<TableWithFilters />);
    const input = screen.getByRole('textbox', { name: 'Find by name' });
    fireEvent.change(input, { target: { value: 'model' } });
    fireEvent.change(input, { target: { value } });
    act(() => jest.advanceTimersByTime(500));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should cancel pending search telemetry on unmount', () => {
    const { unmount } = renderTracked(<TableWithFilters />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Find by name' }), {
      target: { value: 'model' },
    });
    unmount();
    act(() => jest.advanceTimersByTime(500));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
