/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import ConfigureTestDataset from '~/app/components/configure/ConfigureTestDataset';

// Mock S3FileExplorer
jest.mock('@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onSelectFiles,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectFiles: (files: { name: string; path: string; type: string }[]) => void;
  }) =>
    isOpen ? (
      <div data-testid="mock-s3-file-explorer">
        <button
          data-testid="mock-select-file"
          onClick={() => {
            onSelectFiles([{ name: 'test-data.csv', path: '/test-data.csv', type: 'csv' }]);
            onClose();
          }}
        >
          Select File
        </button>
      </div>
    ) : null,
}));

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

describe('ConfigureTestDataset', () => {
  const defaultProps = {
    namespace: 'test-namespace',
    s3SecretName: 'my-secret',
    isDisabled: false,
  };

  it('should render the browse bucket button', () => {
    render(
      <TestWrapper>
        <ConfigureTestDataset {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByTestId('test-dataset-section')).toBeInTheDocument();
    expect(screen.getByTestId('test-data-browse-bucket-button')).toBeInTheDocument();
    expect(screen.getByTestId('test-data-browse-bucket-button')).toHaveTextContent('Browse bucket');
  });

  it('should disable browse button when form is submitting', () => {
    render(
      <TestWrapper>
        <ConfigureTestDataset {...defaultProps} isDisabled />
      </TestWrapper>,
    );

    expect(screen.getByTestId('test-data-browse-bucket-button')).toBeDisabled();
  });

  it('should open file explorer when browse button is clicked', () => {
    render(
      <TestWrapper>
        <ConfigureTestDataset {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.queryByTestId('mock-s3-file-explorer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('test-data-browse-bucket-button'));
    expect(screen.getByTestId('mock-s3-file-explorer')).toBeInTheDocument();
  });

  it('should display selected file name after selection', () => {
    render(
      <TestWrapper>
        <ConfigureTestDataset {...defaultProps} />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId('test-data-browse-bucket-button'));
    fireEvent.click(screen.getByTestId('mock-select-file'));

    expect(screen.getByText('test-data.csv')).toBeInTheDocument();
    expect(screen.getByTestId('test-data-file-remove')).toBeInTheDocument();
  });

  it('should clear selection when remove button is clicked', () => {
    render(
      <TestWrapper>
        <ConfigureTestDataset {...defaultProps} />
      </TestWrapper>,
    );

    // Select a file
    fireEvent.click(screen.getByTestId('test-data-browse-bucket-button'));
    fireEvent.click(screen.getByTestId('mock-select-file'));
    expect(screen.getByText('test-data.csv')).toBeInTheDocument();

    // Remove the file
    fireEvent.click(screen.getByTestId('test-data-file-remove'));
    expect(screen.queryByText('test-data.csv')).not.toBeInTheDocument();
  });

  it('should initialize from existing form value', () => {
    render(
      <TestWrapper defaultValues={{ test_data_s3_key: 'existing/file.csv' }}>
        <ConfigureTestDataset {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('file.csv')).toBeInTheDocument();
  });
});
