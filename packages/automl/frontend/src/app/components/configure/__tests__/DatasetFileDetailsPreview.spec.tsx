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
