import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BorrowingLendingChart from '../BorrowingLendingChart';
import { CQMetricSeries } from '../../hooks/useBorrowingLendingMetrics';

const NOW = 1700000000000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const makeSeries = (cqName: string, cohortName: string, points = 3): CQMetricSeries => ({
  cqName,
  cohortName,
  nominalQuota: 8,
  data: Array.from({ length: points }, (_, i) => ({
    x: NOW - (points - i) * ONE_HOUR_MS,
    y: i % 2 === 0 ? 2 : -1,
  })),
});

describe('BorrowingLendingChart', () => {
  it('shows a loading state when not loaded and no error', () => {
    render(<BorrowingLendingChart series={[]} loaded={false} error={undefined} />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('shows empty state when loaded with no data', () => {
    render(<BorrowingLendingChart series={[]} loaded error={undefined} />);
    expect(screen.getByTestId('borrowing-lending-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No borrowing\/lending activity detected/i)).toBeInTheDocument();
  });

  it('shows error message when an error is provided', () => {
    const error = new Error('Prometheus unavailable');
    render(<BorrowingLendingChart series={[]} loaded={false} error={error} />);
    expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
    expect(screen.getByText('Prometheus unavailable')).toBeInTheDocument();
  });

  it('renders the chart and hides the empty state when data is present', () => {
    const series = [makeSeries('cq-a', 'cohort-1')];
    render(<BorrowingLendingChart series={series} loaded error={undefined} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByTestId('borrowing-lending-empty-state')).not.toBeInTheDocument();
  });
});
