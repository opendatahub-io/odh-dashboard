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

jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: (props: { 'aria-label': string }) => (
    <button type="button" data-testid="popup-icon-btn" aria-label={props['aria-label']} />
  ),
}));

const buildModel = (
  name: string,
  testData: Record<string, number> = { MASE: 0.39 },
): AutomlModel => ({
  name,
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: testData },
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

    expect(screen.getByLabelText('Loading backtest window data')).toBeInTheDocument();
    expect(screen.queryByTestId('backtest-window-content')).not.toBeInTheDocument();
  });

  it('should render no-data message when backTesting is undefined', () => {
    render(<BacktestingTab {...defaultProps} backTesting={undefined} />);

    expect(screen.getByTestId('backtest-window-no-data')).toBeInTheDocument();
    expect(screen.queryByTestId('backtest-window-content')).not.toBeInTheDocument();
  });

  it('should render charts when backTesting data is provided', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    expect(screen.getByTestId('backtest-window-content')).toBeInTheDocument();
    expect(screen.getByTestId('backtest-window-chart')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-chart-Best-fit')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-chart-Worst-fit')).toBeInTheDocument();
  });

  it('should pass eval_metric to BacktestWindowChart', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    expect(screen.getByTestId('backtest-window-chart')).toHaveTextContent(
      mockBackTestingData.eval_metric,
    );
  });

  it('should show RMSE, MAE, MAPE cards averaged from per-window metrics', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    expect(screen.getByText('Overall RMSE')).toBeInTheDocument();
    expect(screen.getByText('Overall MAE')).toBeInTheDocument();
    expect(screen.getByText('Overall MAPE')).toBeInTheDocument();
  });

  it('should fill remaining card slots from other window metrics when curated keys are missing', () => {
    const backTesting = {
      ...mockBackTestingData,
      per_window_metrics: mockBackTestingData.per_window_metrics.map((w) => ({
        ...w,
        metrics: { WAPE: 0.01, SQL: 0.02, WQL: 0.03 },
      })),
    };
    render(<BacktestingTab {...defaultProps} backTesting={backTesting} />);

    expect(screen.getByText('Overall WAPE')).toBeInTheDocument();
    expect(screen.getByText('Overall SQL')).toBeInTheDocument();
    expect(screen.getByText('Overall WQL')).toBeInTheDocument();
  });

  it('should render tooltip icon buttons on metric cards', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    const buttons = screen.getAllByTestId('popup-icon-btn');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute('aria-label', 'More info for RMSE');
    expect(buttons[1]).toHaveAttribute('aria-label', 'More info for MAE');
    expect(buttons[2]).toHaveAttribute('aria-label', 'More info for MAPE');
  });
});
