/* eslint-disable camelcase -- API column names */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import DatasetFilePreview from '~/app/components/configure/DatasetFilePreview';
import DatasetFileDetailsPreview from '~/app/components/configure/DatasetFileDetailsPreview';
import { useS3GetFileSchemaQuery } from '~/app/hooks/useS3GetFileSchemaQuery';

jest.mock('~/app/hooks/useS3GetFileSchemaQuery');

describe('DatasetFileDetailsPreview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should preview three sampled rows and open the full file', () => {
    jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
      sample: {
        columns: [{ name: 'value', type: 'string', task_type: 'multiclass' }],
        sampleRows: [['first'], ['second'], ['third'], ['fourth']],
        sampleSize: 4,
        parseWarnings: 0,
      },
      isFetching: false,
    } as ReturnType<typeof useS3GetFileSchemaQuery>);
    const onViewFile = jest.fn();
    render(
      <DatasetFileDetailsPreview
        namespace="ns"
        secretName="s3"
        fileKey="data.csv"
        onViewFile={onViewFile}
      />,
    );
    expect(screen.getByText('Previewing 3 sampled rows.')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Sample of data.csv' })).toHaveTextContent('third');
    expect(screen.queryByText('fourth')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View file' }));
    expect(onViewFile).toHaveBeenCalledTimes(1);
  });

  it('should show twenty rows in View file and paginate the remaining rows', () => {
    jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
      sample: {
        columns: [{ name: 'value', type: 'string', task_type: 'multiclass' }],
        sampleRows: Array.from({ length: 25 }, (_, index) => [`row-${index + 1}`]),
        sampleSize: 25,
        parseWarnings: 0,
      },
      isFetching: false,
    } as ReturnType<typeof useS3GetFileSchemaQuery>);
    render(
      <DatasetFilePreview namespace="ns" secretName="s3" fileKey="data.csv" onClose={jest.fn()} />,
    );
    expect(screen.getByText('row-1')).toBeInTheDocument();
    expect(screen.getByText('row-20')).toBeInTheDocument();
    expect(screen.queryByText('row-21')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(screen.getByText('row-21')).toBeInTheDocument();
    expect(screen.getByText('row-25')).toBeInTheDocument();
    expect(screen.queryByText('row-20')).not.toBeInTheDocument();
  });

  it.each([DatasetFileDetailsPreview, DatasetFilePreview])(
    'should wait for a connection without showing an unavailable preview',
    (Preview) => {
      jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
        sample: { columns: [], sampleRows: [], sampleSize: 0, parseWarnings: 0 },
        isFetching: false,
        isPaused: true,
      } as unknown as ReturnType<typeof useS3GetFileSchemaQuery>);
      render(
        <Preview
          namespace="ns"
          secretName="s3"
          fileKey="data.csv"
          onViewFile={jest.fn()}
          onClose={jest.fn()}
        />,
      );
      expect(screen.getByRole('status')).toHaveTextContent('Waiting for connection…');
      expect(screen.queryByText('File preview is unavailable.')).not.toBeInTheDocument();
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    },
  );

  it('should preserve the current page through refreshing, pausing, and a failed refetch', () => {
    const query = {
      sample: {
        columns: [{ name: 'value', type: 'string', task_type: 'multiclass' }],
        sampleRows: Array.from({ length: 25 }, (_, index) => [`row-${index + 1}`]),
        sampleSize: 25,
        parseWarnings: 0,
      },
      isFetching: false,
      isPaused: false,
      refetch: jest.fn(),
      error: null,
    } as unknown as ReturnType<typeof useS3GetFileSchemaQuery>;
    jest.mocked(useS3GetFileSchemaQuery).mockReturnValue(query);
    const preview = (
      <DatasetFilePreview namespace="ns" secretName="s3" fileKey="data.csv" onClose={jest.fn()} />
    );
    const { rerender } = render(preview);
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    const table = screen.getByRole('grid');

    for (const state of [
      { isFetching: true, isPaused: false, error: null },
      { isFetching: false, isPaused: true, error: null },
      { isFetching: false, isPaused: false, error: new Error('Sampling failed') },
      { isFetching: false, isPaused: false, error: null },
    ]) {
      jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({ ...query, ...state });
      rerender(
        <DatasetFilePreview
          namespace="ns"
          secretName="s3"
          fileKey="data.csv"
          onClose={jest.fn()}
        />,
      );
      expect(screen.getByRole('grid')).toBe(table);
      expect(table).toHaveTextContent('row-21');
      expect(screen.queryByText('row-1')).not.toBeInTheDocument();
      if (state.isFetching) {
        expect(screen.getByRole('status')).toHaveTextContent('Refreshing file preview…');
      } else if (state.isPaused) {
        expect(screen.getByRole('status')).toHaveTextContent('Waiting for connection…');
      } else if (state.error) {
        expect(screen.getByTestId('dataset-sampling-error')).toBeInTheDocument();
      }
    }
  });

  it.each([DatasetFileDetailsPreview, DatasetFilePreview])(
    'should disclose skipped records in a direct preview',
    (Preview) => {
      jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
        sample: {
          columns: [{ name: 'value', type: 'string', task_type: 'multiclass' }],
          sampleRows: [['valid row']],
          sampleSize: 1,
          parseWarnings: 2,
        },
        isFetching: false,
      } as ReturnType<typeof useS3GetFileSchemaQuery>);
      render(
        <Preview
          namespace="ns"
          secretName="s3"
          fileKey="data.csv"
          onViewFile={jest.fn()}
          onClose={jest.fn()}
        />,
      );
      expect(screen.getByText('Some rows could not be sampled')).toBeInTheDocument();
      expect(
        screen.getByText(/Skipped 2 rows because they could not be parsed/),
      ).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'valid row' })).toBeInTheDocument();
    },
  );

  it.each([DatasetFileDetailsPreview, DatasetFilePreview])(
    'should retry a failed sample without changing the file',
    (Preview) => {
      const refetch = jest.fn();
      jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
        error: new Error('Sampling failed'),
        isFetching: false,
        refetch,
      } as unknown as ReturnType<typeof useS3GetFileSchemaQuery>);
      render(
        <Preview
          namespace="ns"
          secretName="s3"
          bucket="bucket"
          fileKey="data.csv"
          onViewFile={jest.fn()}
          onClose={jest.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('dataset-sampling-retry'));
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(useS3GetFileSchemaQuery).toHaveBeenLastCalledWith('ns', 's3', 'bucket', 'data.csv');
    },
  );

  it.each([DatasetFileDetailsPreview, DatasetFilePreview])(
    'should explain deterministic CSV validation errors without offering a retry',
    (Preview) => {
      jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
        error: new Error(
          'Failed to fetch file: CSV validation error: file must have at least 100 data rows (found 1)',
        ),
        isFetching: false,
      } as ReturnType<typeof useS3GetFileSchemaQuery>);
      render(
        <Preview
          namespace="ns"
          secretName="s3"
          fileKey="small.csv"
          onViewFile={jest.fn()}
          onClose={jest.fn()}
        />,
      );
      expect(screen.getByTestId('dataset-sampling-error')).toHaveTextContent(
        'Use a UTF-8 CSV file with a header and at least 100 data rows.',
      );
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    },
  );

  it('should offer retry without an empty table or row count when preview rows are unavailable', () => {
    const refetch = jest.fn();
    jest.mocked(useS3GetFileSchemaQuery).mockReturnValue({
      sample: {
        columns: [{ name: 'value', type: 'string', task_type: 'multiclass' }],
        sampleRows: [],
        sampleSize: 0,
        parseWarnings: 0,
      },
      isFetching: false,
      refetch,
    } as unknown as ReturnType<typeof useS3GetFileSchemaQuery>);
    render(
      <DatasetFileDetailsPreview
        namespace="ns"
        secretName="s3"
        fileKey="data.csv"
        onViewFile={jest.fn()}
      />,
    );
    expect(screen.getByText('File preview is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(/Previewing/)).not.toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View file' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
