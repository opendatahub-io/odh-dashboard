/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import PrecisionRecallTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/PrecisionRecallTab';

jest.mock(
  '~/app/components/run-results/AutomlModelDetailsModal/components/PrecisionRecallChart',
  () => ({
    __esModule: true,
    default: () => <div data-testid="precision-recall-chart">PR Chart Mock</div>,
  }),
);

const buildModel = (name: string): AutomlModel => ({
  name,
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: { accuracy: 0.8 } },
});

const defaultProps = {
  taskType: 'multiclass' as const,
  parameters: { task_type: 'multiclass' as const, label_column: 'label' },
};

describe('PrecisionRecallTab', () => {
  it('should render chart for binary task type', () => {
    const model = buildModel('TestModel');
    render(<PrecisionRecallTab {...defaultProps} taskType="binary" model={model} />);

    expect(screen.getByTestId('precision-recall-chart')).toBeInTheDocument();
  });

  it('should render chart for multiclass task type', () => {
    const model = buildModel('CatBoost_BAG_L2_FULL');
    render(<PrecisionRecallTab {...defaultProps} taskType="multiclass" model={model} />);

    expect(screen.getByTestId('precision-recall-chart')).toBeInTheDocument();
  });

  it('should render chart for unknown multiclass model using fallback', () => {
    const model = buildModel('UnknownModel');
    render(<PrecisionRecallTab {...defaultProps} taskType="multiclass" model={model} />);

    expect(screen.getByTestId('precision-recall-chart')).toBeInTheDocument();
  });
});
