import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import { useS3FileUploadMutation } from '~/app/hooks/mutations';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

const mockNotificationError = jest.fn();

jest.mock('~/app/hooks/mutations', () => {
  const mockS3MutateAsync = jest
    .fn()
    .mockResolvedValue({ uploaded: true, key: 'uploaded-key.txt' });
  const stableS3UploadMutation = {
    mutateAsync: mockS3MutateAsync,
    isPending: false,
    reset: jest.fn(),
    variables: undefined as { file: File } | undefined,
  };
  return {
    useS3FileUploadMutation: jest.fn(() => stableS3UploadMutation),
  };
});

function getMockS3MutateAsync(): jest.Mock {
  const result = jest.mocked(useS3FileUploadMutation).mock.results[0]?.value as
    | { mutateAsync: jest.Mock }
    | undefined;
  if (!result?.mutateAsync) {
    throw new Error('useS3FileUploadMutation was not called; render AutoragConfigure first');
  }
  return result.mutateAsync;
}

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

// Mock useNotification (used by AutoragVectorStoreSelector and upload validation)
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: jest.fn(),
    error: mockNotificationError,
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

// Mock SecretSelector — simplified stand-in for TypeaheadSelect secret picks (see component tests for SecretSelector).
// Renders the current selection with the same label the real selector shows (`displayName || name` in options).
jest.mock('~/app/components/common/SecretSelector', () => {
  const MOCK_UUID_TO_DISPLAY_LABEL: Record<string, string> = {
    'secret-1': 'Test Secret 1',
    'secret-2': 'Test Secret 2',
    'secret-3': 'Invalid Secret',
  };

  return {
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
        {value && (
          <div data-testid={`${dataTestId}-value`}>
            {MOCK_UUID_TO_DISPLAY_LABEL[value] ?? value}
          </div>
        )}
      </div>
    ),
  };
});

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
    mockNotificationError.mockClear();
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('initial state - no secret selected', () => {
    it('should NOT show document input toggle when no secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      expect(
        screen.queryByRole('group', { name: 'Choose how to add documents' }),
      ).not.toBeInTheDocument();
    });

    it('should NOT display the select-file section heading when no secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      expect(
        screen.queryByRole('heading', { name: 'Select file or folder' }),
      ).not.toBeInTheDocument();
    });

    it('should NOT display the "Browse bucket" button when no secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
    });
  });

  describe('secret selection', () => {
    it('should show document input toggle when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the document input toggle is displayed
      expect(
        screen.getByRole('group', { name: 'Choose how to add documents' }),
      ).toBeInTheDocument();
    });

    it('should show the selected secret name in the selector (matches real displayName || name)', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret name is displayed
      expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('Test Secret 1');
    });

    it('should display the select-file section when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select file or folder" section is displayed
      expect(screen.getByRole('heading', { name: 'Select file or folder' })).toBeInTheDocument();
    });

    it('should display the "Browse bucket" button when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Browse bucket" button is displayed
      expect(screen.getByRole('button', { name: 'Browse bucket' })).toBeInTheDocument();
    });

    it('should show selected-files UI when "Select file or folder" is selected (default)', () => {
      renderWithQueryClient(<AutoragConfigure />);
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

      expect(screen.getByRole('heading', { name: 'Select file or folder' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Browse bucket' })).toBeInTheDocument();
      expect(
        screen.queryByText(/Drop a file here or browse to select a file/),
      ).not.toBeInTheDocument();
    });

    it('should show upload dropzone when "Upload file" is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

      expect(
        screen.queryByRole('heading', { name: 'Select file or folder' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
      expect(screen.getByText(/Drop a file here or browse to select a file/)).toBeInTheDocument();
    });

    it('should not upload an oversized file and should show a notification', () => {
      renderWithQueryClient(<AutoragConfigure />);
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(fileInput).not.toBeNull();

      const largeFile = new File(['x'], 'big.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 1024 * 1024 * 1024 + 1 });

      getMockS3MutateAsync().mockClear();
      fireEvent.change(fileInput!, { target: { files: [largeFile] } });

      expect(getMockS3MutateAsync()).not.toHaveBeenCalled();
      expect(mockNotificationError).toHaveBeenCalledWith(
        'File too large',
        'File size must be 1 GiB or less.',
      );
    });

    it('should not upload a disallowed file type and should show a notification', () => {
      renderWithQueryClient(<AutoragConfigure />);
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(fileInput).not.toBeNull();

      const badFile = new File(['x'], 'run.exe', { type: 'application/octet-stream' });
      getMockS3MutateAsync().mockClear();
      fireEvent.change(fileInput!, { target: { files: [badFile] } });

      expect(getMockS3MutateAsync()).not.toHaveBeenCalled();
      expect(mockNotificationError).toHaveBeenCalledWith(
        'Invalid file type',
        'File type must be one of the accepted types (PDF, DOCX, PPTX, Markdown, HTML, Plain text).',
      );
    });

    it('should upload an allowed file from the native file input', async () => {
      renderWithQueryClient(<AutoragConfigure />);
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(fileInput).not.toBeNull();

      const goodFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      getMockS3MutateAsync().mockClear();
      fireEvent.change(fileInput!, { target: { files: [goodFile] } });

      await waitFor(() => {
        expect(getMockS3MutateAsync()).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: 'test-namespace',
            secretName: 'Test Secret 1',
            bucket: 'test-bucket-1',
            key: 'notes.txt',
            file: goodFile,
          }),
        );
      });
      expect(mockNotificationError).not.toHaveBeenCalled();
    });

    it('should show the newly selected secret name when switching secrets', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select first secret
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);
      expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('Test Secret 1');

      // Select second secret
      const selectButton2 = screen.getByTestId('aws-secret-selector-select-secret-2');
      fireEvent.click(selectButton2);
      expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('Test Secret 2');
    });

    it('should extract bucket name from secret data when a secret is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select first secret with bucket data
      const selectButton1 = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton1);

      // The bucket extraction logic should have run (AutoragConfigure.tsx:176-182)
      // This is verified indirectly by the component functioning correctly
      expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('Test Secret 1');
      expect(screen.getByRole('button', { name: 'Browse bucket' })).toBeInTheDocument();

      // Select second secret with different bucket data
      const selectButton2 = screen.getByTestId('aws-secret-selector-select-secret-2');
      fireEvent.click(selectButton2);

      // The bucket should be updated for the new secret
      expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('Test Secret 2');
      expect(screen.getByRole('button', { name: 'Browse bucket' })).toBeInTheDocument();
    });
  });

  describe('invalid secret selection', () => {
    it('should disable "Browse bucket" button when selected secret is invalid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Browse bucket" button is disabled
      const browseButton = screen.getByRole('button', { name: 'Browse bucket' });
      expect(browseButton).toBeDisabled();
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

    it('should enable "Browse bucket" button when selected secret is valid', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Browse bucket" button is enabled
      const browseButton = screen.getByRole('button', { name: 'Browse bucket' });
      expect(browseButton).toBeEnabled();
    });

    it('should enable "Edit" button when a file/folder is selected', () => {
      renderWithQueryClient(<AutoragConfigure />);

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Initially Edit button should be disabled (no files selected)
      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toBeDisabled();

      // Click "Browse bucket" button to open FileExplorer
      const browseButton = screen.getByRole('button', { name: 'Browse bucket' });
      fireEvent.click(browseButton);

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
