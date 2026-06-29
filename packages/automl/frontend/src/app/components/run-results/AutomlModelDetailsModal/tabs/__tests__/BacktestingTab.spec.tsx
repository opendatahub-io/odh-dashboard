/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import BacktestingTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/BacktestingTab';
import { mockBackTestingData } from '~/app/mocks/mockAutomlResultsContext';

jest.mock(
  '~/app/components/run-results/AutomlModelDetailsModal/components/BacktestWindowChart',
  () => ({
    __esModule: true,
    default: ({ evalMetric }: { evalMetric: string }) => (
      <div data-testid="backtest-window-chart">{evalMetric}</div>
    ),
  }),
);

jest.mock('~/app/components/run-results/AutomlModelDetailsModal/components/ForecastChart', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => (
    <div data-testid={`forecast-chart-${title.replace(/\s+/g, '-')}`}>{title}</div>
  ),
}));

const buildModel = (name: string): AutomlModel => ({
  name,
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: { MASE: 0.39 } },
});

const defaultProps = {
  taskType: 'timeseries' as const,
  model: buildModel('Theta_FULL'),
};

describe('BacktestingTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading spinner when isArtifactsLoading is true', () => {
    render(<BacktestingTab {...defaultProps} isArtifactsLoading />);

    expect(screen.getByLabelText('Loading back-testing data')).toBeInTheDocument();
    expect(screen.queryByTestId('back-testing-content')).not.toBeInTheDocument();
  });

  it('should render no-data message when backTesting is undefined', () => {
    render(<BacktestingTab {...defaultProps} backTesting={undefined} />);

    expect(screen.getByTestId('back-testing-no-data')).toBeInTheDocument();
    expect(screen.queryByTestId('back-testing-content')).not.toBeInTheDocument();
  });

  it('should render charts when backTesting data is provided', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    expect(screen.getByTestId('back-testing-content')).toBeInTheDocument();
    expect(screen.getByTestId('backtest-window-chart')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-chart-best-fit')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-chart-worst-fit')).toBeInTheDocument();
  });

  it('should pass eval_metric to BacktestWindowChart', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    expect(screen.getByTestId('backtest-window-chart')).toHaveTextContent(
      mockBackTestingData.eval_metric,
    );
  });
});
