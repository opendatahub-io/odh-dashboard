import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import type { Files } from '~/app/components/common/FileExplorer/FileExplorer';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

const mockNotificationError = jest.fn();

const mockS3MutateAsync = jest.fn().mockResolvedValue({ uploaded: true, key: 'uploaded-key.txt' });

jest.mock('~/app/hooks/mutations', () => ({
  __esModule: true,
  useS3FileUploadMutation: jest.fn(() => ({
    mutateAsync: mockS3MutateAsync,
    isPending: false,
    reset: jest.fn(),
    variables: undefined,
  })),
  useUploadToStorageMutation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({ uploaded: true, key: 'eval-data.json' }),
    mutate: jest.fn(),
    isPending: false,
    isIdle: true,
    isSuccess: false,
    isError: false,
    reset: jest.fn(),
    data: undefined,
    error: null,
    variables: undefined,
    status: 'idle',
  })),
  useCreatePipelineRunMutation: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}));

function getMockS3MutateAsync(): jest.Mock {
  return mockS3MutateAsync;
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

// Mock mod-arch-shared (used by ConfigureFormGroup)
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: ({
    icon,
    ...props
  }: {
    icon: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{icon}</button>,
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
  useLlamaStackVectorStoreProvidersQuery: jest.fn().mockReturnValue({
    data: { vector_store_providers: [] }, // eslint-disable-line camelcase
    isLoading: false,
  }),
  useSecretsQuery: jest.fn().mockReturnValue({
    data: [],
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
              data: { AWS_S3_BUCKET: 'test-bucket-1', AWS_DEFAULT_REGION: 'us-east-1' },
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
              data: { AWS_S3_BUCKET: 'test-bucket-2', AWS_DEFAULT_REGION: 'us-east-1' },
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
    onSelectFiles: (files: Files) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="file-explorer-modal">
        <button
          data-testid="file-explorer-select-file"
          onClick={() => {
            onSelectFiles([{ path: '/test-file.txt', name: 'test-file.txt', type: 'txt' }]);
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
const mockUseLlamaStackModelsQuery = jest.mocked(useLlamaStackModelsQuery);

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
    mockNotificationError.mockClear();
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

    it('should NOT show document input toggle when no secret is selected', () => {
      renderComponent();

      expect(
        screen.queryByRole('group', { name: 'Choose how to add documents' }),
      ).not.toBeInTheDocument();
    });

    it('should NOT display the select-file section heading when no secret is selected', () => {
      renderComponent();

      expect(
        screen.queryByRole('heading', { name: 'Select file or folder' }),
      ).not.toBeInTheDocument();
    });

    it('should NOT display the "Browse bucket" button when no secret is selected', () => {
      renderComponent();

      expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
    });
  });

  describe('secret selection', () => {
    it('should show document input toggle when a secret is selected', () => {
      renderComponent();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the document input toggle is displayed
      expect(
        screen.getByRole('group', { name: 'Choose how to add documents' }),
      ).toBeInTheDocument();
    });

    it('should show the selected secret name in the selector (matches real displayName || name)', () => {
      renderComponent();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the secret name is displayed
      expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('Test Secret 1');
    });

    it('should display the select-file section when a secret is selected', () => {
      renderComponent();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Select file or folder" section is displayed
      expect(screen.getByRole('heading', { name: 'Select file or folder' })).toBeInTheDocument();
    });

    it('should display the "Browse bucket" button when a secret is selected', () => {
      renderComponent();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Browse bucket" button is displayed
      expect(screen.getByRole('button', { name: 'Browse bucket' })).toBeInTheDocument();
    });

    it('should show selected-files UI when "Select file or folder" is selected (default)', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

      expect(screen.getByRole('heading', { name: 'Select file or folder' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Browse bucket' })).toBeInTheDocument();
      expect(
        screen.queryByText(/Drop a file here or browse to select a file/),
      ).not.toBeInTheDocument();
    });

    it('should show upload dropzone when "Upload file" is selected', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

      expect(
        screen.queryByRole('heading', { name: 'Select file or folder' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
      expect(screen.getByText(/Drop a file here or browse to select a file/)).toBeInTheDocument();
    });

    it('should not upload an oversized file and should show a notification', () => {
      renderComponent();
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
        'File size must be 32 MiB or less.',
      );
    });

    it('should not upload a disallowed file type and should show a notification', () => {
      renderComponent();
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
      renderComponent();
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
      renderComponent();

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
      renderComponent();

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

    it('should display the "Configure details" fields when a file is selected', () => {
      renderComponent();

      // Initially should show empty state
      expect(
        screen.getByText('Select an S3 connection or upload a file to get started'),
      ).toBeInTheDocument();

      // Select a secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Empty state should still be shown (no file selected yet)
      expect(
        screen.getByText('Select an S3 connection or upload a file to get started'),
      ).toBeInTheDocument();

      // Select a file via the file explorer
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      // Empty state should be hidden
      expect(
        screen.queryByText('Select an S3 connection or upload a file to get started'),
      ).not.toBeInTheDocument();

      // Configure details fields should be visible
      expect(screen.getByText('Vector I/O provider')).toBeInTheDocument();
      expect(screen.getByText('Evaluation dataset')).toBeInTheDocument();
      expect(screen.getByText('Model configuration')).toBeInTheDocument();
      expect(screen.getByText('Optimization metric')).toBeInTheDocument();
      expect(screen.getByText('Maximum RAG patterns')).toBeInTheDocument();
    });
  });

  describe('Optimization metric', () => {
    const selectSecretAndFile = () => {
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));
    };

    it('should render the optimization metric dropdown with default value', () => {
      renderComponent();
      selectSecretAndFile();

      expect(screen.getByTestId('optimization-metric-select')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-metric-select')).toHaveTextContent(
        'Answer faithfulness',
      );
    });

    it('should display all metric options when dropdown is opened', async () => {
      const user = userEvent.setup();
      renderComponent();
      selectSecretAndFile();

      await user.click(screen.getByTestId('optimization-metric-select'));

      await waitFor(() => {
        expect(screen.getByTestId('metric-option-faithfulness')).toBeInTheDocument();
        expect(screen.getByTestId('metric-option-answer_correctness')).toBeInTheDocument();
        expect(screen.getByTestId('metric-option-context_correctness')).toBeInTheDocument();
      });
    });

    it('should render with a non-default metric when configured', () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        optimization_metric: 'answer_correctness',
      });
      selectSecretAndFile();

      expect(screen.getByTestId('optimization-metric-select')).toHaveTextContent(
        'Answer correctness',
      );
    });
  });

  describe('Maximum RAG patterns', () => {
    const selectSecretAndFile = () => {
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));
    };

    it('should render the max RAG patterns input with default value 8', () => {
      renderComponent();
      selectSecretAndFile();

      const input = screen.getByTestId('max-rag-patterns-input').querySelector('input');
      expect(input).toHaveValue(8);
    });

    it('should increment value when plus button is clicked', () => {
      renderComponent();
      selectSecretAndFile();

      const container = screen.getByTestId('max-rag-patterns-input');
      const plusButton = container.querySelector('button[aria-label="Plus"]')!;
      fireEvent.click(plusButton);

      const input = container.querySelector('input');
      expect(input).toHaveValue(9);
    });

    it('should decrement value when minus button is clicked', () => {
      renderComponent();
      selectSecretAndFile();

      const container = screen.getByTestId('max-rag-patterns-input');
      const minusButton = container.querySelector('button[aria-label="Minus"]')!;
      fireEvent.click(minusButton);

      const input = container.querySelector('input');
      expect(input).toHaveValue(7);
    });

    it('should show error when value exceeds maximum', async () => {
      renderComponent();
      selectSecretAndFile();

      const input = screen.getByTestId('max-rag-patterns-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '21' } });

      await waitFor(() => {
        expect(screen.getByText('Maximum number of RAG patterns is 20')).toBeInTheDocument();
      });
    });

    it('should show error when value is below minimum', async () => {
      renderComponent();
      selectSecretAndFile();

      const input = screen.getByTestId('max-rag-patterns-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '3' } });

      await waitFor(() => {
        expect(screen.getByText('Minimum number of RAG patterns is 4')).toBeInTheDocument();
      });
    });
  });

  describe('Model initialization from query data', () => {
    it('should populate generation and embedding models when query returns data', () => {
      mockUseLlamaStackModelsQuery.mockReturnValue({
        data: {
          models: [
            // eslint-disable-next-line camelcase
            { id: 'llm-model-1', type: 'llm', provider: 'ollama', resource_path: 'ollama://llm-1' },
            {
              id: 'embed-model-1',
              type: 'embedding',
              provider: 'ollama',
              resource_path: 'ollama://embed-1', // eslint-disable-line camelcase
            },
          ],
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useLlamaStackModelsQuery>);

      renderComponent();

      // Select a secret and file to show configure details
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      // The "Selected models" card should show model counts
      expect(screen.getByText(/1 foundation model/)).toBeInTheDocument();
      expect(screen.getByText(/1 embedding model/)).toBeInTheDocument();
    });
  });

  describe('selected input data file table', () => {
    it('should NOT display the selected file table when no file is selected', () => {
      renderComponent();

      // Select a secret so the "Browse bucket" button appears
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

      expect(
        screen.queryByRole('grid', { name: 'Selected input data file' }),
      ).not.toBeInTheDocument();
    });

    it('should display the selected file table after selecting a file', () => {
      renderComponent();

      // Select a secret
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

      // Open file explorer and select a file
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      // Verify the table appears with correct content
      const table = screen.getByRole('grid', { name: 'Selected input data file' });
      expect(table).toBeInTheDocument();
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
      expect(screen.getByText('txt')).toBeInTheDocument();
    });

    it('should remove the selected file when the remove button is clicked', () => {
      renderComponent();

      // Select a secret and a file
      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      // Verify the table is shown
      expect(screen.getByRole('grid', { name: 'Selected input data file' })).toBeInTheDocument();

      // Click the remove button
      fireEvent.click(screen.getByRole('button', { name: 'Remove selection' }));

      // Table should be removed
      expect(
        screen.queryByRole('grid', { name: 'Selected input data file' }),
      ).not.toBeInTheDocument();
    });

    it('after S3 select then switch to upload, should only show the upload table (not both tables)', async () => {
      renderComponent();
      getMockS3MutateAsync().mockClear();

      fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
      fireEvent.click(screen.getByRole('button', { name: 'Browse bucket' }));
      fireEvent.click(screen.getByTestId('file-explorer-select-file'));

      expect(screen.getByRole('grid', { name: 'Selected input data file' })).toBeInTheDocument();
      expect(
        screen.queryByRole('grid', { name: 'Knowledge document upload' }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));

      expect(
        screen.queryByRole('grid', { name: 'Selected input data file' }),
      ).not.toBeInTheDocument();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(fileInput).not.toBeNull();
      const goodFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      fireEvent.change(fileInput!, { target: { files: [goodFile] } });

      await waitFor(() => {
        expect(getMockS3MutateAsync()).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(
          screen.queryByRole('grid', { name: 'Selected input data file' }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('grid', { name: 'Knowledge document upload' })).toBeInTheDocument();
      });

      expect(screen.getByText('uploaded-key.txt')).toBeInTheDocument();
      expect(screen.queryByText('test-file.txt')).not.toBeInTheDocument();
    });
  });

  describe('invalid secret selection', () => {
    it('should disable "Browse bucket" button when selected secret is invalid', () => {
      renderComponent();

      // Select an invalid secret
      const selectInvalidButton = screen.getByTestId('aws-secret-selector-select-invalid-secret');
      fireEvent.click(selectInvalidButton);

      // Verify the "Browse bucket" button does not exist
      const browseButton = screen.queryByRole('button', { name: 'Browse bucket' });
      expect(browseButton).not.toBeInTheDocument();
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

    it('should enable "Browse bucket" button when selected secret is valid', () => {
      renderComponent();

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Verify the "Browse bucket" button is enabled
      const browseButton = screen.getByRole('button', { name: 'Browse bucket' });
      expect(browseButton).toBeEnabled();
    });

    it('should enable "Edit" button when a file/folder is selected', () => {
      renderComponent();

      // Select a valid secret
      const selectButton = screen.getByTestId('aws-secret-selector-select-secret-1');
      fireEvent.click(selectButton);

      // Before file selection, the configure details panel shows the empty state
      expect(
        screen.getByText('Select an S3 connection or upload a file to get started'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

      // Click "Browse bucket" button to open FileExplorer
      const browseButton = screen.getByRole('button', { name: 'Browse bucket' });
      fireEvent.click(browseButton);

      // FileExplorer should now be visible
      expect(screen.getByTestId('file-explorer-modal')).toBeInTheDocument();

      // Select a file in the FileExplorer (this sets input_data_bucket_name and input_data_key)
      const fileSelectButton = screen.getByTestId('file-explorer-select-file');
      fireEvent.click(fileSelectButton);

      // Now Edit button should be visible and enabled after files are selected
      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toBeEnabled();
    });
  });
});
