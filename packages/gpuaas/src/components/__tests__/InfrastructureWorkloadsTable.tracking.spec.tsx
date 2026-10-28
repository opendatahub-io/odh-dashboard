import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import InfrastructureWorkloadsTable from '../InfrastructureWorkloadsTable';
import { GPUAAS_EVENTS } from '../../tracking/gpuaasTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));
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

const mockTracking = jest.mocked(fireMiscTrackingEvent);

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
      render(<TableWithFilters initialFilters={initialFilters} />);
      await user.click(screen.getByTestId('infrastructure-workloads-status-filter'));
      await user.click(screen.getByRole('option', { name: 'Running' }));

      expect(mockTracking).toHaveBeenCalledTimes(1);
      expect(mockTracking).toHaveBeenCalledWith(
        GPUAAS_EVENTS.WORKLOADS_TAB_ATTRIBUTE_FILTER_APPLIED,
        { filterType: 'status', filterValue: 'Running' },
      );
      mockTracking.mockClear();

      if (removal === 'dropdown') {
        await user.click(screen.getByTestId('infrastructure-workloads-status-filter'));
        await user.click(screen.getByRole('option', { name: 'Running' }));
      } else if (removal === 'chip') {
        await user.click(screen.getByRole('button', { name: /close Running/i }));
      } else {
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      }

      expect(mockTracking).toHaveBeenCalledTimes(1);
      expect(mockTracking).toHaveBeenCalledWith(GPUAAS_EVENTS.WORKLOADS_TAB_FILTERS_CLEARED, {
        hadActiveFilters: true,
        filterCount: remainingCount,
      });
      expect(
        screen.queryByTestId('infrastructure-workloads-status-chip-Running'),
      ).not.toBeInTheDocument();
    },
  );
});
