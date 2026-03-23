/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MockAutomlModel } from '~/app/mocks/mockAutomlResultsContext';
import AutomlModelDetailsModalHeader from '../AutomlModelDetailsModalHeader';

const buildModel = (
  name: string,
  evalMetric: string,
  metrics: Record<string, unknown>,
): MockAutomlModel => ({
  display_name: name,
  model_config: { eval_metric: evalMetric },
  location: { model_directory: '/', predictor: '/p.pkl', notebook: '/n.ipynb' },
  metrics: { test_data: metrics },
});

const modelA = buildModel('CatBoost', 'accuracy', { accuracy: 0.658 });
const modelB = buildModel('RandomForest', 'accuracy', { accuracy: 0.632 });

describe('AutomlModelDetailsModalHeader', () => {
  const defaultProps = {
    models: [modelA, modelB],
    currentModelName: 'CatBoost',
    rank: 1,
    onSelectModel: jest.fn(),
    onDownload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the current model name', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    expect(screen.getByText('CatBoost')).toBeInTheDocument();
  });

  it('should display the rank', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} rank={2} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display optimized metric name and value', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    expect(screen.getByText('Accuracy (Optimized)')).toBeInTheDocument();
    expect(screen.getByText('0.658')).toBeInTheDocument();
  });

  it('should use absolute value for negative metrics', () => {
    const negativeModel = buildModel('Model', 'r2', { r2: -0.123 });
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        models={[negativeModel]}
        currentModelName="Model"
      />,
    );
    expect(screen.getByText('0.123')).toBeInTheDocument();
  });

  it('should not display optimized metric when eval_metric is missing from test_data', () => {
    const noMetricModel = buildModel('Model', 'f1', { accuracy: 0.9 });
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        models={[noMetricModel]}
        currentModelName="Model"
      />,
    );
    expect(screen.queryByText('(Optimized)')).not.toBeInTheDocument();
  });

  it('should render Download button', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    expect(screen.getByTestId('model-details-download')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should call onDownload when Download is clicked', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    screen.getByTestId('model-details-download').click();
    expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
  });

  it('should render disabled Save as button', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    const saveButton = screen.getByTestId('model-details-save-as');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it('should render model name as plain text when only one model', () => {
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        models={[modelA]}
        currentModelName="CatBoost"
      />,
    );
    // With a single model, no dropdown toggle is rendered
    expect(screen.queryByTestId('model-selector-dropdown')).not.toBeInTheDocument();
    expect(screen.getByText('CatBoost')).toBeInTheDocument();
  });

  it('should render dropdown toggle when multiple models exist', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    expect(screen.getByTestId('model-selector-dropdown')).toBeInTheDocument();
  });

  it('should display the "Model details" label', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    expect(screen.getByText('Model details')).toBeInTheDocument();
  });
});
