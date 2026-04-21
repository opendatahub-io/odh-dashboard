/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import type { MockAutomlParameters } from '~/app/mocks/mockAutomlResultsContext';
import ModelInformationTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/ModelInformationTab';

const baseModel: AutomlModel = {
  name: 'TestModel',
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: { accuracy: 0.8 } },
};

const baseParameters: MockAutomlParameters = {
  display_name: 'My Experiment',
  description: 'A test experiment',
  task_type: 'multiclass',
  label_column: 'type',
  top_n: 3,
  train_data_bucket_name: 'my-bucket',
  train_data_file_key: 'data.csv',
  train_data_secret_name: 's3-secret',
};

const defaultProps = {
  model: baseModel,
  taskType: 'multiclass' as const,
  parameters: baseParameters,
};

describe('ModelInformationTab', () => {
  it('should render visible parameter entries', () => {
    render(<ModelInformationTab {...defaultProps} />);

    // label_column and top_n should appear (not hidden)
    expect(screen.getByText('Label Column')).toBeInTheDocument();
    expect(screen.getByText('type')).toBeInTheDocument();
    expect(screen.getByText('Top N')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should hide internal parameter keys', () => {
    render(<ModelInformationTab {...defaultProps} />);

    // These keys are in HIDDEN_KEYS and should not render
    expect(screen.queryByText('Display Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
    expect(screen.queryByText('Task Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Train Data Secret Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Train Data Bucket Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Train Data File Key')).not.toBeInTheDocument();
  });

  it('should render the evaluation metric derived from task type', () => {
    render(<ModelInformationTab {...defaultProps} />);

    expect(screen.getByText('Evaluation metric')).toBeInTheDocument();
    expect(screen.getByText('accuracy')).toBeInTheDocument();
  });

  it('should render formatted creation date when provided', () => {
    render(<ModelInformationTab {...defaultProps} createdAt="2026-03-19T14:00:00Z" />);

    expect(screen.getByText('Created on')).toBeInTheDocument();
    // The date is formatted with toLocaleString, so just check it's not '-'
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });

  it('should render dash when createdAt is undefined', () => {
    render(<ModelInformationTab {...defaultProps} />);

    expect(screen.getByText('Created on')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should hide parameters with empty values', () => {
    const tabularParams: MockAutomlParameters = {
      task_type: 'multiclass',
      label_column: 'type',
      top_n: 3,
      target: '',
      id_column: '',
      timestamp_column: '',
      known_covariates_names: [],
      train_data_bucket_name: 'bucket',
      train_data_file_key: 'data.csv',
      train_data_secret_name: 'secret',
    };

    render(<ModelInformationTab {...defaultProps} parameters={tabularParams} />);

    // Tabular fields should be shown
    expect(screen.getByText('Label Column')).toBeInTheDocument();
    expect(screen.getByText('Top N')).toBeInTheDocument();

    // Timeseries fields with empty values should not render
    expect(screen.queryByText('Target')).not.toBeInTheDocument();
    expect(screen.queryByText('Id Column')).not.toBeInTheDocument();
    expect(screen.queryByText('Timestamp Column')).not.toBeInTheDocument();
    expect(screen.queryByText('Known Covariates Names')).not.toBeInTheDocument();
  });

  it('should render timeseries-specific parameters', () => {
    const timeseriesParams: MockAutomlParameters = {
      task_type: 'timeseries',
      target: 'sales',
      id_column: 'store_id',
      timestamp_column: 'date',
      prediction_length: 7,
      train_data_bucket_name: 'bucket',
      train_data_file_key: 'data.csv',
      train_data_secret_name: 'secret',
    };

    render(
      <ModelInformationTab {...defaultProps} taskType="timeseries" parameters={timeseriesParams} />,
    );

    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('sales')).toBeInTheDocument();
    expect(screen.getByText('Id Column')).toBeInTheDocument();
    expect(screen.getByText('Timestamp Column')).toBeInTheDocument();
    expect(screen.getByText('Prediction Length')).toBeInTheDocument();
  });
});
