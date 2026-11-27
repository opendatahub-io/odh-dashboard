import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DatasetSamplingError from '~/app/components/configure/DatasetSamplingError';

describe('DatasetSamplingError', () => {
  it('should explain the bounded sample limit without suggesting more rows', () => {
    render(
      <DatasetSamplingError
        onRetry={jest.fn()}
        error={
          new Error('CSV validation error: could not sample 100 complete data rows within 1 MiB')
        }
      />,
    );
    expect(screen.getByTestId('dataset-sampling-error')).toHaveTextContent(
      'The first 100 complete data rows must fit within the 1 MiB sampling limit.',
    );
    expect(screen.queryByText(/at least 100 data rows/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('dataset-sampling-retry')).not.toBeInTheDocument();
  });
});
