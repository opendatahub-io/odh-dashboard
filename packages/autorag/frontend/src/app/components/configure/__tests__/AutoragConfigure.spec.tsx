import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate, useParams } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';

// Mock React Router hooks
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

// Mock SecretSelector component
jest.mock('~/app/shared/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    value,
    dataTestId,
  }: {
    onChange: (secret: { uuid: string; name: string; invalid?: boolean } | undefined) => void;
    value?: string;
    dataTestId?: string;
  }) => (
    <div data-testid={dataTestId}>
      <button
        data-testid={`${dataTestId}-select-secret-1`}
        onClick={() => onChange({ uuid: 'secret-1', name: 'Test Secret 1', invalid: false })}
      >
        Select Secret 1
      </button>
      <button
        data-testid={`${dataTestId}-select-secret-2`}
        onClick={() => onChange({ uuid: 'secret-2', name: 'Test Secret 2', invalid: false })}
      >
        Select Secret 2
      </button>
      <button
        data-testid={`${dataTestId}-select-invalid-secret`}
        onClick={() => onChange({ uuid: 'secret-3', name: 'Invalid Secret', invalid: true })}
      >
        Select Invalid Secret
      </button>
      {value && <div data-testid={`${dataTestId}-value`}>{value}</div>}
    </div>
  ),
}));

// Mock FileExplorer component
jest.mock('~/app/components/common/FileExplorer/FileExplorer.tsx', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);

// Create a QueryClient for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Wrapper component that provides QueryClient
const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe('AutoragConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('initial state - no secret selected', () => {
    it('should NOT display the "Selected connection" section when no secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      expect(screen.queryByText('Selected connection')).not.toBeInTheDocument();
    });

    it('should NOT display the "Selected files" section when no secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      expect(screen.queryByText('Selected files')).not.toBeInTheDocument();
    });

    it('should NOT display the "Select files" button when no secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      expect(screen.queryByText('Select files')).not.toBeInTheDocument();
    });
  });

  describe('secret selection', () => {
    it('should display "Selected connection" section when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected connection" section appears
      expect(screen.getByText('Selected connection')).toBeInTheDocument();
    });

    it('should display the selected secret name as a Label when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret name is displayed
      expect(screen.getByText('Test Secret 1')).toBeInTheDocument();
    });

    it('should display "Selected files" section when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Selected files" section appears
      expect(screen.getByText('Selected files')).toBeInTheDocument();
    });

    it('should display the "Select files" button when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button appears
      expect(screen.getByText('Select files')).toBeInTheDocument();
    });

    it('should display different secret name when selecting a different secret', () => {
      renderWithQueryClient(<AutoragConfigure />);

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
  });

  describe('clearing selected secret', () => {
    it('should clear the selected secret when clicking the X on the Label', () => {
      renderWithQueryClient(<AutoragConfigure />);

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
      renderWithQueryClient(<AutoragConfigure />);

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
      renderWithQueryClient(<AutoragConfigure />);

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Select files" button is disabled
      const selectFilesButton = screen.getByRole('button', { name: 'Select files' });
      expect(selectFilesButton).toBeDisabled();
    });

    it('should disable "Edit" button for Optimization metric when selected secret is invalid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Find the Edit buttons
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const optimizationMetricEditButton = editButtons[0]; // First Edit button is for Optimization metric

      // Verify it's disabled
      expect(optimizationMetricEditButton).toBeDisabled();
    });

    it('should disable "Edit" button for Models to consider when selected secret is invalid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Find the Edit buttons
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const modelsEditButton = editButtons[1]; // Second Edit button is for Models to consider

      // Verify it's disabled
      expect(modelsEditButton).toBeDisabled();
    });

    it('should disable "Run experiment" button when selected secret is invalid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Run experiment" button is disabled
      const runExperimentButton = screen.getByRole('button', { name: 'Run experiment' });
      expect(runExperimentButton).toBeDisabled();
    });

    it('should enable "Select files" button when selected secret is valid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select files" button is enabled
      const selectFilesButton = screen.getByRole('button', { name: 'Select files' });
      expect(selectFilesButton).toBeEnabled();
    });

    it('should enable "Edit" buttons when selected secret is valid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Find the Edit buttons
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });

      // Verify both Edit buttons are enabled
      expect(editButtons[0]).toBeEnabled(); // Optimization metric
      expect(editButtons[1]).toBeEnabled(); // Models to consider
    });

    it('should enable "Run experiment" button when selected secret is valid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Run experiment" button is enabled
      const runExperimentButton = screen.getByRole('button', { name: 'Run experiment' });
      expect(runExperimentButton).toBeEnabled();
    });
  });
});
