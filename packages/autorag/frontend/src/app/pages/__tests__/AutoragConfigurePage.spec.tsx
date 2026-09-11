/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { UIErrorHandler } from '~/app/components/common/UIError/UIErrorHandler';
import AutoragConfigurePage from '~/app/pages/AutoragConfigurePage';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);
const fireMiscTrackingEventMock = jest.mocked(fireMiscTrackingEvent);

// Truncate relies on DOM measurement APIs (scrollWidth) unavailable in JSDOM.
jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Truncate: ({ content }: { content: string }) => <span>{content}</span>,
}));

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockMutateAsync = jest.fn();
let mockLocationState: { from?: string } | undefined;
const mockS3UploadMutateAsync = jest
  .fn()
  .mockResolvedValue({ uploaded: true, key: 'uploaded-key.txt' });

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  useLocation: () => ({ state: mockLocationState, pathname: '', search: '', hash: '', key: '' }),
  Link: ({
    to,
    children,
    onClick,
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({
    to,
    children,
    onClick,
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
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
  useS3FileUploadMutation: jest.fn(() => ({
    mutateAsync: mockS3UploadMutateAsync,
    isPending: false,
    reset: jest.fn(),
    variables: undefined,
  })),
  useUploadToStorageMutation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({ uploaded: true, key: 'test-file.json' }),
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
}));

// Mock AutoragEvaluationSelect to auto-set test_data_key so the form validates.
// The real component lets the user pick a file; here we auto-set the value once
// the synced test_data_secret_name and test_data_bucket_name are non-empty.
// We use setTimeout(0) so the setValue runs after AutoragConfigure's clear effects
// (parent effects fire after child effects, so without the defer the clear effect
// would overwrite the value we set here).
// When a value is already present (reconfigure flow), it is preserved.
jest.mock('~/app/components/configure/AutoragEvaluationSelect', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useFormContext } = require('react-hook-form');

  const MockEvaluationSelect = () => {
    const { setValue, watch } = useFormContext();
    const testDataSecretName = watch('test_data_secret_name');
    const testDataBucketName = watch('test_data_bucket_name');
    const testDataKey = watch('test_data_key');

    ReactMock.useEffect(() => {
      if (!testDataSecretName || !testDataBucketName) {
        return undefined;
      }
      // Skip if a value is already present (e.g. reconfigure flow).
      if (testDataKey) {
        return undefined;
      }
      // Defer so AutoragConfigure's clear effect (which also reacts to
      // testDataSecretName / testDataBucketName changes) runs first.
      const timeout = setTimeout(() => {
        setValue('test_data_key', 'evaluation-dataset.json', { shouldValidate: true });
      }, 0);
      return () => clearTimeout(timeout);
    }, [testDataSecretName, testDataBucketName, testDataKey, setValue]);

    return ReactMock.createElement(
      'div',
      { 'data-testid': 'evaluation-select' },
      testDataKey || 'Mocked eval',
    );
  };
  return { __esModule: true, default: MockEvaluationSelect };
});

// Mock the VectorStoreSelector to auto-set the form value since PF6 Select
// doesn't work in JSDOM (Floating UI portal limitation).
// When a value is already present (reconfigure flow), it is preserved.
jest.mock('~/app/components/configure/AutoragVectorStoreSelector', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useFormContext } = require('react-hook-form');

  const MockVectorStoreSelector = () => {
    const { setValue, watch } = useFormContext();
    const currentValue = watch('vector_io_provider_id');
    ReactMock.useEffect(() => {
      // Only set a default when the field is empty (new configure flow).
      if (!currentValue) {
        setValue('vector_io_provider_id', 'milvus', { shouldValidate: true });
      }
    }, [setValue, currentValue]);
    return ReactMock.createElement(
      'div',
      { 'data-testid': 'vector-store-select-toggle' },
      currentValue || 'milvus (remote Milvus)',
    );
  };
  return { __esModule: true, default: MockVectorStoreSelector };
});

jest.mock('~/app/hooks/queries', () => ({
  useOgxModelsQuery: jest.fn(() => ({
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
  useOgxVectorStoreProvidersQuery: jest.fn(() => ({
    data: {
      vector_store_providers: [
        { provider_id: 'milvus', provider_type: 'remote::milvus' },
        { provider_id: 'chromadb', provider_type: 'remote::chromadb' },
      ],
    }, // eslint-disable-line camelcase
    isLoading: false,
  })),
  useSecretsQuery: jest.fn(() => ({
    data: [],
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
let mockFileExplorerCallCount = 0;
jest.mock('@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer', () => ({
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
            mockFileExplorerCallCount += 1;
            // First call: input data (document), Second call: test data (evaluation dataset - must be .json)
            const filePath =
              mockFileExplorerCallCount === 1 ? '/test-file.txt' : '/evaluation-dataset.json';
            onSelectFiles([{ path: filePath }]);
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
          data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
          type: 's3',
          invalid: false,
        });
      } else {
        onChange({
          uuid: 'ogx-secret-1',
          name: 'Test OGX Secret',
          data: { OGX_CLIENT_BASE_URL: 'https://example.com', OGX_CLIENT_API_KEY: 'test-key' },
          type: 'ogx',
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
      {/* UIError behavior is tested in UIErrorHandler's own spec */}
      <UIErrorHandler id="test-uierror" uiErrorMappings={{}}>
        <BrowserRouter>{component}</BrowserRouter>
      </UIErrorHandler>
    </QueryClientProvider>,
  );
};

describe('AutoragConfigurePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExplorerCallCount = 0;
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockLocationState = undefined;
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
      expect(await screen.findByText(/Open GenAI Stack connection/i)).toBeInTheDocument();
    });

    it('should NOT render AutoragConfigure component on initial load', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      // AutoragConfigure has "Documents" and "Configure Details" headings
      expect(screen.queryByText('Knowledge setup')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure details')).not.toBeInTheDocument();
    });

    it('should display "Create AutoRAG optimization run" subtitle in create step', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      expect(await screen.findByText('Create AutoRAG optimization run')).toBeInTheDocument();
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

    it('should disable Next button when Open GenAI Stack secret is not selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when name and Open GenAI Stack secret are filled', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select Open GenAI Stack secret
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
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

      // Select Open GenAI Stack secret
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
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
    it('should navigate back when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);
      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('AutoRAG Experiment Created tracking', () => {
    it('should fire with outcome: submit and hasDescription: false when Next is clicked without a description', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
        outcome: TrackingOutcome.submit,
        hasDescription: false,
        success: true,
      });
    });

    it('should fire with hasDescription: true when Next is clicked with a description filled in', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const descriptionInput = await screen.findByLabelText(/Description/i);
      await user.type(descriptionInput, 'Some description');

      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
        outcome: TrackingOutcome.submit,
        hasDescription: true,
        success: true,
      });
    });

    it('should fire with outcome: cancel when Cancel is clicked in the create step', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.EXPERIMENT_CREATED, {
        outcome: TrackingOutcome.cancel,
        hasDescription: false,
        success: true,
      });
    });

    it('should not render a Cancel button on the configure step', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Configure step only shows Back/Create run, not Cancel.
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });

  describe('Configure step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      // Select Open GenAI Stack secret
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
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
      const subtitle = await screen.findByTestId('configure-step-subtitle');
      expect(subtitle).toHaveTextContent('Run “My Experiment” AutoRAG experiment');
    });

    it('should NOT display description text in configure step', async () => {
      expect(
        screen.queryByText(
          'Automatically test and tune retrieval, indexing, and model settings to improve Retrieval-Augmented Generation (RAG) response quality.',
        ),
      ).not.toBeInTheDocument();
    });

    it('should display breadcrumb in configure step', async () => {
      expect(await screen.findByTestId('experiment-breadcrumb-home')).toHaveTextContent(
        /AutoRAG in/,
      );
      expect(await screen.findByTestId('experiment-breadcrumb-home')).toHaveTextContent(
        'test-namespace',
      );
      expect(await screen.findByTestId('project-navigator-link-in-breadcrumb')).toHaveTextContent(
        /Go to/,
      );
      const breadcrumbName = await screen.findByTestId('configure-breadcrumb-name');
      expect(breadcrumbName).toHaveTextContent('Run configurations');
    });

    it('should render "Create run" button', async () => {
      expect(await screen.findByRole('button', { name: 'Create run' })).toBeInTheDocument();
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

      // Select Open GenAI Stack secret
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Click Back button
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Should show create component again (has Name, Description, Open GenAI Stack connection)
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(await screen.findByText(/Open GenAI Stack connection/i)).toBeInTheDocument();
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

      // Select Open GenAI Stack secret
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
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

    it('should hide file selection after back and returning to configure without reselecting S3', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      expect(
        await screen.findByRole('heading', { name: 'Select file or folder' }),
      ).toBeInTheDocument();

      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      await user.click(selectOgxSecretButton);
      await user.click(nextButton);

      expect(
        screen.queryByRole('heading', { name: 'Select file or folder' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
    });
  });

  describe('Configure step - Create run', () => {
    it('should call mutateAsync when Create run button is clicked with valid form', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select Open GenAI Stack secret
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection to populate input_data_secret_name and input_data_bucket_name
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      // Select input data files
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      // FileExplorer should open for input data
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Vector store value is auto-set by the mocked AutoragVectorStoreSelector.

      // Wait for form to be valid and Run button to be enabled
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });

      // Click Create run button
      await user.click(runButton);

      // Assert that the payload contains the .json evaluation dataset
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            test_data_key: 'evaluation-dataset.json',
          }),
        );
      });
    });

    it('should navigate to results page after successful pipeline run creation', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutoragConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Select Open GenAI Stack secret
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      // Select input data files
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Click Create run button
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/gen-ai-studio/autorag/results/test-namespace/new-run-123',
          { state: { entrySource: 'direct' } },
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

      // Select Open GenAI Stack secret
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      // Select input data files
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Click Create run button
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
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

      // Select Open GenAI Stack secret
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      // Select input data files
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Click Create run button
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith('Failed to create pipeline run', '');
      });
    });

    it('should upload file on selection in upload mode and pass resolved input_data_key to pipeline run', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-456' });
      mockS3UploadMutateAsync.mockResolvedValue({ uploaded: true, key: 'resolved-key.pdf' });

      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Upload Immediate Test');

      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      await user.click(screen.getByRole('button', { name: 'Upload file' }));

      const file = new File(['doc'], 'original-name.pdf', { type: 'application/pdf' });
      const fileInputs = [...document.querySelectorAll('input[type="file"]')] as HTMLInputElement[];
      const uploadInput = fileInputs.find((el) => el.accept.includes('pdf')) ?? fileInputs[0];
      expect(uploadInput).toBeTruthy();
      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(mockS3UploadMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            namespace: 'test-namespace',
            secretName: 'Test AWS Secret',
            bucket: 'test-bucket',
            key: 'original-name.pdf',
            file,
          }),
        );
      });
      expect(mockS3UploadMutateAsync).toHaveBeenCalledTimes(1);

      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            input_data_key: 'resolved-key.pdf',
          }),
        );
      });
      expect(mockS3UploadMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('AutoRAG Run Triggered tracking', () => {
    it('should fire with success: true and derived properties on successful run creation', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Select AWS connection and a file via the S3 browser (real AutoragConfigure component
      // path), so knowledgeSourceType is reported as 's3' via RunTriggeredTrackingContext.
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const runButton = await screen.findByRole('button', { name: 'Create run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_TRIGGERED, {
          knowledgeSourceType: 's3',
          // AutoragEvaluationSelect and AutoragVectorStoreSelector are mocked in this file
          // (they auto-set their form field directly, bypassing RunTriggeredTrackingContext),
          // so these two remain undefined here — covered for real in their own component specs.
          evaluationSourceType: undefined,
          vectorDatabase: undefined,
          optimizationMetric: 'overallScore',
          countOfModels: 3,
          countOfKnowledgeDocuments: 1,
          countOfEvaluationDocuments: 1,
          countOfFoundationModels: 2,
          countOfEmbeddingModels: 1,
          hasS3Connection: true,
          outcome: TrackingOutcome.submit,
          success: true,
        });
      });
    });

    it('should fire with success: false and the allowlisted error category when run creation fails', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Pipeline creation failed'));

      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const runButton = await screen.findByRole('button', { name: 'Create run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.RUN_TRIGGERED,
          expect.objectContaining({
            outcome: TrackingOutcome.submit,
            success: false,
            error: 'actionFailed',
          }),
        );
      });
      // The raw error message must never reach analytics.
      expect(JSON.stringify(fireFormTrackingEventMock.mock.calls)).not.toContain(
        'Pipeline creation failed',
      );
    });
  });

  describe('AutoRAG Run Reconfigured tracking', () => {
    // Matches the models `useOgxModelsQuery` is mocked to return above — AutoragConfigure's own
    // model-initialization effect always resets generation_models/embedding_models to "select
    // all available models" on mount, overwriting whatever a reconfigure's initialValues
    // provided, so this is the only way to get a genuine "no changes" baseline for `models`.
    const noChangeReconfigureInitialValues = {
      display_name: 'Original Run - 1',
      ogx_secret_name: 'Test OGX Secret',
      vector_io_provider_id: 'chromadb',
      input_data_secret_name: 'Test AWS Secret',
      input_data_bucket_name: 'test-bucket',
      input_data_key: 'my-data/input.pdf',
      test_data_secret_name: 'Test AWS Secret',
      test_data_bucket_name: 'test-bucket',
      test_data_key: 'eval.json',
      optimization_metric: 'faithfulness' as const,
      generation_models: ['llama-3-8b', 'llama-3-70b'],
      embedding_models: ['text-embedding-ada-002'],
    };
    const reconfigureInitialOgxSecret = {
      uuid: 'ogx-secret-1',
      name: 'Test OGX Secret',
      data: { OGX_CLIENT_BASE_URL: 'https://example.com', OGX_CLIENT_API_KEY: 'test-key' },
      type: 'ogx',
      invalid: false,
    };
    const reconfigureInitialSecret = {
      uuid: 'aws-secret-1',
      name: 'Test AWS Secret',
      displayName: 'Test AWS Secret',
      data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
      type: 's3',
      invalid: false,
    };

    const navigateToReconfigureConfigureStep = async () => {
      const user = userEvent.setup();
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);
      expect(await screen.findByText('Knowledge setup')).toBeInTheDocument();
      return user;
    };

    it('should fire with success: true and an empty changedFields when nothing was changed', async () => {
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={noChangeReconfigureInitialValues}
          initialInputDataSecret={reconfigureInitialSecret}
          initialOgxSecret={reconfigureInitialOgxSecret}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const user = await navigateToReconfigureConfigureStep();

      const runButton = await screen.findByRole('button', { name: 'Create new run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.RUN_RECONFIGURED, {
          knowledgeSourceType: undefined,
          evaluationSourceType: undefined,
          optimizationMetric: 'answerFaithfulness',
          vectorDatabase: undefined,
          countOfFoundationModels: 2,
          countOfEmbeddingModels: 1,
          changedFields: '',
          outcome: TrackingOutcome.submit,
          success: true,
        });
      });
    });

    it('should not fire for a non-reconfigure (new run) submission', async () => {
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const runButton = await screen.findByRole('button', { name: 'Create run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.RUN_TRIGGERED,
          expect.anything(),
        );
      });
      expect(fireFormTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.RUN_RECONFIGURED,
        expect.anything(),
      );
    });

    it('should include optimizationMetric in changedFields when it is changed', async () => {
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={noChangeReconfigureInitialValues}
          initialInputDataSecret={reconfigureInitialSecret}
          initialOgxSecret={reconfigureInitialOgxSecret}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const user = await navigateToReconfigureConfigureStep();

      fireEvent.click(screen.getByTestId('optimization-metric-select'));
      await waitFor(() => {
        expect(screen.getByText('Answer correctness')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Answer correctness'));

      const runButton = await screen.findByRole('button', { name: 'Create new run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.RUN_RECONFIGURED,
          expect.objectContaining({
            optimizationMetric: 'answerCorrectness',
            changedFields: 'optimizationMetric',
            outcome: TrackingOutcome.submit,
            success: true,
          }),
        );
      });
    });

    it('should include knowledgeSourceType in changedFields when the knowledge source is re-selected', async () => {
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={noChangeReconfigureInitialValues}
          initialInputDataSecret={reconfigureInitialSecret}
          initialOgxSecret={reconfigureInitialOgxSecret}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const user = await navigateToReconfigureConfigureStep();

      // Re-select via the real S3 browser flow, so knowledgeSourceTypeRef is actually set.
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const runButton = await screen.findByRole('button', { name: 'Create new run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.RUN_RECONFIGURED,
          expect.objectContaining({
            knowledgeSourceType: 's3',
            changedFields: 'knowledgeSourceType',
            outcome: TrackingOutcome.submit,
            success: true,
          }),
        );
      });
    });

    it('should fire with success: false, the allowlisted error category, and a non-empty changedFields on failure', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Pipeline creation failed'));
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={noChangeReconfigureInitialValues}
          initialInputDataSecret={reconfigureInitialSecret}
          initialOgxSecret={reconfigureInitialOgxSecret}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const user = await navigateToReconfigureConfigureStep();

      fireEvent.click(screen.getByTestId('optimization-metric-select'));
      await waitFor(() => {
        expect(screen.getByText('Answer correctness')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Answer correctness'));

      const runButton = await screen.findByRole('button', { name: 'Create new run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      fireFormTrackingEventMock.mockClear();
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.RUN_RECONFIGURED,
          expect.objectContaining({
            changedFields: 'optimizationMetric',
            outcome: TrackingOutcome.submit,
            success: false,
            error: 'actionFailed',
          }),
        );
      });
      // The raw error message must never reach analytics.
      expect(JSON.stringify(fireFormTrackingEventMock.mock.calls)).not.toContain(
        'Pipeline creation failed',
      );
    });

    it('should fire with outcome: cancel, no success field, and changedFields reflecting a change made before returning to the create step', async () => {
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={noChangeReconfigureInitialValues}
          initialInputDataSecret={reconfigureInitialSecret}
          initialOgxSecret={reconfigureInitialOgxSecret}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const user = await navigateToReconfigureConfigureStep();

      fireEvent.click(screen.getByTestId('optimization-metric-select'));
      await waitFor(() => {
        expect(screen.getByText('Answer correctness')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Answer correctness'));

      await user.click(await screen.findByRole('button', { name: 'Back' }));

      fireFormTrackingEventMock.mockClear();
      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.RUN_RECONFIGURED,
        expect.objectContaining({
          changedFields: 'optimizationMetric',
          outcome: TrackingOutcome.cancel,
        }),
      );
      // Cancel fires no backend call, so `success` must be omitted entirely.
      const [, cancelProperties] = fireFormTrackingEventMock.mock.calls.find(
        ([eventName]) => eventName === AUTORAG_EVENTS.RUN_RECONFIGURED,
      )!;
      expect(cancelProperties).not.toHaveProperty('success');
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should not fire on cancel for a non-reconfigure (new run) submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      fireFormTrackingEventMock.mockClear();
      await user.click(cancelButton);

      expect(fireFormTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.RUN_RECONFIGURED,
        expect.anything(),
      );
    });
  });

  describe('AutoRAG Flow Exited tracking', () => {
    it('should fire with lastFunnelStep: defineDetails and exitDestination: experimentsList when Cancel is clicked on the create step', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
        exitType: 'navigate',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'experimentsList',
      });
    });

    it('should fire with lastFunnelStep: defineDetails when the breadcrumb is clicked before any milestone is completed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector('a');
      await user.click(homeLink!);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
        exitType: 'navigate',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'experimentsList',
      });
    });

    it('should report lastFunnelStep: knowledge once a knowledge document has been selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Complete the "Knowledge setup" milestone via the real AutoragConfigure S3 flow.
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector('a');
      await user.click(homeLink!);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
        exitType: 'navigate',
        lastFunnelStep: 'knowledge',
        exitDestination: 'experimentsList',
      });
    });

    it('should reset lastFunnelStep to defineDetails after Back clears a completed milestone and the user returns to configure', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      // Complete the "Knowledge setup" milestone.
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Back clears the knowledge selection (new-run flow only) — returning to configure should
      // not still report the milestone that was just cleared.
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);
      // AutoragCreate remounts on Back and resets ogx_secret_name to '' when no initialOgxSecret
      // is provided (the SecretSelector can't visually reflect a pre-existing value), so it must
      // be re-selected — via a freshly-queried button, since AutoragCreate's remount detaches the
      // one captured above — before Next is enabled again.
      const selectOgxSecretButtonAfterBack = await screen.findByTestId(
        'ogx-secret-selector-select-secret',
      );
      await user.click(selectOgxSecretButtonAfterBack);
      const nextButtonAgain = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButtonAgain).toBeEnabled();
      });
      await user.click(nextButtonAgain);

      const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector('a');
      await user.click(homeLink!);

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
        exitType: 'navigate',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'experimentsList',
      });
    });

    it('should NOT fire when the run is created successfully', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const runButton = await screen.findByRole('button', { name: 'Create run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      await waitFor(() => {
        expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
          AUTORAG_EVENTS.RUN_TRIGGERED,
          expect.objectContaining({ success: true }),
        );
      });
      expect(fireMiscTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.FLOW_EXITED,
        expect.anything(),
      );
    });

    it('should fire with exitType: abandon and exitDestination: none on a full page/tab close', async () => {
      renderWithProviders(<AutoragConfigurePage />);
      await screen.findByLabelText(/Name/i);

      window.dispatchEvent(new Event('beforeunload'));

      expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
        exitType: 'abandon',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'none',
      });
    });

    it('should NOT fire abandon on a page/tab close while a run submission is still in flight', async () => {
      const user = userEvent.setup();
      // Never resolves within this test, simulating a submission that is still pending when
      // beforeunload fires.
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockMutateAsync.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const selectOgxSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectOgxSecretButton);
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      const runButton = await screen.findByRole('button', { name: 'Create run' });
      await waitFor(() => {
        expect(runButton).toBeEnabled();
      });
      await user.click(runButton);

      // Confirm the submission is actually in flight before simulating the tab close.
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      window.dispatchEvent(new Event('beforeunload'));

      expect(fireMiscTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.FLOW_EXITED,
        expect.objectContaining({ exitType: 'abandon' }),
      );
    });

    describe('reconfigure flow', () => {
      it('should report lastFunnelStep: run immediately upon reaching the configure step, since the form starts pre-populated', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={{
              display_name: 'Original Run - 1',
              ogx_secret_name: 'Test OGX Secret',
            }}
            initialOgxSecret={{
              uuid: 'ogx-secret-1',
              name: 'Test OGX Secret',
              data: {
                OGX_CLIENT_BASE_URL: 'https://example.com',
                OGX_CLIENT_API_KEY: 'test-key',
              },
              type: 'ogx',
              invalid: false,
            }}
            sourceRunId="prev-run-456"
            sourceRunName="Original Run"
          />,
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => {
          expect(nextButton).toBeEnabled();
        });
        await user.click(nextButton);

        const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector(
          'a',
        );
        await user.click(homeLink!);

        expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
          exitType: 'navigate',
          lastFunnelStep: 'run',
          exitDestination: 'experimentsList',
        });
      });

      it('should fire with exitDestination: otherGenAi when Cancel is clicked after navigating from the results page', async () => {
        const user = userEvent.setup();
        mockLocationState = { from: 'results' };
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={{ display_name: 'Original Run - 1' }}
            sourceRunId="prev-run-456"
            sourceRunName="Original Run"
          />,
        );

        const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
        await user.click(cancelButton);

        expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
          exitType: 'navigate',
          lastFunnelStep: 'defineDetails',
          exitDestination: 'otherGenAi',
        });
      });

      it('should fire with exitDestination: experimentsList when Cancel is clicked without having navigated from the results page', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={{ display_name: 'Original Run - 1' }}
            sourceRunId="prev-run-456"
            sourceRunName="Original Run"
          />,
        );

        const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
        await user.click(cancelButton);

        expect(fireMiscTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.FLOW_EXITED, {
          exitType: 'navigate',
          lastFunnelStep: 'defineDetails',
          exitDestination: 'experimentsList',
        });
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

  describe('Reconfigure mode (with initialValues and sourceRunId)', () => {
    it('should display reconfigure title when sourceRunId and sourceRunName are provided', async () => {
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const heading = await screen.findByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Reconfigure "Original Run"');
      expect(screen.queryByText('Create AutoRAG optimization run')).not.toBeInTheDocument();
    });

    it('should display reconfigure description when sourceRunId is provided', async () => {
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      expect(
        await screen.findByText(/Settings from the previous run have been automatically populated/),
      ).toBeInTheDocument();
    });

    it('should navigate back when Cancel is clicked with sourceRunId', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should display breadcrumb with source run link when navigating from results page', async () => {
      mockLocationState = { from: 'results' };
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const sourceRunBreadcrumb = await screen.findByTestId('configure-breadcrumb-source-run');
      expect(sourceRunBreadcrumb).toHaveTextContent('Original Run');
      expect(sourceRunBreadcrumb.querySelector('a')).toHaveAttribute(
        'href',
        '/gen-ai-studio/autorag/results/test-namespace/prev-run-456',
      );
      const homeBreadcrumb = await screen.findByTestId('experiment-breadcrumb-home');
      expect(homeBreadcrumb.querySelector('a')).toHaveAttribute(
        'href',
        '/gen-ai-studio/autorag/experiments/test-namespace',
      );
      expect(await screen.findByTestId('project-navigator-link-in-breadcrumb')).toHaveTextContent(
        /Go to/,
      );
      const activeBreadcrumb = await screen.findByTestId('configure-breadcrumb-name');
      expect(activeBreadcrumb).toHaveTextContent('Reconfigure');
    });

    it('should display Reconfigure breadcrumb without source run when navigating from experiments page', async () => {
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      expect(screen.queryByTestId('configure-breadcrumb-source-run')).not.toBeInTheDocument();
      const activeBreadcrumb = await screen.findByTestId('configure-breadcrumb-name');
      expect(activeBreadcrumb).toHaveTextContent('Reconfigure');
    });

    it('should navigate back when Cancel is clicked without sourceRunId', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should render "Create new run" button text when sourceRunId is provided', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{
            display_name: 'Reconfigured Run',
            ogx_secret_name: 'Test OGX Secret',
          }}
          initialOgxSecret={{
            uuid: 'ogx-secret-1',
            name: 'Test OGX Secret',
            data: { OGX_CLIENT_BASE_URL: 'https://example.com', OGX_CLIENT_API_KEY: 'test-key' },
            type: 'ogx',
            invalid: false,
          }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      // Verify the prefilled Open GenAI Stack secret is shown
      expect(await screen.findByTestId('ogx-secret-selector-value')).toHaveTextContent(
        'ogx-secret-1',
      );

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      expect(await screen.findByRole('button', { name: 'Create new run' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create run' })).not.toBeInTheDocument();
    });

    it('should render "Create run" button text when sourceRunId is absent', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutoragConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'New Run');

      // Select Open GenAI Stack secret
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
      await user.click(selectSecretButton);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      expect(await screen.findByRole('button', { name: 'Create run' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create new run' })).not.toBeInTheDocument();
    });

    it('should pre-fill display_name from initialValues', async () => {
      renderWithProviders(
        <AutoragConfigurePage initialValues={{ display_name: 'My Previous Run - 1' }} />,
      );

      const nameInput = await screen.findByLabelText(/Name/i);
      expect(nameInput).toHaveValue('My Previous Run - 1');
    });

    it('should pre-fill description from initialValues', async () => {
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{
            display_name: 'Reconfigured',
            description: 'A reconfigured experiment',
          }}
        />,
      );

      const descInput = await screen.findByLabelText(/Description/i);
      expect(descInput).toHaveValue('A reconfigured experiment');
    });

    it('should show Reconfigure in breadcrumb after navigating to configure step', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AutoragConfigurePage
          initialValues={{
            display_name: 'Pre-filled Name',
            ogx_secret_name: 'Test OGX Secret',
          }}
          initialOgxSecret={{
            uuid: 'ogx-secret-1',
            name: 'Test OGX Secret',
            data: { OGX_CLIENT_BASE_URL: 'https://example.com', OGX_CLIENT_API_KEY: 'test-key' },
            type: 'ogx',
            invalid: false,
          }}
          sourceRunId="run-xyz"
          sourceRunName="Original Run"
        />,
      );

      // Verify the prefilled Open GenAI Stack secret is shown
      expect(await screen.findByTestId('ogx-secret-selector-value')).toHaveTextContent(
        'ogx-secret-1',
      );

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      const breadcrumbName = await screen.findByTestId('configure-breadcrumb-name');
      expect(breadcrumbName).toHaveTextContent('Reconfigure');
    });

    describe('configure step with pre-filled values', () => {
      const reconfigureInitialValues = {
        display_name: 'Reconfigured Run',
        description: 'A reconfigured experiment',
        ogx_secret_name: 'Test OGX Secret',
        vector_io_provider_id: 'chromadb',
        input_data_secret_name: 'Test AWS Secret',
        input_data_bucket_name: 'test-bucket',
        input_data_key: 'my-data/input.pdf',
        test_data_secret_name: 'Test AWS Secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'eval.json',
        optimization_metric: 'faithfulness' as const,
        optimization_max_rag_patterns: 10,
      };
      const reconfigureInitialOgxSecret = {
        uuid: 'ogx-secret-1',
        name: 'Test OGX Secret',
        data: { OGX_CLIENT_BASE_URL: 'https://example.com', OGX_CLIENT_API_KEY: 'test-key' },
        type: 'ogx',
        invalid: false,
      };
      const reconfigureInitialSecret = {
        uuid: 'aws-secret-1',
        name: 'Test AWS Secret',
        displayName: 'Test AWS Secret',
        data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
        type: 's3',
        invalid: false,
      };

      const navigateToConfigure = async () => {
        const user = userEvent.setup();

        // Verify the prefilled Open GenAI Stack secret is shown
        expect(await screen.findByTestId('ogx-secret-selector-value')).toHaveTextContent(
          'ogx-secret-1',
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => {
          expect(nextButton).toBeEnabled();
        });
        await user.click(nextButton);

        // Verify we're on the configure step
        expect(await screen.findByText('Knowledge setup')).toBeInTheDocument();

        return user;
      };

      it('should show the pre-filled secret value in the configure step', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-1');
      });

      it('should show the pre-filled input data file in the configure step', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        const table = screen.getByRole('grid', { name: 'Selected input data file' });
        expect(table).toBeInTheDocument();
        expect(screen.getByText('input.pdf')).toBeInTheDocument();
      });

      it('should show the pre-filled Vector I/O provider in the configure step', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent('chromadb');
      });

      it('should show the pre-filled evaluation dataset in the configure step', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('evaluation-select')).toHaveTextContent('eval.json');
      });

      it('should show the pre-filled optimization metric in the configure step', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('optimization-metric-select')).toHaveTextContent(
          'Answer faithfulness',
        );
      });

      it('should show the pre-filled max RAG patterns value in the configure step', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        const input = screen.getByTestId('max-rag-patterns-input').querySelector('input');
        expect(input).toHaveValue(10);
      });

      it('should retain configure-step fields after back and returning to configure', async () => {
        renderWithProviders(
          <AutoragConfigurePage
            initialValues={reconfigureInitialValues}
            initialInputDataSecret={reconfigureInitialSecret}
            initialOgxSecret={reconfigureInitialOgxSecret}
            sourceRunId="run-1"
          />,
        );

        const user = await navigateToConfigure();

        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-1');
        expect(screen.getByText('input.pdf')).toBeInTheDocument();

        await user.click(await screen.findByRole('button', { name: 'Back' }));

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => {
          expect(nextButton).toBeEnabled();
        });
        await user.click(nextButton);

        expect(await screen.findByText('Knowledge setup')).toBeInTheDocument();
        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-1');
        expect(screen.getByText('input.pdf')).toBeInTheDocument();
      });
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
      const selectSecretButton = await screen.findByTestId('ogx-secret-selector-select-secret');
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
        'ogx-secret-selector-select-secret',
      );
      await user.click(selectSecretButtonAgain);

      // Go to configure again
      await user.click(await screen.findByRole('button', { name: 'Next' }));

      // Verify we're in configure step with correct subtitle
      const subtitle = await screen.findByTestId('configure-step-subtitle');
      expect(subtitle).toHaveTextContent('Run “Persistent Experiment” AutoRAG experiment');
    });
  });
});
