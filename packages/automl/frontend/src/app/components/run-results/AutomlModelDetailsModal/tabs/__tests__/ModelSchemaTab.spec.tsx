/* eslint-disable camelcase -- mock data uses snake_case keys */
import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useS3GetFileSchemaQuery, type ColumnSchema } from '~/app/hooks/useS3GetFileSchemaQuery';
import type { AutomlModel } from '~/app/context/AutomlResultsContext';
import ModelSchemaTab from '~/app/components/run-results/AutomlModelDetailsModal/tabs/ModelSchemaTab';

jest.mock('~/app/hooks/useS3GetFileSchemaQuery', () => ({
  useS3GetFileSchemaQuery: jest.fn(),
}));

const useS3GetFileSchemaQueryMock = jest.mocked(useS3GetFileSchemaQuery);

const baseModel: AutomlModel = {
  name: 'TestModel',
  location: { model_directory: '/', predictor: '/predictor', notebook: '/n.ipynb' },
  metrics: { test_data: { accuracy: 0.8 } },
};

const tabularProps = {
  model: baseModel,
  namespace: 'test-ns',
  taskType: 'regression' as const,
  parameters: {
    task_type: 'regression' as const,
    label_column: 'col2',
    train_data_secret_name: 'secret',
    train_data_bucket_name: 'bucket',
    train_data_file_key: 'data.csv',
  },
};

const tabularColumns = [
  { name: 'col1', type: 'string' as const, task_type: 'regression' as const },
  { name: 'col2', type: 'double' as const, task_type: 'regression' as const },
  { name: 'col3', type: 'integer' as const, task_type: 'regression' as const },
];

const queryResult = (data: ColumnSchema[], overrides: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  isFetching: false,
  isPlaceholderData: false,
  isError: false,
  error: null,
  resetSchemaCache: jest.fn(),
  ...overrides,
});

describe('ModelSchemaTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render skeleton loading state while the schema is loading', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([], { isLoading: true }) as never);
    const { container } = render(<ModelSchemaTab {...tabularProps} />);
    const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render skeleton loading state while placeholder data is being fetched', () => {
    // placeholderData: [] makes isLoading false on the first fetch — the tab must still
    // show the skeleton instead of a premature "no schema data" empty state.
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([], { isPlaceholderData: true, isFetching: true }) as never,
    );
    const { container } = render(<ModelSchemaTab {...tabularProps} />);
    const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByTestId('model-schema-no-data-empty-state')).not.toBeInTheDocument();
  });

  it('should not treat an empty fetched schema as loading', () => {
    // A successful fetch that returned an empty schema is real data — show the empty
    // state, not the skeleton.
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([], { isPlaceholderData: false, isFetching: false }) as never,
    );
    render(<ModelSchemaTab {...tabularProps} />);
    expect(screen.getByTestId('model-schema-no-data-empty-state')).toBeInTheDocument();
  });

  it('should render skeleton loading state while artifacts are loading', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult(tabularColumns, { isLoading: true }) as never,
    );
    render(<ModelSchemaTab {...tabularProps} isArtifactsLoading />);
    expect(useS3GetFileSchemaQueryMock).toHaveBeenCalledWith(
      'test-ns',
      'secret',
      'bucket',
      'data.csv',
    );
  });

  it('should show error empty state when the schema query fails', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([], { isError: true, error: new Error('boom') }) as never,
    );
    render(<ModelSchemaTab {...tabularProps} />);
    expect(screen.getByTestId('model-schema-error-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Unable to load model schema')).toBeInTheDocument();
  });

  it('should show the table view active by default with the JSON view inactive', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
    render(<ModelSchemaTab {...tabularProps} />);

    const toggleGroup = screen.getByTestId('model-schema-view-toggle');
    expect(toggleGroup).toBeInTheDocument();
    expect(screen.getByTestId('model-schema-row-col1')).toBeVisible();
    // Inactive view content is unmounted until the toggle is selected.
    expect(screen.queryByTestId('model-schema-json-code')).not.toBeInTheDocument();
  });

  it('should show no-data empty state when no schema is available', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([]) as never);
    render(<ModelSchemaTab {...tabularProps} />);
    expect(screen.getByTestId('model-schema-no-data-empty-state')).toBeInTheDocument();
  });

  it('should list input columns with data types and exclude the target column', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
    render(<ModelSchemaTab {...tabularProps} />);

    expect(screen.getByTestId('model-schema-target-note')).toHaveTextContent(
      'Shows input columns and data types required by this model to predict "col2".',
    );
    expect(screen.getByTestId('model-schema-row-col1')).toHaveTextContent('String');
    expect(screen.getByTestId('model-schema-row-col3')).toHaveTextContent('Integer');
    expect(screen.queryByTestId('model-schema-row-col2')).not.toBeInTheDocument();
  });

  it('should mark columns missing from feature importance as not used', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
    render(
      <ModelSchemaTab
        {...tabularProps}
        featureImportance={{ importance: { col1: 0.7, col2: 0.3 } }}
      />,
    );

    expect(screen.getByTestId('model-schema-unused-col3')).toHaveTextContent(
      'Not used by this model',
    );
    expect(screen.queryByTestId('model-schema-unused-col1')).not.toBeInTheDocument();
  });

  it('should render timeseries roles for id, timestamp, and covariates', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([
        { name: 'store_id', type: 'string', task_type: 'regression' },
        { name: 'date', type: 'timestamp', task_type: 'regression' },
        { name: 'sales', type: 'double', task_type: 'regression' },
        { name: 'promotion', type: 'bool', task_type: 'regression' },
        { name: 'temperature', type: 'double', task_type: 'regression' },
      ]) as never,
    );
    render(
      <ModelSchemaTab
        {...tabularProps}
        taskType="timeseries"
        parameters={{
          task_type: 'timeseries',
          target: 'sales',
          id_column: 'store_id',
          timestamp_column: 'date',
          known_covariates_names: ['promotion'],
        }}
      />,
    );

    expect(
      within(screen.getByTestId('model-schema-row-store_id')).getByText('ID column'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('model-schema-row-date')).getByText('Timestamp column'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('model-schema-row-promotion')).getByText('Known covariate'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('model-schema-row-temperature')).getByText('Past covariate'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('model-schema-row-sales')).not.toBeInTheDocument();
  });

  it('should list columns in training-data order by default, not alphabetically', () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([
        { name: 'zebra', type: 'string', task_type: 'regression' },
        { name: 'col2', type: 'double', task_type: 'regression' },
        { name: 'apple', type: 'integer', task_type: 'regression' },
      ]) as never,
    );
    render(<ModelSchemaTab {...tabularProps} />);

    const rows = screen
      .getAllByTestId(/^model-schema-row-/)
      .map((row) => row.getAttribute('data-testid'));
    expect(rows).toEqual(['model-schema-row-zebra', 'model-schema-row-apple']);
  });

  it('should sort columns by name when the name header is clicked', async () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([
        { name: 'zebra', type: 'string', task_type: 'regression' },
        { name: 'col2', type: 'double', task_type: 'regression' },
        { name: 'apple', type: 'integer', task_type: 'regression' },
      ]) as never,
    );
    const user = userEvent.setup();
    render(<ModelSchemaTab {...tabularProps} />);

    await user.click(screen.getByRole('button', { name: /Column name/i }));

    const rows = screen
      .getAllByTestId(/^model-schema-row-/)
      .map((row) => row.getAttribute('data-testid'));
    expect(rows).toEqual(['model-schema-row-apple', 'model-schema-row-zebra']);
  });

  it('should restore training-data order when the Order header is clicked after sorting by name', async () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(
      queryResult([
        { name: 'zebra', type: 'string', task_type: 'regression' },
        { name: 'col2', type: 'double', task_type: 'regression' },
        { name: 'apple', type: 'integer', task_type: 'regression' },
      ]) as never,
    );
    const user = userEvent.setup();
    render(<ModelSchemaTab {...tabularProps} />);

    await user.click(screen.getByRole('button', { name: /Column name/i }));
    await user.click(screen.getByRole('button', { name: /^Order/i }));

    const rows = screen
      .getAllByTestId(/^model-schema-row-/)
      .map((row) => row.getAttribute('data-testid'));
    expect(rows).toEqual(['model-schema-row-zebra', 'model-schema-row-apple']);
  });

  it('should filter columns by search', async () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
    const user = userEvent.setup();
    render(<ModelSchemaTab {...tabularProps} />);

    await user.type(screen.getByTestId('model-schema-search-input'), 'col1');

    expect(screen.getByTestId('model-schema-row-col1')).toBeInTheDocument();
    expect(screen.queryByTestId('model-schema-row-col3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-schema-search-empty-state')).not.toBeInTheDocument();
  });

  it('should show search empty state when no columns match', async () => {
    useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
    const user = userEvent.setup();
    render(<ModelSchemaTab {...tabularProps} />);

    await user.type(screen.getByTestId('model-schema-search-input'), 'nope');

    expect(screen.getByTestId('model-schema-search-empty-state')).toBeInTheDocument();
  });

  describe('model schema JSON section', () => {
    it('should be inactive until the JSON view toggle is selected', () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      render(<ModelSchemaTab {...tabularProps} />);

      expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'JSON' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByTestId('model-schema-json-code')).not.toBeInTheDocument();
    });

    it('should show the scoring payload template when the JSON view toggle is selected', async () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      const user = userEvent.setup();
      render(<ModelSchemaTab {...tabularProps} />);

      await user.click(screen.getByRole('button', { name: 'JSON' }));

      const code = screen.getByTestId('model-schema-json-code');
      expect(code).toBeVisible();
      // Keys in input order with normalized dtypes; the target (col2) is excluded.
      expect(code).toHaveTextContent('col1');
      expect(code).toHaveTextContent('<string>');
      expect(code).toHaveTextContent('<integer>');
      expect(code).not.toHaveTextContent('col2');
      const text = String(code.textContent);
      expect(text.indexOf('col1')).toBeLessThan(text.indexOf('col3'));
    });

    it('should copy the payload template to the clipboard when the copy button is clicked', async () => {
      const writeText = jest.fn();

      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      const user = userEvent.setup();
      render(<ModelSchemaTab {...tabularProps} />);

      // Install the clipboard mock after userEvent.setup(), which attaches its
      // own navigator.clipboard stub (and click via fireEvent so user-event's
      // stub stays out of the way).
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      await user.click(screen.getByRole('button', { name: 'JSON' }));
      fireEvent.click(screen.getByRole('button', { name: /copy/i }));

      expect(writeText).toHaveBeenCalledTimes(1);
      // The copied text is the full payload template, with the target (col2) excluded.
      const copied = writeText.mock.calls[0][0] as string;
      expect(copied).toContain('"instances"');
      expect(copied).toContain('"col1": ["<string>"]');
      expect(copied).not.toContain('col2');
    });

    it('should render from the inference input schema without fetching the CSV schema', () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([]) as never);
      render(
        <ModelSchemaTab
          {...tabularProps}
          model={{
            ...baseModel,
            inference: {
              input_data_schema: {
                protocol: 'v1_json',
                instances: {
                  required: true,
                  fields: [
                    { name: 'bedrooms', datatype: 'integer', role: 'feature', required: true },
                    { name: 'col2', datatype: 'number', role: 'feature', required: true },
                    { name: 'sqft', datatype: 'number', role: 'feature', required: true },
                    { name: 'location', datatype: 'string', role: 'feature', required: true },
                  ],
                },
              },
            },
          }}
        />,
      );

      expect(useS3GetFileSchemaQueryMock).toHaveBeenCalledWith(
        'test-ns',
        undefined,
        undefined,
        undefined,
      );

      fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
      const code = screen.getByTestId('model-schema-json-code');
      // Every input-schema field is preserved — the schema is the serving contract.
      // 'number' is normalized to 'double'.
      expect(code).toHaveTextContent('<integer>');
      expect(code).toHaveTextContent('<double>');
      expect(code).toHaveTextContent('col2');
    });
  });

  describe('with inference input_data_schema (model.json)', () => {
    const modelWithInference: AutomlModel = {
      ...baseModel,
      inference: {
        input_data_schema: {
          protocol: 'v1_json',
          instances: {
            required: true,
            fields: [
              { name: 'col1', datatype: 'string', shape: [-1], role: 'feature', required: true },
              { name: 'col2', datatype: 'number', shape: [-1], role: 'feature', required: true },
              { name: 'col3', datatype: 'integer', shape: [-1], role: 'feature', required: true },
            ],
          },
        },
      },
    };

    it('should render rows from the input schema without fetching the CSV schema', () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([]) as never);
      render(<ModelSchemaTab {...tabularProps} model={modelWithInference} />);

      // The S3 schema query is disabled: no secret/bucket/key arguments are passed.
      expect(useS3GetFileSchemaQueryMock).toHaveBeenCalledWith(
        'test-ns',
        undefined,
        undefined,
        undefined,
      );

      // Every input-schema field is preserved (the schema is the serving contract);
      // 'number' is normalized to Double.
      expect(screen.getByTestId('model-schema-row-col1')).toHaveTextContent('String');
      expect(screen.getByTestId('model-schema-row-col3')).toHaveTextContent('Integer');
      expect(screen.getByTestId('model-schema-row-col2')).toBeInTheDocument();
    });

    it('should keep the loading state while artifacts are loading', () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([]) as never);
      const { container } = render(
        <ModelSchemaTab {...tabularProps} model={modelWithInference} isArtifactsLoading />,
      );
      expect(container.querySelectorAll('.pf-v6-c-skeleton').length).toBeGreaterThan(0);
    });

    it('should mark fields missing from feature importance as not used', () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([]) as never);
      render(
        <ModelSchemaTab
          {...tabularProps}
          model={modelWithInference}
          featureImportance={{ importance: { col1: 0.7 } }}
        />,
      );

      expect(screen.getByTestId('model-schema-unused-col3')).toHaveTextContent(
        'Not used by this model',
      );
      expect(screen.queryByTestId('model-schema-unused-col1')).not.toBeInTheDocument();
    });

    it('should fall back to the CSV schema when the model has no inference block', () => {
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      render(<ModelSchemaTab {...tabularProps} />);

      expect(useS3GetFileSchemaQueryMock).toHaveBeenCalledWith(
        'test-ns',
        'secret',
        'bucket',
        'data.csv',
      );
      expect(screen.getByTestId('model-schema-row-col1')).toBeInTheDocument();
    });
  });

  describe('print readiness', () => {
    it('should call onPrintDataReady once the schema query settles', () => {
      const onPrintDataReady = jest.fn();
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      render(<ModelSchemaTab {...tabularProps} print onPrintDataReady={onPrintDataReady} />);

      expect(onPrintDataReady).toHaveBeenCalledTimes(1);
    });

    it('should not call onPrintDataReady while placeholder data is still fetching', () => {
      const onPrintDataReady = jest.fn();
      useS3GetFileSchemaQueryMock.mockReturnValue(
        queryResult([], { isPlaceholderData: true, isFetching: true }) as never,
      );
      const { rerender } = render(
        <ModelSchemaTab {...tabularProps} print onPrintDataReady={onPrintDataReady} />,
      );

      expect(onPrintDataReady).not.toHaveBeenCalled();

      // The fetch settles — readiness is reported so the print dialog can open.
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      rerender(<ModelSchemaTab {...tabularProps} print onPrintDataReady={onPrintDataReady} />);
      expect(onPrintDataReady).toHaveBeenCalledTimes(1);
    });

    it('should call onPrintDataReady immediately when the query is disabled', () => {
      // Input schema present — the CSV query never starts, so the tab is ready at once.
      const onPrintDataReady = jest.fn();
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult([]) as never);
      render(
        <ModelSchemaTab
          {...tabularProps}
          model={{
            ...baseModel,
            inference: {
              input_data_schema: {
                protocol: 'v1_json',
                instances: {
                  required: true,
                  fields: [{ name: 'col1', datatype: 'string', role: 'feature', required: true }],
                },
              },
            },
          }}
          print
          onPrintDataReady={onPrintDataReady}
        />,
      );

      expect(onPrintDataReady).toHaveBeenCalledTimes(1);
    });

    it('should call onPrintDataReady when the schema query errors', () => {
      const onPrintDataReady = jest.fn();
      useS3GetFileSchemaQueryMock.mockReturnValue(
        queryResult([], {
          isError: true,
          error: new Error('boom'),
          isFetching: false,
          isPlaceholderData: false,
        }) as never,
      );
      render(<ModelSchemaTab {...tabularProps} print onPrintDataReady={onPrintDataReady} />);

      expect(onPrintDataReady).toHaveBeenCalledTimes(1);
    });

    it('should not call onPrintDataReady outside print mode', () => {
      const onPrintDataReady = jest.fn();
      useS3GetFileSchemaQueryMock.mockReturnValue(queryResult(tabularColumns) as never);
      render(<ModelSchemaTab {...tabularProps} onPrintDataReady={onPrintDataReady} />);

      expect(onPrintDataReady).not.toHaveBeenCalled();
    });
  });
});
