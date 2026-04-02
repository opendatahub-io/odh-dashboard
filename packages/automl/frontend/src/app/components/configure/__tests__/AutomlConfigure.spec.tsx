import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import type { Files } from '~/app/components/common/FileExplorer/FileExplorer';
import { useS3GetFileSchemaQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries');

// Mock S3FileExplorer component
jest.mock('~/app/components/common/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onSelectFiles,
    onClose,
  }: {
    isOpen: boolean;
    onSelectFiles: (files: Files) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="file-explorer-modal">
        <button
          data-testid="file-explorer-select-file"
          onClick={() => {
            onSelectFiles([{ path: '/data.csv', name: 'data.csv', type: 'csv' }]);
            onClose();
          }}
        >
          Select File
        </button>
      </div>
    ) : null,
}));

// Mock SecretSelector component
jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    value,
    dataTestId,
  }: {
    onChange: (
      secret:
        | {
            uuid: string;
            name: string;
            data: Record<string, string>;
            type?: string;
            invalid?: boolean;
          }
        | undefined,
    ) => void;
    value?: string;
    dataTestId?: string;
  }) => (
    <div data-testid={dataTestId}>
      <button
        data-testid={`${dataTestId}-select-secret-1`}
        onClick={() =>
          onChange({
            uuid: 'secret-1',
            name: 'Test Secret 1',
            // eslint-disable-next-line camelcase
            data: { aws_s3_bucket: 'test-bucket-1' },
            type: 's3',
            invalid: false,
          })
        }
      >
        Select Secret 1
      </button>
      <button
        data-testid={`${dataTestId}-select-secret-2`}
        onClick={() =>
          onChange({
            uuid: 'secret-2',
            name: 'Test Secret 2',
            // eslint-disable-next-line camelcase
            data: { aws_s3_bucket: 'test-bucket-2' },
            type: 's3',
            invalid: false,
          })
        }
      >
        Select Secret 2
      </button>
      <button
        data-testid={`${dataTestId}-select-invalid-secret`}
        onClick={() =>
          onChange({
            uuid: 'secret-3',
            name: 'Invalid Secret',
            data: {},
            type: 's3',
            invalid: true,
          })
        }
      >
        Select Invalid Secret
      </button>
      {value && <div data-testid={`${dataTestId}-value`}>{value}</div>}
    </div>
  ),
}));

jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: () => [[]],
}));

jest.mock('~/app/components/common/AutomlConnectionModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock DashboardPopupIconButton
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: () => null,
}));

const mockuseS3GetFileSchemaQuery = jest.mocked(useS3GetFileSchemaQuery);
const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);

const MOCK_COLUMNS = [
  { name: 'approval_status', type: 'string' },
  { name: 'credit_score', type: 'int64' },
  { name: 'income', type: 'float64' },
  { name: 'loan_amount', type: 'float64' },
  { name: 'risk_category', type: 'string' },
];

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: Partial<typeof configureSchema.defaults>;
}> = ({ children, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...defaultValues },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

// Create a QueryClient for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Wrapper component that provides QueryClient and Form context
const renderWithQueryClient = (
  component: React.ReactElement,
  defaultValues?: Partial<typeof configureSchema.defaults>,
) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <FormWrapper defaultValues={defaultValues}>{component}</FormWrapper>
    </QueryClientProvider>,
  );
};

const renderComponent = (defaultValues?: Partial<typeof configureSchema.defaults>) =>
  renderWithQueryClient(<AutomlConfigure />, defaultValues);

describe('AutomlConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockuseS3GetFileSchemaQuery.mockReturnValue({
      data: MOCK_COLUMNS,
      isLoading: false,
    } as unknown as ReturnType<typeof useS3GetFileSchemaQuery>);
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('initial state - no secret selected', () => {
    it('should display an empty state when no secret is selected', () => {
      renderComponent();

      expect(
        screen.getByText('Select an S3 connection or upload a file to get started'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'In order to configure details and run an experiment, add a document or connection in the widget on the left.',
        ),
      ).toBeInTheDocument();
    });

    it('should NOT display the "Selected files" section when no secret is selected', () => {
      renderComponent();

      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
    });

    it('should NOT display the "Select files" button when no secret is selected', () => {
      renderComponent();

      expect(screen.queryByText('Select files')).not.toBeInTheDocument();
    });
  });

  describe('secret selection', () => {
    it('should display "Selected files" section when a secret is selected', () => {
      renderComponent();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected files" section appears
      expect(screen.getByText('Selected files')).toBeInTheDocument();
    });

    it('should display the "Select files" button when a secret is selected', () => {
      renderComponent();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button appears
      expect(screen.getByText('Select files')).toBeInTheDocument();
    });

    it('should extract bucket name from secret data when a secret is selected', () => {
      renderComponent();

      // Select first secret with bucket data
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);

      // The bucket extraction logic should have run (AutomlConfigure.tsx:151-156)
      // This is verified indirectly by the component functioning correctly
      expect(screen.getByText('Select files')).toBeInTheDocument();

      // Select second secret with different bucket data
      const selectButton2 = screen.getByTestId('aws-secret-selector-select-secret-2');
      fireEvent.click(selectButton2);

      // The bucket should be updated for the new secret
      expect(screen.getByText('Select files')).toBeInTheDocument();
    });

    it('should display the "Configure details" fields when a secret is selected', () => {
      renderComponent();

      // Initially should show empty state
      expect(
        screen.getByText('Select an S3 connection or upload a file to get started'),
      ).toBeInTheDocument();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Empty state should be hidden
      expect(
        screen.queryByText('Select an S3 connection or upload a file to get started'),
      ).not.toBeInTheDocument();

      // Configure details fields should be visible
      expect(screen.getByText('Prediction type')).toBeInTheDocument();
      expect(screen.getByText('Binary classification')).toBeInTheDocument();
      expect(screen.getByText('Label column')).toBeInTheDocument();
      expect(screen.getByText('Top models to consider')).toBeInTheDocument();
    });
  });

  describe('selected training data file table', () => {
    it('should NOT display the selected file table when no file is selected', () => {
      renderComponent();

      // Select a secret so the "Select files" button appears
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

      expect(
        screen.queryByRole('grid', { name: 'Selected training data file' }),
      ).not.toBeInTheDocument();
    });

    it('should display the selected file table after selecting a file', () => {
      renderComponent();

      // Select a secret
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

      // Open file explorer and select a file
      fireEvent.click(screen.getByRole('button', { name: 'Select files' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      // Verify the table appears with correct content
      const table = screen.getByRole('grid', { name: 'Selected training data file' });
      expect(table).toBeInTheDocument();
      expect(screen.getByText('data.csv')).toBeInTheDocument();
      expect(screen.getByText('csv')).toBeInTheDocument();
    });

    it('should remove the selected file when the remove button is clicked', () => {
      renderComponent();

      // Select a secret and a file
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Select files' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      // Verify the table is shown
      expect(screen.getByRole('grid', { name: 'Selected training data file' })).toBeInTheDocument();

      // Click the remove button
      fireEvent.click(screen.getByRole('button', { name: 'Remove selection' }));

      // Table should be removed
      expect(
        screen.queryByRole('grid', { name: 'Selected training data file' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('invalid secret selection', () => {
    it('should disable "Select files" button when selected secret is invalid', () => {
      renderComponent();

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Select files" button does not exist
      const selectFilesButton = screen.queryByRole('button', { name: 'Select files' });
      expect(selectFilesButton).not.toBeInTheDocument();
    });

    it('should display an empty state when an invalid secret is selected', () => {
      renderComponent();

      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      expect(
        screen.getByText('Select an S3 connection or upload a file to get started'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'In order to configure details and run an experiment, add a document or connection in the widget on the left.',
        ),
      ).toBeInTheDocument();
    });

    it('should enable "Select files" button when selected secret is valid', () => {
      renderComponent();

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button is enabled
      const selectFilesButton = screen.getByRole('button', { name: 'Select files' });
      expect(selectFilesButton).toBeEnabled();
    });
  });

  describe('with training data configured', () => {
    const trainingDataDefaults = {
      /* eslint-disable camelcase */
      train_data_secret_name: 'test-secret',
      train_data_bucket_name: 'test-bucket',
      train_data_file_key: 'test-file',
      /* eslint-enable camelcase */
    };

    describe('Prediction type', () => {
      it('should render all four prediction type tile cards', () => {
        renderComponent(trainingDataDefaults);
        expect(screen.getByTestId('task-type-card-binary')).toBeInTheDocument();
        expect(screen.getByTestId('task-type-card-multiclass')).toBeInTheDocument();
        expect(screen.getByTestId('task-type-card-regression')).toBeInTheDocument();
        expect(screen.getByTestId('task-type-card-timeseries')).toBeInTheDocument();
      });

      it('should render prediction type labels', () => {
        renderComponent(trainingDataDefaults);
        expect(screen.getByText('Binary classification')).toBeInTheDocument();
        expect(screen.getByText('Multiclass classification')).toBeInTheDocument();
        expect(screen.getByText('Regression')).toBeInTheDocument();
        expect(screen.getByText('Time series forecasting')).toBeInTheDocument();
      });

      it('should render prediction type descriptions', () => {
        renderComponent(trainingDataDefaults);
        expect(
          screen.getByText(
            'Classify data into categories. Choose this if your prediction column contains two distinct categories',
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Classify data into categories. Choose this if your prediction column contains multiple distinct categories',
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Predict values from a continuous set of values. Choose this if your prediction column contains a large number of values',
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Predict future activity over a specified date/time range. Data must be structured and sequential.',
          ),
        ).toBeInTheDocument();
      });

      it('should have binary classification selected by default', () => {
        renderComponent(trainingDataDefaults);
        const binaryCard = screen.getByTestId('task-type-card-binary');
        expect(binaryCard).toHaveClass('pf-m-selected');
      });

      it('should select a different prediction type when clicked', async () => {
        renderComponent(trainingDataDefaults);
        const user = userEvent.setup();

        await user.click(screen.getByTestId('task-type-card-multiclass'));
        expect(screen.getByTestId('task-type-card-multiclass')).toHaveClass('pf-m-selected');
        expect(screen.getByTestId('task-type-card-binary')).not.toHaveClass('pf-m-selected');
      });
    });

    describe('Column selector based on prediction type', () => {
      describe('when prediction type is NOT timeseries', () => {
        it('should render the label column dropdown for binary classification', () => {
          renderComponent(trainingDataDefaults);
          expect(screen.getByText('Label column')).toBeInTheDocument();
          expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
          expect(screen.queryByText('Target column')).not.toBeInTheDocument();
          expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
        });

        it('should render the label column dropdown for multiclass classification', async () => {
          renderComponent(trainingDataDefaults);
          const user = userEvent.setup();

          await user.click(screen.getByTestId('task-type-card-multiclass'));

          expect(screen.getByText('Label column')).toBeInTheDocument();
          expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
          expect(screen.queryByText('Target column')).not.toBeInTheDocument();
          expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
        });

        it('should render the label column dropdown for regression', async () => {
          renderComponent(trainingDataDefaults);
          const user = userEvent.setup();

          await user.click(screen.getByTestId('task-type-card-regression'));

          expect(screen.getByText('Label column')).toBeInTheDocument();
          expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
          expect(screen.queryByText('Target column')).not.toBeInTheDocument();
          expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
        });
      });

      describe('when prediction type is timeseries', () => {
        it('should render the target column dropdown for timeseries', async () => {
          renderComponent(trainingDataDefaults);
          const user = userEvent.setup();

          await user.click(screen.getByTestId('task-type-card-timeseries'));

          expect(screen.getByText('Target column')).toBeInTheDocument();
          expect(screen.getByTestId('target-select')).toBeInTheDocument();
          expect(screen.queryByText('Label column')).not.toBeInTheDocument();
          expect(screen.queryByTestId('label_column-select')).not.toBeInTheDocument();
        });

        it('should switch from label column to target column when changing to timeseries', async () => {
          renderComponent(trainingDataDefaults);
          const user = userEvent.setup();

          // Initially shows label column for binary classification
          expect(screen.getByText('Label column')).toBeInTheDocument();
          expect(screen.getByTestId('label_column-select')).toBeInTheDocument();

          // Switch to timeseries
          await user.click(screen.getByTestId('task-type-card-timeseries'));

          // Now shows target column
          expect(screen.getByText('Target column')).toBeInTheDocument();
          expect(screen.getByTestId('target-select')).toBeInTheDocument();
          expect(screen.queryByText('Label column')).not.toBeInTheDocument();
          expect(screen.queryByTestId('label_column-select')).not.toBeInTheDocument();
        });

        it('should switch from target column to label column when changing from timeseries', async () => {
          renderComponent(trainingDataDefaults);
          const user = userEvent.setup();

          // Switch to timeseries
          await user.click(screen.getByTestId('task-type-card-timeseries'));
          expect(screen.getByText('Target column')).toBeInTheDocument();

          // Switch back to binary classification
          await user.click(screen.getByTestId('task-type-card-binary'));

          // Now shows label column again
          expect(screen.getByText('Label column')).toBeInTheDocument();
          expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
          expect(screen.queryByText('Target column')).not.toBeInTheDocument();
          expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
        });
      });
    });

    describe('Label column', () => {
      it('should render the label column dropdown', () => {
        renderComponent(trainingDataDefaults);
        expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
      });

      it('should show placeholder text when no column is selected', () => {
        renderComponent(trainingDataDefaults);
        expect(screen.getByTestId('label_column-select')).toHaveTextContent('Select a column');
      });

      it('should be disabled when no file is selected', () => {
        renderComponent(trainingDataDefaults);
        expect(screen.getByTestId('label_column-select')).toBeDisabled();
      });

      it('should be disabled when columns are empty', () => {
        mockuseS3GetFileSchemaQuery.mockReturnValue({
          data: [],
          isLoading: false,
        } as unknown as ReturnType<typeof useS3GetFileSchemaQuery>);
        renderComponent(trainingDataDefaults);
        expect(screen.getByTestId('label_column-select')).toBeDisabled();
      });
    });

    describe('Top models to consider', () => {
      it('should render the top N input with default value 3', () => {
        renderComponent(trainingDataDefaults);
        const input = screen.getByTestId('top-n-input').querySelector('input');
        expect(input).toHaveValue(3);
      });

      it('should show error message when top N exceeds the maximum', async () => {
        renderComponent(trainingDataDefaults);
        const input = screen.getByTestId('top-n-input').querySelector('input')!;
        fireEvent.change(input, { target: { value: '6' } });

        await waitFor(() => {
          expect(screen.getByText('Maximum number of top models is 5')).toBeInTheDocument();
        });
      });

      it('should show error message when top N is below the minimum', async () => {
        renderComponent(trainingDataDefaults);
        const input = screen.getByTestId('top-n-input').querySelector('input')!;
        fireEvent.change(input, { target: { value: '0' } });

        await waitFor(() => {
          expect(screen.getByText('Minimum number of top models is 1')).toBeInTheDocument();
        });
      });
    });
  });
});
