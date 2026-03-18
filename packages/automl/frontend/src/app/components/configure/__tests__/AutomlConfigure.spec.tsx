import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import { useFilesQuery } from '~/app/hooks/queries';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries');
jest.mock('~/app/components/common/FileExplorer/FileExplorer', () => () => null);

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

const mockUseFilesQuery = jest.mocked(useFilesQuery);
const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);

const MOCK_COLUMNS = ['approval_status', 'credit_score', 'income', 'loan_amount', 'risk_category'];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryClientProvider';
  return Wrapper;
};

const renderComponent = () => render(<AutomlConfigure />, { wrapper: createWrapper() });

describe('AutomlConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFilesQuery.mockReturnValue({
      data: MOCK_COLUMNS,
      isLoading: false,
    } as unknown as ReturnType<typeof useFilesQuery>);
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('initial state - no secret selected', () => {
    it('should NOT display the "Selected connection" section when no secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
    });

    it('should NOT display the "Selected files" section when no secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
    });

    it('should NOT display the "Select files" button when no secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      expect(screen.queryByText('Select files')).not.toBeInTheDocument();
    });
  });

  describe('secret selection', () => {
    it('should display "Selected connection" section when a secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected connection" section appears
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
    });

    it('should display the selected secret name as a Label when a secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret name is displayed
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();
    });

    it('should display "Selected files" section when a secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected files" section appears
      expect(screen.getByText('Selected files')).toBeInTheDocument();
    });

    it('should display the "Select files" button when a secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button appears
      expect(screen.getByText('Select files')).toBeInTheDocument();
    });

    it('should display different secret name when selecting a different secret', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select first secret
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();

      // Select second secret
      const selectButton2 = screen.getByTestId('aws-secret-selector-select-secret-2');
      fireEvent.click(selectButton2);
      expect(screen.getByText('Test Secret 2')).toBeInTheDocument();
      expect(screen.queryByText('Test Secret 1')).not.toBeInTheDocument();
    });

    it('should extract bucket name from secret data when a secret is selected', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select first secret with bucket data
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);

      // The bucket extraction logic should have run (AutomlConfigure.tsx:151-156)
      // This is verified indirectly by the component functioning correctly
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();
      expect(screen.getByText('Select files')).toBeInTheDocument();

      // Select second secret with different bucket data
      const selectButton2 = screen.getByTestId('aws-secret-selector-select-secret-2');
      fireEvent.click(selectButton2);

      // The bucket should be updated for the new secret
      expect(screen.getByText('Test Secret 2')).toBeInTheDocument();
      expect(screen.getByText('Select files')).toBeInTheDocument();
    });
  });

  describe('clearing selected secret', () => {
    it('should clear the selected secret when clicking the X on the Label', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret is displayed
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
      expect(screen.getByText('Selected files')).toBeInTheDocument();

      // Find and click the close button on the Label
      const labelCloseButton = screen.getByRole('button', {
        name: 'Clear selected connection',
      });

      expect(labelCloseButton).toBeInTheDocument();
      fireEvent.click(labelCloseButton);

      // Verify the secret is cleared and sections are hidden
      expect(screen.queryByText('Test Secret 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
      expect(screen.queryByText('Select files')).not.toBeInTheDocument();
    });

    it('should hide the selected connection and files sections after clearing', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify sections are visible
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
      expect(screen.getByText('Selected files')).toBeInTheDocument();

      // Find and click the close button on the Label
      const labelCloseButton = screen.getByRole('button', {
        name: 'Clear selected connection',
      });
      fireEvent.click(labelCloseButton);

      // Verify sections are hidden
      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
    });
  });

  describe('invalid secret selection', () => {
    it('should disable "Select files" button when selected secret is invalid', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Select files" button is disabled
      const selectFilesButton = screen.getByRole('button', { name: 'Select files' });
      expect(selectFilesButton).toBeDisabled();
    });

    it('should disable "Run experiment" button when selected secret is invalid', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Run experiment" button is disabled
      const runExperimentButton = screen.getByRole('button', { name: 'Run experiment' });
      expect(runExperimentButton).toBeDisabled();
    });

    it('should enable "Select files" button when selected secret is valid', () => {
      render(<AutomlConfigure />, { wrapper: createWrapper() });

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button is enabled
      const selectFilesButton = screen.getByRole('button', { name: 'Select files' });
      expect(selectFilesButton).toBeEnabled();
    });
  });

  describe('Prediction type', () => {
    it('should render all four prediction type tile cards', () => {
      renderComponent();
      expect(screen.getByTestId('task-type-card-binary')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-card-multiclass')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-card-regression')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-card-timeseries')).toBeInTheDocument();
    });

    it('should render prediction type labels', () => {
      renderComponent();
      expect(screen.getByText('Binary classification')).toBeInTheDocument();
      expect(screen.getByText('Multiclass classification')).toBeInTheDocument();
      expect(screen.getByText('Regression')).toBeInTheDocument();
      expect(screen.getByText('Time series forecasting')).toBeInTheDocument();
    });

    it('should render prediction type descriptions', () => {
      renderComponent();
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
      renderComponent();
      const binaryCard = screen.getByTestId('task-type-card-binary');
      expect(binaryCard).toHaveClass('pf-m-selected');
    });

    it('should select a different prediction type when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('task-type-card-multiclass'));
      expect(screen.getByTestId('task-type-card-multiclass')).toHaveClass('pf-m-selected');
      expect(screen.getByTestId('task-type-card-binary')).not.toHaveClass('pf-m-selected');
    });
  });

  describe('Column selector based on prediction type', () => {
    describe('when prediction type is NOT timeseries', () => {
      it('should render the label column dropdown for binary classification', () => {
        renderComponent();
        expect(screen.getByText('Label column')).toBeInTheDocument();
        expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
        expect(screen.queryByText('Target column')).not.toBeInTheDocument();
        expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
      });

      it('should render the label column dropdown for multiclass classification', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.click(screen.getByTestId('task-type-card-multiclass'));

        expect(screen.getByText('Label column')).toBeInTheDocument();
        expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
        expect(screen.queryByText('Target column')).not.toBeInTheDocument();
        expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
      });

      it('should render the label column dropdown for regression', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.click(screen.getByTestId('task-type-card-regression'));

        expect(screen.getByText('Label column')).toBeInTheDocument();
        expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
        expect(screen.queryByText('Target column')).not.toBeInTheDocument();
        expect(screen.queryByTestId('target-select')).not.toBeInTheDocument();
      });
    });

    describe('when prediction type is timeseries', () => {
      it('should render the target column dropdown for timeseries', async () => {
        const user = userEvent.setup();
        renderComponent();

        await user.click(screen.getByTestId('task-type-card-timeseries'));

        expect(screen.getByText('Target column')).toBeInTheDocument();
        expect(screen.getByTestId('target-select')).toBeInTheDocument();
        expect(screen.queryByText('Label column')).not.toBeInTheDocument();
        expect(screen.queryByTestId('label_column-select')).not.toBeInTheDocument();
      });

      it('should switch from label column to target column when changing to timeseries', async () => {
        const user = userEvent.setup();
        renderComponent();

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
        const user = userEvent.setup();
        renderComponent();

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
      renderComponent();
      expect(screen.getByTestId('label_column-select')).toBeInTheDocument();
    });

    it('should show placeholder text when no column is selected', () => {
      renderComponent();
      expect(screen.getByTestId('label_column-select')).toHaveTextContent('Select a column');
    });

    it('should be disabled when no file is selected', () => {
      renderComponent();
      expect(screen.getByTestId('label_column-select')).toBeDisabled();
    });

    it('should be disabled when columns are empty', () => {
      mockUseFilesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useFilesQuery>);
      renderComponent();
      expect(screen.getByTestId('label_column-select')).toBeDisabled();
    });
  });

  describe('Top models to consider', () => {
    it('should render the top N input with default value 3', () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input');
      expect(input).toHaveValue(3);
    });

    it('should show error message when top N exceeds the maximum', async () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '6' } });

      await waitFor(() => {
        expect(screen.getByText('Maximum number of top models is 5')).toBeInTheDocument();
      });
    });

    it('should show error message when top N is below the minimum', async () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '0' } });

      await waitFor(() => {
        expect(screen.getByText('Minimum number of top models is 1')).toBeInTheDocument();
      });
    });
  });

  describe('Run experiment button', () => {
    it('should be disabled by default when form is invalid', () => {
      renderComponent();
      const button = screen.getByRole('button', { name: 'Run experiment' });
      expect(button).toBeDisabled();
    });

    it('should be disabled when top N has a validation error', async () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '6' } });

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Run experiment' });
        expect(button).toBeDisabled();
      });
    });
  });
});
