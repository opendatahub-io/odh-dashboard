/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Drawer, DrawerContent, DrawerContentBody } from '@patternfly/react-core';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';

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

const renderPanel = (
  props: Partial<React.ComponentProps<typeof AutoragInputParametersPanel>> = {},
) => {
  const onClose = jest.fn();
  const result = render(
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
    </Drawer>,
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
    const labels = terms.map((el) => el.textContent);
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
});
