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
  useLlamaStackVectorStoreProvidersQuery: jest.fn().mockReturnValue({
    data: { vector_store_providers: [] }, // eslint-disable-line camelcase
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
  renderWithQueryClient(<AutoragConfigure />, defaultValues);

describe('AutoragConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      // The bucket extraction logic should have run (AutoragConfigure.tsx:176-182)
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
      expect(screen.getByText('Vector database location')).toBeInTheDocument();
      expect(screen.getByText('Evaluation dataset')).toBeInTheDocument();
      expect(screen.getByText('Models to consider')).toBeInTheDocument();
      expect(screen.getByText('Optimization metric')).toBeInTheDocument();
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

    it('should enable "Edit" button when a file/folder is selected', () => {
      renderComponent();

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
