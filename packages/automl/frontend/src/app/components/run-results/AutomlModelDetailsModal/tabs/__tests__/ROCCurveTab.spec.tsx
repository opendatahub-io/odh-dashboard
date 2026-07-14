/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ROCCurveTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/ROCCurveTab';
import {
  mockBinaryCurvesData,
  mockMulticlassCurvesData,
} from '~/app/mocks/mockAutomlResultsContext';

jest.mock('~/app/components/run-results/AutomlModelDetailsModal/components/ROCCurveChart', () => ({
  __esModule: true,
  default: () => <div data-testid="roc-curve-chart">ROC Chart Mock</div>,
  getAucValue: () => 0.95,
}));

const defaultProps = {
  taskType: 'binary' as const,
  model: {
    name: 'TestModel',
    location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
    metrics: { test_data: { accuracy: 0.8 } },
  },
  parameters: { task_type: 'binary' as const, label_column: 'label' },
};

describe('ROCCurveTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chart when binary curves data is provided', () => {
    render(<ROCCurveTab {...defaultProps} curves={mockBinaryCurvesData} />);

    expect(screen.getByTestId('roc-curve-section')).toBeInTheDocument();
    expect(screen.getByTestId('roc-curve-chart')).toBeInTheDocument();
  });

  it('should render chart when multiclass curves data is provided', () => {
    render(
      <ROCCurveTab
        {...defaultProps}
        taskType="multiclass"
        curves={mockMulticlassCurvesData.CatBoost_BAG_L2_FULL}
      />,
    );

    expect(screen.getByTestId('roc-curve-section')).toBeInTheDocument();
    expect(screen.getByTestId('roc-curve-chart')).toBeInTheDocument();
  });

  it('should render loading spinner when isArtifactsLoading is true', () => {
    render(<ROCCurveTab {...defaultProps} isArtifactsLoading />);

    expect(screen.getByLabelText('Loading ROC curve data')).toBeInTheDocument();
    expect(screen.queryByTestId('roc-curve-chart')).not.toBeInTheDocument();
  });

  it('should render no-data message when curves is undefined', () => {
    render(<ROCCurveTab {...defaultProps} curves={undefined} />);

    expect(screen.getByTestId('roc-curve-no-data')).toBeInTheDocument();
    expect(screen.queryByTestId('roc-curve-chart')).not.toBeInTheDocument();
  });
});
