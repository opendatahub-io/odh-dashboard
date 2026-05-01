/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
import AutomlInputParametersPanel from '~/app/components/run-results/AutomlInputParametersPanel';
import { AutomlResultsContext, getAutomlContext } from '~/app/context/AutomlResultsContext';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({ namespace: 'test-ns' }),
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('~/app/hooks/queries', () => ({
  isTerminalState: (state: string) => ['SUCCEEDED', 'FAILED', 'CANCELED'].includes(state),
}));

const defaultParameters: Partial<ConfigureSchema> = {
  display_name: 'My Run',
  task_type: 'binary',
  train_data_secret_name: 's3-connection',
  train_data_bucket_name: 'my-bucket',
  train_data_file_key: 'train.csv',
  top_n: 3,
  label_column: 'target_col',
};

const createMockPipelineRun = (overrides?: Partial<PipelineRun>): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Test Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-17T00:00:00Z',
  ...overrides,
});

const renderPanel = (
  props: Partial<React.ComponentProps<typeof AutomlInputParametersPanel>> = {},
  contextOverrides: Partial<Parameters<typeof getAutomlContext>[0]> = {},
) => {
  const onClose = jest.fn();
  const contextValue = getAutomlContext({
    pipelineRun: createMockPipelineRun(),
    models: {},
    modelsLoading: false,
    ...contextOverrides,
  });
  const result = render(
    <AutomlResultsContext.Provider value={contextValue}>
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <AutomlInputParametersPanel
              onClose={onClose}
              parameters={defaultParameters}
              {...props}
            />
          }
        >
          <DrawerContentBody>content</DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </AutomlResultsContext.Provider>,
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
    // Filter out pipeline-level terms (Pipeline run ID, Pipeline Server output directory)
    const parameterTerms = terms.filter(
      (el) =>
        el.textContent !== 'Pipeline run ID' &&
        el.textContent !== 'Pipeline Server output directory',
    );
    const labels = parameterTerms.map((el) => el.textContent);
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

  describe('pipeline links and run details', () => {
    it('should render pipeline definition link when pipeline_version_reference is present', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({
            pipeline_version_reference: {
              pipeline_id: 'p1',
              pipeline_version_id: 'v1',
            },
          }),
        },
      );
      const link = screen.getByTestId('parameter-pipeline-definition');
      expect(link).toBeInTheDocument();
      expect(screen.getByText('Pipeline definition')).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute(
        'href',
        '/develop-train/pipelines/definitions/test-ns/p1/v1/view',
      );
    });

    it('should not render pipeline definition link when pipeline_version_reference is absent', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({
            pipeline_version_reference: undefined,
          }),
        },
      );
      expect(screen.queryByTestId('parameter-pipeline-definition')).not.toBeInTheDocument();
    });

    it('should render pipeline run link when run_id is present', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ run_id: 'run-456' }),
        },
      );
      const link = screen.getByTestId('parameter-pipeline-run');
      expect(link).toBeInTheDocument();
      expect(screen.getByText('Pipeline run')).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute(
        'href',
        '/develop-train/pipelines/runs/test-ns/runs/run-456',
      );
    });

    it('should render pipeline run ID with clipboard copy', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ run_id: 'run-789' }),
        },
      );
      const runIdGroup = screen.getByTestId('parameter-run-id');
      expect(runIdGroup).toBeInTheDocument();
      expect(screen.getByText('Pipeline run ID')).toBeInTheDocument();
      // ClipboardCopy renders as an input, so check the input value
      const input = runIdGroup.querySelector('input');
      expect(input).toHaveValue('run-789');
    });

    it('should render output directory with modelsBasePath', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'SUCCEEDED' }),
          modelsBasePath: 's3://bucket/models/path',
          modelsLoading: false,
        },
      );
      const outputDir = screen.getByTestId('parameter-output-directory');
      expect(outputDir).toBeInTheDocument();
      expect(screen.getByText('Pipeline Server output directory')).toBeInTheDocument();
      const input = outputDir.querySelector('input');
      expect(input).toHaveValue('s3://bucket/models/path');
    });

    it('should show skeleton for output directory when models are loading', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'SUCCEEDED' }),
          modelsLoading: true,
        },
      );
      const outputDir = screen.getByTestId('parameter-output-directory');
      expect(outputDir.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
    });

    it('should show skeleton for output directory when run is not in terminal state', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'RUNNING' }),
          modelsLoading: false,
        },
      );
      const outputDir = screen.getByTestId('parameter-output-directory');
      expect(outputDir.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
    });

    it('should show "Not available" when modelsBasePath is undefined and run is terminal', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'SUCCEEDED' }),
          modelsBasePath: undefined,
          modelsLoading: false,
        },
      );
      const outputDir = screen.getByTestId('parameter-output-directory');
      expect(outputDir).toHaveTextContent('Pipeline Server output directory');
      expect(outputDir).toHaveTextContent('Not available');
    });

    it('should render "Input parameters" heading', () => {
      renderPanel();
      expect(screen.getByText('Input parameters')).toBeInTheDocument();
    });
  });
});
