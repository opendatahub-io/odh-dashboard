/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
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
  input_data_secret_name: 's3-connection',
  input_data_bucket_name: 'my-bucket',
  input_data_key: 'data.pdf',
  test_data_secret_name: 's3-connection',
  test_data_bucket_name: 'my-bucket',
  test_data_key: 'eval-data.json',
  llama_stack_secret_name: 'ls-secret',
  llama_stack_vector_io_provider_id: 'milvus',
  optimization_metric: 'faithfulness',
  optimization_max_rag_patterns: 8,
  generation_models: ['llama-4-ma', 'gpt-oss-120b'],
  embeddings_models: ['granite-embedding'],
};

const createMockPipelineRun = (overrides?: Partial<PipelineRun>): PipelineRun => ({
  run_id: 'run-123',
  display_name: 'Test Run',
  state: 'SUCCEEDED',
  created_at: '2025-01-17T00:00:00Z',
  ...overrides,
});

const renderPanel = (
  props: Partial<React.ComponentProps<typeof AutoragInputParametersPanel>> = {},
  contextOverrides: Partial<Parameters<typeof getAutoragContext>[0]> = {},
) => {
  const onClose = jest.fn();
  const contextValue = getAutoragContext({
    pipelineRun: createMockPipelineRun(),
    patterns: {},
    patternsLoading: false,
    ...contextOverrides,
  });
  const result = render(
    <AutoragResultsContext.Provider value={contextValue}>
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <AutoragInputParametersPanel
              onClose={onClose}
              parameters={defaultParameters}
              {...props}
            />
          }
        >
          <DrawerContentBody>content</DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </AutoragResultsContext.Provider>,
  );
  return { ...result, onClose };
};

describe('AutoragInputParametersPanel', () => {
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
    expect(screen.getByText('Llama Stack connection')).toBeInTheDocument();
    expect(screen.getByText('S3 connection')).toBeInTheDocument();
    expect(screen.getByText('S3 connection bucket')).toBeInTheDocument();
    expect(screen.getByText('Selected files and folders')).toBeInTheDocument();
    expect(screen.getByText('Vector I/O provider')).toBeInTheDocument();
    expect(screen.getByText('Evaluation dataset')).toBeInTheDocument();
    expect(screen.getByText('Optimization metric')).toBeInTheDocument();
    expect(screen.getByText('Maximum RAG patterns')).toBeInTheDocument();
  });

  it('should render parameter values', () => {
    renderPanel();
    expect(screen.getByText('s3-connection')).toBeInTheDocument();
    expect(screen.getByText('my-bucket')).toBeInTheDocument();
    expect(screen.getByText('data.pdf')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should exclude display_name, test_data_secret_name, and test_data_bucket_name from the drawer', () => {
    renderPanel();
    expect(screen.queryByText('Display name')).not.toBeInTheDocument();
    expect(screen.queryByText('Test data connection')).not.toBeInTheDocument();
    expect(screen.queryByText('Test data bucket')).not.toBeInTheDocument();
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

  it('should format optimization metric with human-readable label', () => {
    renderPanel();
    expect(screen.getByText('Answer faithfulness')).toBeInTheDocument();
  });

  it('should format context_correctness metric with human-readable label', () => {
    renderPanel({
      parameters: {
        ...defaultParameters,
        optimization_metric: 'context_correctness',
      },
    });
    expect(screen.getByText('Context correctness')).toBeInTheDocument();
  });

  it('should render model configuration with counts', () => {
    renderPanel();
    expect(screen.getByText('Model configuration')).toBeInTheDocument();
    expect(screen.getByText('2 foundation models')).toBeInTheDocument();
    expect(screen.getByText('1 embedding model')).toBeInTheDocument();
  });

  it('should not render model configuration when no models are present', () => {
    renderPanel({
      parameters: {
        ...defaultParameters,
        generation_models: [],
        embeddings_models: [],
      },
    });
    expect(screen.queryByText('Model configuration')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Model configuration')).not.toBeInTheDocument();
  });

  it('should display parameters in the defined order', () => {
    renderPanel({
      parameters: {
        optimization_metric: 'faithfulness',
        input_data_secret_name: 's3-connection',
        llama_stack_secret_name: 'ls-secret',
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
    expect(labels).toEqual([
      'Description',
      'Llama Stack connection',
      'S3 connection',
      'Optimization metric',
    ]);
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
        some_list: ['alpha', 'beta', 'gamma'],
      } as Partial<ConfigureSchema>,
    });
    expect(screen.getByText('alpha, beta, gamma')).toBeInTheDocument();
  });

  it('should render dividers between entries', () => {
    const { container } = renderPanel();
    const dividers = container.querySelectorAll('.pf-v6-c-divider');
    expect(dividers.length).toBeGreaterThan(0);
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
      const input = runIdGroup.querySelector('input');
      expect(input).toHaveValue('run-789');
    });

    it('should render output directory with ragPatternsBasePath', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'SUCCEEDED' }),
          ragPatternsBasePath: 's3://bucket/rag/patterns',
          patternsLoading: false,
        },
      );
      const outputDir = screen.getByTestId('parameter-output-directory');
      expect(outputDir).toBeInTheDocument();
      expect(screen.getByText('Pipeline Server output directory')).toBeInTheDocument();
      const input = outputDir.querySelector('input');
      expect(input).toHaveValue('s3://bucket/rag/patterns');
    });

    it('should show skeleton for output directory when patterns are loading', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'SUCCEEDED' }),
          patternsLoading: true,
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
          patternsLoading: false,
        },
      );
      const outputDir = screen.getByTestId('parameter-output-directory');
      expect(outputDir.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
    });

    it('should show "Not available" when ragPatternsBasePath is undefined and run is terminal', () => {
      renderPanel(
        {},
        {
          pipelineRun: createMockPipelineRun({ state: 'SUCCEEDED' }),
          ragPatternsBasePath: undefined,
          patternsLoading: false,
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
