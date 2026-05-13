/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

const defaultParameters: Partial<ConfigureSchema> = {
  display_name: 'My Run',
  task_type: 'binary',
  train_data_secret_name: 's3-connection',
  train_data_bucket_name: 'my-bucket',
  train_data_file_key: 'train.csv',
  top_n: 3,
  label_column: 'target_col',
};

const renderPanel = (
  props: Partial<React.ComponentProps<typeof AutomlInputParametersPanel>> = {},
) => {
  const onClose = jest.fn();
  const result = render(
    <Drawer isExpanded>
      <DrawerContent
        panelContent={
          <AutomlInputParametersPanel onClose={onClose} parameters={defaultParameters} {...props} />
        }
      >
        <DrawerContentBody>content</DrawerContentBody>
      </DrawerContent>
    </Drawer>,
  );
  return { ...result, onClose };
};

describe('AutomlInputParametersPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the panel with title and close button', () => {
    renderPanel();
    expect(screen.getByText('Run details')).toBeInTheDocument();
    expect(screen.getByTestId('run-details-drawer-close')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const { onClose } = renderPanel();
    await userEvent.click(screen.getByTestId('run-details-drawer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render parameter labels from the label map', () => {
    renderPanel();
    expect(screen.getByText('Prediction type')).toBeInTheDocument();
    expect(screen.getByText('S3 connection')).toBeInTheDocument();
    expect(screen.getByText('S3 connection bucket')).toBeInTheDocument();
    expect(screen.getByText('Selected files')).toBeInTheDocument();
    expect(screen.getByText('Top models to consider')).toBeInTheDocument();
    expect(screen.getByText('Label column')).toBeInTheDocument();
  });

  it('should render parameter values', () => {
    renderPanel();
    expect(screen.getByText('s3-connection')).toBeInTheDocument();
    expect(screen.getByText('my-bucket')).toBeInTheDocument();
    expect(screen.getByText('train.csv')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('target_col')).toBeInTheDocument();
  });

  it('should exclude display_name from the drawer', () => {
    renderPanel();
    expect(screen.queryByText('Display name')).not.toBeInTheDocument();
  });

  it('should filter out empty string values', () => {
    renderPanel({
      parameters: {
        ...defaultParameters,
        description: '',
      },
    });
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('should filter out empty array values', () => {
    renderPanel({
      parameters: {
        task_type: 'timeseries',
        known_covariates_names: [],
      } as Partial<ConfigureSchema>,
    });
    expect(screen.queryByText('Known covariates')).not.toBeInTheDocument();
  });

  it('should format task type with human-readable label', () => {
    renderPanel();
    expect(screen.getByText('Binary classification')).toBeInTheDocument();
  });

  it('should show loading skeletons when isLoading is true', () => {
    renderPanel({ isLoading: true });
    expect(screen.getByText('Run details')).toBeInTheDocument();
    expect(screen.queryByText('S3 connection')).not.toBeInTheDocument();
    const skeletons = screen
      .getByTestId('run-details-drawer-panel')
      .querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should fall back to title-cased key for unknown parameters', () => {
    renderPanel({
      parameters: {
        ...defaultParameters,
        some_new_param: 'new-value',
      } as Partial<ConfigureSchema>,
    });
    expect(screen.getByText('Some new param')).toBeInTheDocument();
    expect(screen.getByText('new-value')).toBeInTheDocument();
  });

  it('should render empty description list when parameters is undefined', () => {
    renderPanel({ parameters: undefined });
    expect(screen.getByText('Run details')).toBeInTheDocument();
    expect(screen.queryByText('S3 connection')).not.toBeInTheDocument();
  });

  it('should display parameters in the defined order', () => {
    renderPanel({
      parameters: {
        top_n: 3,
        train_data_secret_name: 's3-connection',
        description: 'A test run',
      } as Partial<ConfigureSchema>,
    });
    const terms = screen.getAllByRole('term');
    const labels = terms.map((el) => el.textContent);
    expect(labels).toEqual(['Description', 'S3 connection', 'Top models to consider']);
  });

  it('should format boolean values as strings', () => {
    renderPanel({
      parameters: {
        ...defaultParameters,
        some_flag: true,
      } as Partial<ConfigureSchema>,
    });
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('should format array values as comma-separated strings', () => {
    renderPanel({
      parameters: {
        task_type: 'timeseries',
        known_covariates_names: ['alpha', 'beta', 'gamma'],
      } as Partial<ConfigureSchema>,
    });
    expect(screen.getByText('alpha, beta, gamma')).toBeInTheDocument();
  });

  it('should render dividers between entries', () => {
    const { container } = renderPanel();
    const dividers = container.querySelectorAll('.pf-v6-c-divider');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('should hide timeseries-specific parameters for tabular task types', () => {
    renderPanel({
      parameters: {
        ...defaultParameters,
        task_type: 'binary',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 7,
        known_covariates_names: ['holiday'],
      } as Partial<ConfigureSchema>,
    });
    expect(screen.getByText('Label column')).toBeInTheDocument();
    expect(screen.queryByText('Target column')).not.toBeInTheDocument();
    expect(screen.queryByText('ID column')).not.toBeInTheDocument();
    expect(screen.queryByText('Timestamp column')).not.toBeInTheDocument();
    expect(screen.queryByText('Prediction length')).not.toBeInTheDocument();
    expect(screen.queryByText('Known covariates')).not.toBeInTheDocument();
  });

  it('should hide tabular-specific parameters for timeseries task type', () => {
    renderPanel({
      parameters: {
        task_type: 'timeseries',
        train_data_secret_name: 's3-conn',
        label_column: 'some_label',
        target: 'sales',
      } as Partial<ConfigureSchema>,
    });
    expect(screen.getByText('Target column')).toBeInTheDocument();
    expect(screen.queryByText('Label column')).not.toBeInTheDocument();
  });

  it('should render timeseries-specific parameters', () => {
    renderPanel({
      parameters: {
        task_type: 'timeseries',
        train_data_secret_name: 's3-conn',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'data.csv',
        target: 'sales',
        id_column: 'store_id',
        timestamp_column: 'date',
        prediction_length: 7,
        known_covariates_names: ['holiday', 'promo'],
      },
    });
    expect(screen.getByText('Time series forecasting')).toBeInTheDocument();
    expect(screen.getByText('Target column')).toBeInTheDocument();
    expect(screen.getByText('sales')).toBeInTheDocument();
    expect(screen.getByText('ID column')).toBeInTheDocument();
    expect(screen.getByText('Timestamp column')).toBeInTheDocument();
    expect(screen.getByText('Prediction length')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Known covariates')).toBeInTheDocument();
    expect(screen.getByText('holiday, promo')).toBeInTheDocument();
  });
});
