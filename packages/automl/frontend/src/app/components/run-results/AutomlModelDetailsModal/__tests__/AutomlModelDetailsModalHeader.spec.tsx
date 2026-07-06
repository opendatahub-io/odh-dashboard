/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import AutomlModelDetailsModalHeader from '~/app/components/run-results/AutomlModelDetailsModal/AutomlModelDetailsModalHeader';

const buildModel = (modelName: string, metrics: Record<string, number>): AutomlModel => ({
  name: modelName,
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: metrics },
});

const modelA = buildModel('CatBoost', { accuracy: 0.658 });
const modelB = buildModel('RandomForest', { accuracy: 0.632 });

describe('AutomlModelDetailsModalHeader', () => {
  const defaultProps = {
    models: [modelA, modelB],
    currentModelName: 'CatBoost',
    rank: 1,
    rankMap: { CatBoost: 1, RandomForest: 2 },
    evalMetric: 'accuracy',
    onSelectModel: jest.fn(),
    onDownload: jest.fn(),
    onSaveNotebook: jest.fn(),
    onRegisterModel: jest.fn(),
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

  it('should display raw value for non-error metrics like r2', () => {
    const negativeModel = buildModel('Model', { r2: -0.123 });
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        evalMetric="r2"
        models={[negativeModel]}
        currentModelName="Model"
      />,
    );
    expect(screen.getByText('-0.123')).toBeInTheDocument();
  });

  it('should display negated error metric values as-is', () => {
    const errorModel = buildModel('Model', { mean_absolute_scaled_error: -0.082 });
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        evalMetric="mean_absolute_scaled_error"
        models={[errorModel]}
        currentModelName="Model"
      />,
    );
    expect(screen.getByText('-0.082')).toBeInTheDocument();
  });

  it('should display N/A when eval_metric is missing from test_data', () => {
    const noMetricModel = buildModel('Model', { accuracy: 0.9 });
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        evalMetric="f1"
        models={[noMetricModel]}
        currentModelName="Model"
      />,
    );
    expect(screen.getByText('F₁ (Optimized)')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should render dropdown models sorted by rank', async () => {
    const user = userEvent.setup();
    const modelC = buildModel('Worst', { accuracy: 0.5 });
    const models = [modelC, modelA, modelB]; // unsorted order
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        models={models}
        rankMap={{ CatBoost: 1, RandomForest: 2, Worst: 3 }}
      />,
    );
    await user.click(screen.getByTestId('model-selector-dropdown'));
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent('CatBoost');
    expect(items[1]).toHaveTextContent('RandomForest');
    expect(items[2]).toHaveTextContent('Worst');
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

  it('should render Save as dropdown toggle', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    expect(screen.getByTestId('model-details-actions-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('model-details-actions-toggle')).toHaveTextContent('Save as');
  });

  it('should render Save as notebook item in dropdown', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    const saveItem = screen.getByTestId('model-details-save-notebook');
    expect(saveItem).toBeInTheDocument();
    expect(saveItem).toHaveTextContent('Save as notebook');
  });

  it('should render Register model item in dropdown', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    const registerItem = screen.getByTestId('model-details-register-model');
    expect(registerItem).toBeInTheDocument();
    expect(registerItem).toHaveTextContent('Register model');
  });

  it('should call onSaveNotebook when Save as notebook is clicked', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Save as notebook' }));
    expect(defaultProps.onSaveNotebook).toHaveBeenCalledTimes(1);
  });

  it('should call onRegisterModel when Register model is clicked', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModalHeader {...defaultProps} />);
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    await user.click(screen.getByRole('menuitem', { name: 'Register model' }));
    expect(defaultProps.onRegisterModel).toHaveBeenCalledTimes(1);
  });

  it('should disable Save as notebook when onSaveNotebook is not provided', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModalHeader {...defaultProps} onSaveNotebook={undefined} />);
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    expect(screen.getByRole('menuitem', { name: 'Save as notebook' })).toBeDisabled();
  });

  it('should disable Register model when onRegisterModel is not provided', async () => {
    const user = userEvent.setup();
    render(<AutomlModelDetailsModalHeader {...defaultProps} onRegisterModel={undefined} />);
    await user.click(screen.getByTestId('model-details-actions-toggle'));
    expect(screen.getByRole('menuitem', { name: 'Register model' })).toBeDisabled();
  });

  it('should show dropdown when only onSaveNotebook is provided', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} onRegisterModel={undefined} />);
    expect(screen.getByTestId('model-details-actions-toggle')).toBeInTheDocument();
  });

  it('should show dropdown when only onRegisterModel is provided', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} onSaveNotebook={undefined} />);
    expect(screen.getByTestId('model-details-actions-toggle')).toBeInTheDocument();
  });

  it('should not render dropdown when neither callback is provided', () => {
    render(
      <AutomlModelDetailsModalHeader
        {...defaultProps}
        onSaveNotebook={undefined}
        onRegisterModel={undefined}
      />,
    );
    expect(screen.queryByTestId('model-details-actions-toggle')).not.toBeInTheDocument();
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

  it('should disable download button when isDownloadDisabled is true', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} isDownloadDisabled />);
    expect(screen.getByTestId('model-details-download')).toBeDisabled();
  });

  it('should enable download button when isDownloadDisabled is false', () => {
    render(<AutomlModelDetailsModalHeader {...defaultProps} isDownloadDisabled={false} />);
    expect(screen.getByTestId('model-details-download')).toBeEnabled();
  });
});
