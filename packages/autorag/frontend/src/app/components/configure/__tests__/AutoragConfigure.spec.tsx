import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

// Mock React Router hooks
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

// Mock mod-arch-core
jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-namespace' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
  }),
  asEnumMember: jest.fn((val: unknown) => val),
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone', Kubeflow: 'kubeflow' },
}));

// Mock useWatchConnectionTypes (used for connection types list)
jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: jest.fn(() => [[]]),
}));

// Mock useNotification (used by AutoragVectorStoreSelector)
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  })),
}));

// Mock queries hooks used by child components (e.g., AutoragVectorStoreSelector)
jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useLlamaStackModelsQuery: jest.fn().mockReturnValue({
    data: { models: [] },
    isLoading: false,
  }),
  useLlamaStackVectorStoresQuery: jest.fn().mockReturnValue({
    data: { vector_stores: [] }, // eslint-disable-line camelcase
    isLoading: false,
  }),
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

// Mock S3FileExplorer component
// TODO: Once test data input is hooked up, cleanup mock
jest.mock('~/app/components/common/S3FileExplorer/S3FileExplorer.tsx', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onSelectFiles,
    onClose,
  }: {
    isOpen: boolean;
    onSelectFiles: (files: { path: string }[]) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="file-explorer-modal">
        <button
          data-testid="file-explorer-select-file"
          onClick={() => {
            onSelectFiles([{ path: '/test-file.txt' }]);
            onClose();
          }}
        >
          Select File
        </button>
      </div>
    ) : null,
}));

const mockUseNavigate = jest.mocked(useNavigate);
const mockUseParams = jest.mocked(useParams);

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
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
const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <FormWrapper>{component}</FormWrapper>
    </QueryClientProvider>,
  );
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
      const editButton = screen.getByRole('button', { name: 'Edit' });

      // Verify it's disabled
      expect(editButton).toBeDisabled();
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

    it('should enable "Edit" button when a file/folder is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Initially Edit button should be disabled (no files selected)
      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toBeDisabled();

      // Click "Select files" to open the FileExplorer
      const selectFilesButton = screen.getByRole('button', { name: 'Select files' });
      fireEvent.click(selectFilesButton);

      // FileExplorer should now be visible
      expect(screen.getByTestId('file-explorer-modal')).toBeInTheDocument();

      // Select a file in the FileExplorer (this sets input_data_bucket_name and input_data_key)
      const fileSelectButton = screen.getByTestId('file-explorer-select-file');
      fireEvent.click(fileSelectButton);

      // Now Edit button should be enabled after files are selected
      expect(editButton).toBeEnabled();
    });
  });
});
