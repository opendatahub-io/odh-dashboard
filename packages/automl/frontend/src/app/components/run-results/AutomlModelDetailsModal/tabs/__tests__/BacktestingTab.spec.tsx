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
    expect(screen.getByTestId('forecast-chart-Best-fit')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-chart-Worst-fit')).toBeInTheDocument();
  });

  it('should pass eval_metric to BacktestWindowChart', () => {
    render(<BacktestingTab {...defaultProps} backTesting={mockBackTestingData} />);

    expect(screen.getByTestId('backtest-window-chart')).toHaveTextContent(
      mockBackTestingData.eval_metric,
    );
  });

  it('should show RMSE, MAE, R2 cards when present in test_data', () => {
    const model = buildModel('Model1', { RMSE: 45.67, MAE: 34.54, R2: 0.89, MASE: 0.39 });
    render(<BacktestingTab {...defaultProps} model={model} backTesting={mockBackTestingData} />);

    expect(screen.getByText('Overall RMSE')).toBeInTheDocument();
    expect(screen.getByText('Overall MAE')).toBeInTheDocument();
    expect(screen.getByText('Overall R²')).toBeInTheDocument();
    expect(screen.queryByText('Overall MASE')).not.toBeInTheDocument();
  });

  it('should fall back to first 3 test_data entries when no curated keys match', () => {
    const model = buildModel('Model1', { MASE: 0.39, WAPE: 0.12, WQL: 0.05 });
    render(<BacktestingTab {...defaultProps} model={model} backTesting={mockBackTestingData} />);

    expect(screen.getByText('Overall MASE')).toBeInTheDocument();
    expect(screen.getByText('Overall WAPE')).toBeInTheDocument();
    expect(screen.getByText('Overall WQL')).toBeInTheDocument();
  });

  it('should render tooltip icon buttons on metric cards', () => {
    const model = buildModel('Model1', { RMSE: 45.67, MAE: 34.54 });
    render(<BacktestingTab {...defaultProps} model={model} backTesting={mockBackTestingData} />);

    const buttons = screen.getAllByTestId('popup-icon-btn');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute('aria-label', 'More info for RMSE');
    expect(buttons[1]).toHaveAttribute('aria-label', 'More info for MAE');
  });
});
