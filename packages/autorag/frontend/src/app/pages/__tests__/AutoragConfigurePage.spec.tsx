/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router';
import AutoragConfigurePage from '~/app/pages/AutoragConfigurePage';

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn().mockReturnValue({
    namespaces: [{ name: 'test-namespace' }, { name: 'other-namespace' }],
    updatePreferredNamespace: jest.fn(),
    namespacesLoaded: true,
    namespacesLoadError: undefined,
  }),
  asEnumMember: jest.fn((val: unknown) => val),
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone', Kubeflow: 'kubeflow' },
}));

jest.mock('~/app/hooks/mutations', () => ({
  useCreatePipelineRunMutation: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
  })),
}));

// Mock the VectorStoreSelector to auto-set the form value since PF6 Select
// doesn't work in JSDOM (Floating UI portal limitation).
jest.mock('~/app/components/configure/AutoragVectorStoreSelector', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useFormContext } = require('react-hook-form');

  const MockVectorStoreSelector = () => {
    const { setValue } = useFormContext();
    ReactMock.useEffect(() => {
      setValue('llama_stack_vector_database_id', 'ls_milvus', { shouldValidate: true });
    }, [setValue]);
    return ReactMock.createElement(
      'div',
      { 'data-testid': 'vector-store-select-toggle' },
      'milvus (remote Milvus)',
    );
  };
  return { __esModule: true, default: MockVectorStoreSelector };
});

jest.mock('~/app/hooks/queries', () => ({
  useLlamaStackModelsQuery: jest.fn(() => ({
    data: {
      models: [
        { id: 'llama-3-8b', type: 'llm' },
        { id: 'llama-3-70b', type: 'llm' },
        { id: 'text-embedding-ada-002', type: 'embedding' },
      ],
    },
    isLoading: false,
    error: null,
  })),
  useLlamaStackVectorStoreProvidersQuery: jest.fn(() => ({
    data: { vector_store_providers: [{ provider_id: 'milvus', provider_type: 'remote::milvus' }] }, // eslint-disable-line camelcase
    isLoading: false,
  })),
}));

const mockNotificationError = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    error: mockNotificationError,
  })),
}));

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    title,
    subtext,
    description,
    breadcrumb,
    empty,
    loaded,
    emptyStatePage,
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
    subtext: React.ReactNode;
    description: React.ReactNode;
    breadcrumb: React.ReactNode;
    empty: boolean;
    loaded: boolean;
    emptyStatePage: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="applications-page">
      {title}
      {subtext}
      {description}
      {breadcrumb}
      {empty ? emptyStatePage : null}
      {loaded && !empty ? children : null}
    </div>
  ),
  DashboardPopupIconButton: ({ icon }: { icon: React.ReactNode }) => <button>{icon}</button>,
}));

// Mock S3FileExplorer used by AutoragConfigure
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

// Mock useWatchConnectionTypes used by AutoragConfigure
jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: jest.fn(() => [[]]),
}));

jest.mock('~/app/components/empty-states/InvalidProject', () => ({
  __esModule: true,
  default: () => <div data-testid="invalid-project">Invalid Project</div>,
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
            displayName?: string;
          }
        | undefined,
    ) => void;
    value?: string;
    dataTestId?: string;
  }) => {
    const isAwsSelector = dataTestId === 'aws-secret-selector';

    const handleClick = () => {
      if (isAwsSelector) {
        onChange({
          uuid: 'aws-secret-1',
          name: 'Test AWS Secret',
          displayName: 'Test AWS Secret',
          data: { aws_s3_bucket: 'test-bucket' },
          type: 's3',
          invalid: false,
        });
      } else {
        onChange({
          uuid: 'lls-secret-1',
          name: 'Test LLS Secret',
          data: { llama_stack_url: 'https://example.com' },
          type: 'lls',
          invalid: false,
        });
      }
    };

    return (
      <div data-testid={dataTestId}>
        <button type="button" data-testid={`${dataTestId}-select-secret`} onClick={handleClick}>
          Select Secret
        </button>
        {value && <div data-testid={`${dataTestId}-value`}>{value}</div>}
      </div>
    );
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('AutoragConfigurePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('Initial state', () => {
    it('should render the page with AutoRAG title', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByText('AutoRAG')).toBeInTheDocument();
    });

    it('should render AutoragCreate component on initial load', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      // Check for form fields that are rendered by AutoragCreate
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/Description/i)).toBeInTheDocument();
      expect(await screen.findByText(/Llama Stack instance/i)).toBeInTheDocument();
    });

    it('should NOT render AutoragConfigure component on initial load', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      // AutoragConfigure has "Documents" and "Configure Details" headings
      expect(screen.queryByText('Knowledge setup')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure details')).not.toBeInTheDocument();
    });

    it('should display "Create AutoRAG experiment" subtitle in create step', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByText('Create RAG optimization run')).toBeInTheDocument();
    });

    it('should display description text in create step', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      expect(
        await screen.findByText(
          'Automatically test and tune retrieval, indexing, and model settings to improve Retrieval-Augmented Generation (RAG) response quality.',
        ),
      ).toBeInTheDocument();
    });

    it('should NOT display breadcrumb in create step', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('Create step - Next button', () => {
    it('should disable Next button when name is empty', async () => {
      renderWithProviders(<AutoragConfigurePage />);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next button when llama stack secret is not selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when name and llama stack secret are filled', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select llama stack secret
      const selectSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Find the Next button (it should be enabled after form updates)
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      expect(nextButton).toBeEnabled();
    });

    it('should transition to configure step when Next button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select llama stack secret
      const selectSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Click Next button
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Should now show configure component
      expect(await screen.findByText('Knowledge setup')).toBeInTheDocument();
      expect(await screen.findByText('Configure details')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument();
    });
  });

  describe('Create step - Cancel button', () => {
    it('should render Cancel link', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      const cancelLink = await screen.findByRole('link', { name: 'Cancel' });
      expect(cancelLink).toBeInTheDocument();
      expect(cancelLink).toHaveAttribute('href', '/gen-ai-studio/autorag/experiments');
    });

    it('should have correct href for Cancel link', async () => {
      renderWithProviders(<AutoragConfigurePage />);

      const cancelLink = await screen.findByRole('link', { name: 'Cancel' });
      expect(cancelLink).toHaveAttribute('href', '/gen-ai-studio/autorag/experiments');
    });
  });

  describe('Configure step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      // Select llama stack secret
      const selectSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Click Next button to go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);
    });

    it('should render AutoragConfigure component in configure step', async () => {
      // Check for distinctive elements from AutoragConfigure
      expect(await screen.findByText('Knowledge setup')).toBeInTheDocument();
      expect(await screen.findByText('Configure details')).toBeInTheDocument();
    });

    it('should display experiment name in subtitle in configure step', async () => {
      expect(await screen.findByText('"My Experiment" configurations')).toBeInTheDocument();
    });

    it('should NOT display description text in configure step', async () => {
      expect(
        screen.queryByText(
          'Automatically test and tune retrieval, indexing, and model settings to improve Retrieval-Augmented Generation (RAG) response quality.',
        ),
      ).not.toBeInTheDocument();
    });

    it('should display breadcrumb in configure step', async () => {
      expect(await screen.findByText('AutoRAG: test-namespace')).toBeInTheDocument();
      expect(await screen.findByText('My Experiment')).toBeInTheDocument();
    });

    it('should render "Run experiment" button', async () => {
      expect(await screen.findByRole('button', { name: 'Run experiment' })).toBeInTheDocument();
    });

    it('should render "Back" button', async () => {
      expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('should NOT render "Next" or "Cancel" in configure step', async () => {
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });

  describe('Configure step - Back button', () => {
    it('should navigate back to create step when Back is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      // Select llama stack secret
      const selectSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Click Back button
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Should show create component again (has Name, Description, Llama Stack instance)
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(await screen.findByText(/Llama Stack instance/i)).toBeInTheDocument();
      // Should NOT show configure component (Documents, Configure Details)
      expect(screen.queryByText('Knowledge setup')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure details')).not.toBeInTheDocument();
    });

    it('should preserve form data when navigating back', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the form
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Preserved Name');

      const descriptionInput = await screen.findByLabelText(/Description/i);
      await user.type(descriptionInput, 'Preserved Description');

      // Select llama stack secret
      const selectSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Go back to create step
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Verify form data is preserved
      expect(nameInput).toHaveValue('Preserved Name');
      expect(descriptionInput).toHaveValue('Preserved Description');
    });
  });

  describe('Configure step - Run experiment', () => {
    it('should call mutateAsync when Run experiment button is clicked with valid form', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select llama stack secret
      const selectLlsSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectLlsSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection to populate input_data_secret_name and input_data_bucket_name
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      // Select files to populate input_data_key and test_data_key
      const selectFilesButton = await screen.findByRole('button', { name: 'Select files' });
      await user.click(selectFilesButton);

      // FileExplorer should open
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Vector store value is auto-set by the mocked AutoragVectorStoreSelector.

      // Wait for form to be valid and Run button to be enabled
      const runButton = await screen.findByRole('button', { name: 'Run experiment' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });

      // Click Run experiment button
      await user.click(runButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('should navigate to results page after successful pipeline run creation', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select llama stack secret
      const selectLlsSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectLlsSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      const selectFilesButton = await screen.findByRole('button', { name: 'Select files' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Click Run experiment button
      const runButton = await screen.findByRole('button', { name: 'Run experiment' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/gen-ai-studio/autorag/results/test-namespace/new-run-123',
        );
      });
    });

    it('should show error notification when pipeline run creation fails', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Pipeline creation failed'));

      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select llama stack secret
      const selectLlsSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectLlsSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      const selectFilesButton = await screen.findByRole('button', { name: 'Select files' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Click Run experiment button
      const runButton = await screen.findByRole('button', { name: 'Run experiment' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'Failed to create pipeline run',
          'Pipeline creation failed',
        );
      });
    });

    it('should show generic error when error is not an Error instance', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue('String error');

      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select llama stack secret
      const selectLlsSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectLlsSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      const selectFilesButton = await screen.findByRole('button', { name: 'Select files' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Click Run experiment button
      const runButton = await screen.findByRole('button', { name: 'Run experiment' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith('Failed to create pipeline run', '');
      });
    });
  });

  describe('Invalid namespace handling', () => {
    const { useNamespaceSelector } = require('mod-arch-core');

    afterEach(() => {
      // Reset to default mock value after each test in this block
      useNamespaceSelector.mockReturnValue({
        namespaces: [{ name: 'test-namespace' }, { name: 'other-namespace' }],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });
    });

    it('should render InvalidProject when no namespaces exist', async () => {
      useNamespaceSelector.mockReturnValue({
        namespaces: [],
        updatePreferredNamespace: jest.fn(),
        namespacesLoaded: true,
        namespacesLoadError: undefined,
      });

      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByTestId('invalid-project')).toBeInTheDocument();
    });

    it('should render InvalidProject when namespace is invalid', async () => {
      mockUseParams.mockReturnValue({ namespace: 'nonexistent-namespace' });

      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByTestId('invalid-project')).toBeInTheDocument();
    });

    it('should render content when namespace is valid', async () => {
      mockUseParams.mockReturnValue({ namespace: 'test-namespace' });

      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.queryByTestId('invalid-project')).not.toBeInTheDocument();
    });

    it('should render content when namespace is undefined but namespaces exist', async () => {
      mockUseParams.mockReturnValue({ namespace: undefined });

      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.queryByTestId('invalid-project')).not.toBeInTheDocument();
    });
  });

  describe('Form persistence', () => {
    it('should maintain form state across step transitions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in form fields
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Persistent Experiment');

      const descriptionInput = await screen.findByLabelText(/Description/i);
      await user.type(descriptionInput, 'Persistent Description');

      // Select secret
      const selectSecretButton = await screen.findByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Go to configure
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Go back
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Verify form data is preserved
      expect(nameInput).toHaveValue('Persistent Experiment');
      expect(descriptionInput).toHaveValue('Persistent Description');

      // Re-select secret (it's reset on component mount as per AutoragCreate.tsx)
      const selectSecretButtonAgain = await screen.findByTestId(
        'lls-secret-selector-select-secret',
      );
      await user.click(selectSecretButtonAgain);

      // Go to configure again
      await user.click(await screen.findByRole('button', { name: 'Next' }));

      // Verify we're in configure step with correct subtitle
      expect(await screen.findByText('"Persistent Experiment" configurations')).toBeInTheDocument();
    });
  });
});
