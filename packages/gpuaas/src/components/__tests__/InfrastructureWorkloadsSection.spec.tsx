import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { WorkloadOverviewRow } from '../../utils/workloadOverview';
import InfrastructureWorkloadsSection from '../InfrastructureWorkloadsSection';

const rows: WorkloadOverviewRow[] = [
  { bucket: 'completed', detail: 'complete' },
  { bucket: 'active', detail: 'running' },
  { bucket: 'waiting', detail: 'pending' },
];

describe('InfrastructureWorkloadsSection', () => {
  it('should explain missing table data rather than spin indefinitely', () => {
    render(<InfrastructureWorkloadsSection />);
    expect(screen.getByText('Workload data not connected')).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading workload overview')).not.toBeInTheDocument();
    expect(screen.queryByText('No workloads')).not.toBeInTheDocument();
  });

  it('should show a spinner while an integrated table dataset is loading', () => {
    render(<InfrastructureWorkloadsSection loaded={false} />);
    expect(screen.getByLabelText('Loading workload overview')).toBeInTheDocument();
  });

  it('should show workload status totals', () => {
    render(<InfrastructureWorkloadsSection workloads={rows} loaded />);
    expect(screen.getByTestId('workload-overview-accordion')).toHaveClass('pf-m-plain');
    expect(screen.getByRole('button', { name: 'Workload overview' })).toHaveClass(
      'gpuaas-workload-overview__toggle',
    );
    expect(screen.getByTestId('workload-count-completed')).toHaveTextContent('1');
    expect(screen.getByTestId('workload-count-active')).toHaveTextContent('1');
    expect(screen.getByTestId('workload-count-waiting')).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: 'Status' })).toBeInTheDocument();
    expect(screen.queryByText('Admission')).not.toBeInTheDocument();
    expect(screen.queryByText('Admission status for supported workloads')).not.toBeInTheDocument();
  });

  it('should toggle the full-width overview content from the title control', async () => {
    const user = userEvent.setup();
    render(<InfrastructureWorkloadsSection workloads={rows} loaded />);
    const toggle = screen.getByRole('button', { name: 'Workload overview' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('workload-overview-status')).toBeInTheDocument();
  });

  it('should show details and only offer table navigation when connected', async () => {
    const user = userEvent.setup();
    const onViewInTable = jest.fn();
    render(
      <InfrastructureWorkloadsSection workloads={rows} loaded onViewInTable={onViewInTable} />,
    );
    await user.click(screen.getByTestId('workload-segment-active'));
    await user.click(screen.getByText('View in table'));
    expect(onViewInTable).toHaveBeenCalledWith('active');
  });

  it('should not render an admission breakdown when Kueue data is available', () => {
    render(<InfrastructureWorkloadsSection workloads={rows} loaded />);

    expect(screen.queryByText('Admission')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workload-admission')).not.toBeInTheDocument();
  });

  it('should derive counts from the current rows supplied by the table', () => {
    const { rerender } = render(<InfrastructureWorkloadsSection workloads={rows} loaded />);
    rerender(
      <InfrastructureWorkloadsSection
        workloads={rows.filter((row) => row.bucket === 'active')}
        loaded
      />,
    );
    expect(screen.getByTestId('workload-count-completed')).toHaveTextContent('0');
    expect(screen.getByText('Total workloads').previousElementSibling).toHaveTextContent('1');
  });
});
