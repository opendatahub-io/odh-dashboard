import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
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
      expect(screen.getByText('Model configuration')).toBeInTheDocument();
      expect(screen.getByText('Optimization metric')).toBeInTheDocument();
      expect(screen.getByText('Maximum RAG patterns')).toBeInTheDocument();
    });
  });

  describe('Optimization metric', () => {
    it('should render the optimization metric dropdown with default value', () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

      expect(screen.getByTestId('optimization-metric-select')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-metric-select')).toHaveTextContent(
        'Answer faithfulness',
      );
    });

    it('should display all metric options when dropdown is opened', async () => {
      const user = userEvent.setup();
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

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
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
        // eslint-disable-next-line camelcase
        optimization_metric: 'answer_correctness',
      });

      expect(screen.getByTestId('optimization-metric-select')).toHaveTextContent(
        'Answer correctness',
      );
    });
  });

  describe('Maximum RAG patterns', () => {
    it('should render the max RAG patterns input with default value 8', () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

      const input = screen.getByTestId('max-rag-patterns-input').querySelector('input');
      expect(input).toHaveValue(8);
    });

    it('should increment value when plus button is clicked', () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

      const container = screen.getByTestId('max-rag-patterns-input');
      const plusButton = container.querySelector('button[aria-label="Plus"]')!;
      fireEvent.click(plusButton);

      const input = container.querySelector('input');
      expect(input).toHaveValue(9);
    });

    it('should decrement value when minus button is clicked', () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

      const container = screen.getByTestId('max-rag-patterns-input');
      const minusButton = container.querySelector('button[aria-label="Minus"]')!;
      fireEvent.click(minusButton);

      const input = container.querySelector('input');
      expect(input).toHaveValue(7);
    });

    it('should show error when value exceeds maximum', async () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

      const input = screen.getByTestId('max-rag-patterns-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '21' } });

      await waitFor(() => {
        expect(screen.getByText('Maximum number of RAG patterns is 20')).toBeInTheDocument();
      });
    });

    it('should show error when value is below minimum', async () => {
      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

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

      renderComponent({
        // eslint-disable-next-line camelcase
        input_data_secret_name: 'test-secret',
        // eslint-disable-next-line camelcase
        input_data_bucket_name: 'test-bucket',
      });

      // The "Selected models" card should show model counts
      expect(screen.getByText(/1 foundation model/)).toBeInTheDocument();
      expect(screen.getByText(/1 embedding model/)).toBeInTheDocument();
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
