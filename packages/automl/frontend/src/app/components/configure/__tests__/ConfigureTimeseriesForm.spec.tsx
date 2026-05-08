import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import ConfigureTimeseriesForm from '~/app/components/configure/ConfigureTimeseriesForm';

// Mock DashboardPopupIconButton
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: () => null,
}));

const TestWrapper = ({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}) => {
  const methods = useForm({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('ConfigureTimeseriesForm', () => {
  const mockColumns = [
    { name: 'timestamp', type: 'timestamp' },
    { name: 'value', type: 'double' },
    { name: 'product_id', type: 'string' },
    { name: 'temperature', type: 'double' },
    { name: 'humidity', type: 'double' },
  ];

  describe('loading state', () => {
    it('should show skeleton loaders for all select fields when isLoadingColumns is true', () => {
      const { container } = render(
        <TestWrapper>
          <ConfigureTimeseriesForm
            columns={[]}
            isLoadingColumns
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
      // Should have 3 skeletons: timestamp_column, id_column, known_covariates
      expect(skeletons.length).toBe(3);

      // Verify selects are not rendered
      expect(screen.queryByTestId('timestamp_column-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('id_column-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('known_covariates_names-select')).not.toBeInTheDocument();
    });

    it('should show skeleton loaders when isFetchingColumns is true', () => {
      const { container } = render(
        <TestWrapper>
          <ConfigureTimeseriesForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const skeletons = container.querySelectorAll('.pf-v6-c-skeleton');
      expect(skeletons.length).toBe(3);

      expect(screen.queryByTestId('timestamp_column-select')).not.toBeInTheDocument();
    });

    it('should show select components when not loading', () => {
      render(
        <TestWrapper>
          <ConfigureTimeseriesForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('timestamp_column-select')).toBeInTheDocument();
      expect(screen.getByTestId('id_column-select')).toBeInTheDocument();
      expect(screen.getByTestId('known_covariates_names-select')).toBeInTheDocument();
    });
  });

  describe('column exclusivity', () => {
    it('should render with pre-selected column values', () => {
      render(
        // eslint-disable-next-line camelcase
        <TestWrapper defaultValues={{ timestamp_column: 'timestamp' }}>
          <ConfigureTimeseriesForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('timestamp_column-select')).toHaveTextContent('timestamp');
    });
  });

  describe('select component states', () => {
    it('should disable all select components when file is not selected', () => {
      render(
        <TestWrapper>
          <ConfigureTimeseriesForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected={false}
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('timestamp_column-select')).toBeDisabled();
      expect(screen.getByTestId('id_column-select')).toBeDisabled();
      expect(screen.getByTestId('known_covariates_names-select')).toBeDisabled();
    });

    it('should show danger status on selects when columnsError is present', () => {
      render(
        <TestWrapper>
          <ConfigureTimeseriesForm
            columns={[]}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={new Error('Failed to load columns')}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('timestamp_column-select')).toHaveClass('pf-m-danger');
      expect(screen.getByTestId('id_column-select')).toHaveClass('pf-m-danger');
      expect(screen.getByTestId('known_covariates_names-select')).toHaveClass('pf-m-danger');
    });

    it('should not disable prediction_length input when loading columns', () => {
      render(
        // eslint-disable-next-line camelcase
        <TestWrapper defaultValues={{ prediction_length: 5 }}>
          <ConfigureTimeseriesForm
            columns={[]}
            isLoadingColumns
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const predictionLengthContainer = screen.getByTestId('prediction-length-input');
      const inputElement = predictionLengthContainer.querySelector('input');
      expect(inputElement).not.toBeDisabled();
    });

    it('should disable prediction_length input when form is submitting', () => {
      render(
        // eslint-disable-next-line camelcase
        <TestWrapper defaultValues={{ prediction_length: 5 }}>
          <ConfigureTimeseriesForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting
          />
        </TestWrapper>,
      );

      const predictionLengthContainer = screen.getByTestId('prediction-length-input');
      const inputElement = predictionLengthContainer.querySelector('input');
      expect(inputElement).toBeDisabled();
    });
  });
});
