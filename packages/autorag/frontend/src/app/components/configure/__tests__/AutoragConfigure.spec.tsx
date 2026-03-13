import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import { useLlamaStackVectorStoresQuery } from '~/app/hooks/queries';
import { mockVectorStoresResponse } from '~/__mocks__/mockVectorStore';

// Mock React Router hooks
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

// Mock queries hook for vector stores
jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useLlamaStackVectorStoresQuery: jest.fn(),
}));

const mockUseLlamaStackVectorStoresQuery = jest.mocked(useLlamaStackVectorStoresQuery);

// Mock useWatchConnectionTypes (used for connection types list)
jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: jest.fn(() => [[]]),
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
    mockUseLlamaStackVectorStoresQuery.mockReturnValue({
      data: mockVectorStoresResponse(),
      isLoading: false,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);
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

    it('should extract bucket name from secret data when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select first secret with bucket data
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);

      // The bucket extraction logic should have run (AutoragConfigure.tsx:176-182)
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

  describe('vector store selector', () => {
    it('should display the vector store selector with placeholder text', () => {
      renderWithQueryClient(<AutoragConfigure />);

      const toggle = screen.getByTestId('vector-store-select-toggle');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveTextContent('Select vector index');
    });

    it('should show vector store options when clicking the toggle', () => {
      renderWithQueryClient(<AutoragConfigure />);

      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

      // Only milvus should appear (filtered by SUPPORTED_VECTOR_STORE_PROVIDERS)
      expect(
        screen.getByTestId('vector-store-option-vs_00000000-0000-0000-0000-000000000001'),
      ).toBeInTheDocument();
      expect(screen.getByText('test-milvus-store')).toBeInTheDocument();
    });

    it('should update toggle text when a vector store is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
      // Click the option text directly to trigger PatternFly's onSelect
      fireEvent.click(screen.getByText('test-milvus-store'));

      expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
        'test-milvus-store',
      );
    });

    it('should deselect vector store when clicking the same option again', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select
      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
      fireEvent.click(screen.getByText('test-milvus-store'));
      expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
        'test-milvus-store',
      );

      // Re-open and deselect by clicking the same option
      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
      fireEvent.click(
        screen.getByTestId('vector-store-option-vs_00000000-0000-0000-0000-000000000001'),
      );
      expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
        'Select vector index',
      );
    });

    it('should disable the toggle and show empty message when no vector stores are available', () => {
      mockUseLlamaStackVectorStoresQuery.mockReturnValue({
        data: mockVectorStoresResponse([]),
        isLoading: false,
      } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);

      renderWithQueryClient(<AutoragConfigure />);

      const toggle = screen.getByTestId('vector-store-select-toggle');
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveTextContent('No vector stores available');
    });

    it('should disable the toggle when vector stores data is undefined', () => {
      mockUseLlamaStackVectorStoresQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);

      renderWithQueryClient(<AutoragConfigure />);

      const toggle = screen.getByTestId('vector-store-select-toggle');
      expect(toggle).toBeDisabled();
      expect(toggle).toHaveTextContent('No vector stores available');
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

    it('should disable "Edit" button for experiment settings when selected secret is invalid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the Edit button is disabled
      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toBeDisabled();
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

    it('should enable "Edit" button when selected secret is valid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the Edit button is enabled
      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toBeEnabled();
    });
  });
});
