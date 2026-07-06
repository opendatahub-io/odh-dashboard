/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import ModelEvaluationTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/ModelEvaluationTab';

const buildModel = (metrics: Record<string, unknown>): AutomlModel => ({
  name: 'TestModel',
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: metrics as Record<string, number> },
});

const defaultProps = {
  taskType: 'multiclass' as const,
  parameters: { task_type: 'multiclass' as const, label_column: 'label' },
};

describe('ModelEvaluationTab', () => {
  it('should render all metric rows from test_data', () => {
    const model = buildModel({ accuracy: 0.658, f1: 0.648, precision: 0.65 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('F₁')).toBeInTheDocument();
    expect(screen.getByText('Precision')).toBeInTheDocument();
  });

  it('should format metric values to three decimal places', () => {
    const model = buildModel({ accuracy: 0.65832 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('0.658')).toBeInTheDocument();
  });

  it('should display negated error metric values as-is', () => {
    const model = buildModel({ mse: -12.45 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('-12.450')).toBeInTheDocument();
  });

  it('should display negative values for non-error metrics like r2', () => {
    const model = buildModel({ r2: -0.123 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('-0.123')).toBeInTheDocument();
  });

  it('should format snake_case metric names as Title Case', () => {
    const model = buildModel({ balanced_accuracy: 0.662 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('Balanced Accuracy')).toBeInTheDocument();
  });

  it('should use special display names for acronym metrics', () => {
    const model = buildModel({ roc_auc: 0.75, mcc: 0.487 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('ROC AUC')).toBeInTheDocument();
    expect(screen.getByText('MCC')).toBeInTheDocument();
  });

  it('should render section heading', () => {
    const model = buildModel({ accuracy: 0.8 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('Model evaluation measure')).toBeInTheDocument();
  });

  it('should render table headers', () => {
    const model = buildModel({ accuracy: 0.8 });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('Measures')).toBeInTheDocument();
    expect(screen.getByText('Holdout score')).toBeInTheDocument();
  });

  it('should handle string metric values', () => {
    const model = buildModel({ accuracy: '0.750' });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('0.750')).toBeInTheDocument();
  });

  it('should handle non-numeric metric values gracefully', () => {
    const model = buildModel({ accuracy: null });
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    // toNumericMetric returns 0 for null, displayed as 0.000
    expect(screen.getByText('0.000')).toBeInTheDocument();
  });

  it('should display empty state when no metrics are available', () => {
    const model = buildModel({});
    render(<ModelEvaluationTab {...defaultProps} model={model} />);

    expect(screen.getByText('No evaluation metrics available for this model.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
