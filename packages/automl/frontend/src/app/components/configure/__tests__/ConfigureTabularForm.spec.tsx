import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import ConfigureTabularForm from '~/app/components/configure/ConfigureTabularForm';

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

describe('ConfigureTabularForm', () => {
  const mockColumns = [
    { name: 'id', type: 'integer' },
    { name: 'name', type: 'string' },
    { name: 'age', type: 'double' },
  ];

  describe('loading state', () => {
    it('should show skeleton loader when isLoadingColumns is true', () => {
      const { container } = render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={[]}
            isLoadingColumns
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const skeleton = container.querySelector('.pf-v6-c-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(screen.queryByTestId('label_column-select')).not.toBeInTheDocument();
    });

    it('should show skeleton loader when isFetchingColumns is true', () => {
      const { container } = render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const skeleton = container.querySelector('.pf-v6-c-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(screen.queryByTestId('label_column-select')).not.toBeInTheDocument();
    });

    it('should show skeleton loader when both isLoadingColumns and isFetchingColumns are true', () => {
      const { container } = render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={[]}
            isLoadingColumns
            isFetchingColumns
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const skeleton = container.querySelector('.pf-v6-c-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(screen.queryByTestId('label_column-select')).not.toBeInTheDocument();
    });

    it('should show select component when not loading', () => {
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const selectToggle = screen.getByTestId('label_column-select');
      expect(selectToggle).toBeInTheDocument();
    });
  });

  describe('select component', () => {
    it('should be disabled when file is not selected', () => {
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected={false}
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const selectToggle = screen.getByTestId('label_column-select');
      expect(selectToggle).toBeDisabled();
    });

    it('should be disabled when columns are empty', () => {
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={[]}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const selectToggle = screen.getByTestId('label_column-select');
      expect(selectToggle).toBeDisabled();
    });

    it('should be disabled when there is a columns error', () => {
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={[]}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={new Error('Failed to load columns')}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const selectToggle = screen.getByTestId('label_column-select');
      expect(selectToggle).toBeDisabled();
    });

    it('should be disabled when form is submitting', () => {
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting
          />
        </TestWrapper>,
      );

      const selectToggle = screen.getByTestId('label_column-select');
      expect(selectToggle).toBeDisabled();
    });

    it('should be enabled when conditions are met', () => {
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={mockColumns}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={null}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      const selectToggle = screen.getByTestId('label_column-select');
      expect(selectToggle).not.toBeDisabled();
    });

    it('should show error message when columnsError is present', () => {
      const errorMessage = 'Failed to load columns';
      render(
        <TestWrapper>
          <ConfigureTabularForm
            columns={[]}
            isLoadingColumns={false}
            isFetchingColumns={false}
            columnsError={new Error(errorMessage)}
            isFileSelected
            formIsSubmitting={false}
          />
        </TestWrapper>,
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
