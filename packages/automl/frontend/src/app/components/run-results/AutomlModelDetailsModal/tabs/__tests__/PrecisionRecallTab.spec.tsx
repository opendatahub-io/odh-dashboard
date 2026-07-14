/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import PrecisionRecallTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/PrecisionRecallTab';
import {
  mockBinaryCurvesData,
  mockMulticlassCurvesData,
} from '~/app/mocks/mockAutomlResultsContext';

jest.mock(
  '~/app/components/run-results/AutomlModelDetailsModal/components/PrecisionRecallChart',
  () => ({
    __esModule: true,
    default: () => <div data-testid="precision-recall-chart">PR Chart Mock</div>,
    getApValue: () => 0.95,
  }),
);

const buildModel = (name: string): AutomlModel => ({
  name,
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: { accuracy: 0.8 } },
});

const defaultProps = {
  taskType: 'multiclass' as const,
  model: buildModel('TestModel'),
  parameters: { task_type: 'multiclass' as const, label_column: 'label' },
};

describe('PrecisionRecallTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chart when curves data is provided', () => {
    render(
      <PrecisionRecallTab
        {...defaultProps}
        curves={mockMulticlassCurvesData.CatBoost_BAG_L2_FULL}
      />,
    );

    expect(screen.getByTestId('precision-recall-chart')).toBeInTheDocument();
  });

  it('should render chart for binary curves data', () => {
    render(
      <PrecisionRecallTab {...defaultProps} taskType="binary" curves={mockBinaryCurvesData} />,
    );

    expect(screen.getByTestId('precision-recall-chart')).toBeInTheDocument();
  });

  it('should render loading spinner when isArtifactsLoading is true', () => {
    render(<PrecisionRecallTab {...defaultProps} isArtifactsLoading />);

    expect(screen.getByLabelText('Loading precision-recall curve data')).toBeInTheDocument();
    expect(screen.queryByTestId('precision-recall-chart')).not.toBeInTheDocument();
  });

  it('should render no-data message when curves is undefined', () => {
    render(<PrecisionRecallTab {...defaultProps} curves={undefined} />);

    expect(screen.getByTestId('precision-recall-no-data')).toBeInTheDocument();
    expect(screen.queryByTestId('precision-recall-chart')).not.toBeInTheDocument();
  });
});
