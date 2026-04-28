/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router';
import AutomlConfigurePage from '~/app/pages/AutomlConfigurePage';

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

// Truncate relies on DOM measurement APIs (scrollWidth) unavailable in JSDOM.
jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  Truncate: ({ content }: { content: string }) => <span>{content}</span>,
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
    mutateAsync: jest.fn().mockResolvedValue({ uploaded: true, key: 'data.csv' }),
  })),
}));

jest.mock('~/app/hooks/queries', () => ({
  useS3GetFileSchemaQuery: jest.fn(() => ({
    data: [
      { name: 'column1', type: 'string' },
      { name: 'column2', type: 'int64' },
      { name: 'column3', type: 'float64' },
    ],
    isLoading: false,
    isFetching: false,
    error: null,
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

jest.mock('~/app/components/common/AutomlHeader/AutomlHeader', () => ({
  __esModule: true,
  default: () => <span>AutoML</span>,
}));

// Mock S3FileExplorer used by AutomlConfigure
jest.mock('~/app/components/common/S3FileExplorer/S3FileExplorer.tsx', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onSelectFiles,
    onClose,
  }: {
    isOpen: boolean;
    onSelectFiles: (files: unknown) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="file-explorer-modal">
        <button
          data-testid="file-explorer-select-file"
          onClick={() => {
            onSelectFiles([{ name: 'test-file.csv', path: '/test-file.csv' }]);
            onClose();
          }}
        >
          Select File
        </button>
      </div>
    ) : null,
}));

// Mock useWatchConnectionTypes used by AutomlConfigure
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

describe('AutomlConfigurePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
  });

  describe('Initial state', () => {
    it('should render the page with AutoML title', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      expect(await screen.findByText('AutoML')).toBeInTheDocument();
    });

    it('should render AutomlCreate component on initial load', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      // Check for form fields that are rendered by AutomlCreate
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('should NOT render AutomlConfigure component on initial load', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      // AutomlConfigure has "Documents" and "Configure details" headings
      expect(screen.queryByText('Documents')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure details')).not.toBeInTheDocument();
    });

    it('should display "Create AutoML optimization run" subtitle in create step', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      expect(await screen.findByText('Create AutoML optimization run')).toBeInTheDocument();
    });

    it('should display description text in create step', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      expect(
        await screen.findByText(
          'Automatically configure and optimize your machine learning workflows.',
        ),
      ).toBeInTheDocument();
    });

    it('should NOT display breadcrumb in create step', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('Create step - Next button', () => {
    it('should disable Next button when name is empty', async () => {
      renderWithProviders(<AutomlConfigurePage />);

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when name is filled', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Find the Next button (it should be enabled after form updates)
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
    });

    it('should transition to configure step when Next button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Click Next button
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Should now show configure component
      expect(await screen.findByText('Documents')).toBeInTheDocument();
      expect(await screen.findByText('Configure details')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Name/i)).not.toBeInTheDocument();
    });
  });

  describe('Create step - Cancel button', () => {
    it('should render Cancel link with correct href', async () => {
      renderWithProviders(<AutomlConfigurePage />);
      const cancelLink = await screen.findByRole('link', { name: 'Cancel' });
      expect(cancelLink).toBeInTheDocument();
      expect(cancelLink).toHaveAttribute(
        'href',
        '/develop-train/automl/experiments/test-namespace',
      );
    });
  });

  describe('Configure step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      // Click Next button to go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);
    });

    it('should render AutomlConfigure component in configure step', async () => {
      // Check for distinctive elements from AutomlConfigure
      expect(await screen.findByText('Documents')).toBeInTheDocument();
      expect(await screen.findByText('Configure details')).toBeInTheDocument();
    });

    it('should display experiment name in subtitle in configure step', async () => {
      const subtitle = await screen.findByTestId('configure-step-subtitle');
      expect(subtitle).toHaveTextContent('"My Experiment" configurations');
    });

    it('should NOT display description text in configure step', async () => {
      expect(
        screen.queryByText('Automatically configure and optimize your machine learning workflows.'),
      ).not.toBeInTheDocument();
    });

    it('should display breadcrumb in configure step', async () => {
      expect(await screen.findByText('AutoML: test-namespace')).toBeInTheDocument();
      const breadcrumbName = await screen.findByTestId('configure-breadcrumb-name');
      expect(breadcrumbName).toHaveTextContent('My Experiment');
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
      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Click Back button
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Should show create component again (has Name, Description)
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/Description/i)).toBeInTheDocument();
      // Should NOT show configure component (Documents, Configure details)
      expect(screen.queryByText('Documents')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure details')).not.toBeInTheDocument();
    });

    it('should preserve form data when navigating back', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the form
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Preserved Name');

      const descriptionInput = await screen.findByLabelText(/Description/i);
      await user.type(descriptionInput, 'Preserved Description');

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Go back to create step
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Re-query inputs after navigation (DOM elements are remounted)
      const nameInputAfterBack = await screen.findByLabelText(/Name/i);
      const descriptionInputAfterBack = await screen.findByLabelText(/Description/i);

      // Verify form data is preserved
      expect(nameInputAfterBack).toHaveValue('Preserved Name');
      expect(descriptionInputAfterBack).toHaveValue('Preserved Description');
    });
  });

  describe('Configure step - Create run', () => {
    it('should call mutateAsync when Create run button is clicked with valid form', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Select AWS connection to populate train_data_secret_name and train_data_bucket_name
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      // Browse bucket to populate train_data_file_key
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      // FileExplorer should open
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Select a prediction type (required before label column appears)
      const binaryRadio = document.getElementById('task-type-binary');
      expect(binaryRadio).not.toBeNull();
      fireEvent.click(binaryRadio!);

      // Select a label column
      const labelColumnSelect = await screen.findByTestId('label_column-select');
      await user.click(labelColumnSelect);

      // Select the first column option
      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Wait for form to be valid and Run button to be enabled
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(
        () => {
          expect(runButton).toBeEnabled();
        },
        { timeout: 3000 },
      );

      // Click Create run button
      await user.click(runButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('should navigate to results page after successful pipeline run creation', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({ run_id: 'new-run-123' });

      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Select a prediction type (required before label column appears)
      const binaryRadio = document.getElementById('task-type-binary');
      expect(binaryRadio).not.toBeNull();
      fireEvent.click(binaryRadio!);

      // Select a label column
      const labelColumnSelect = await screen.findByTestId('label_column-select');
      await user.click(labelColumnSelect);

      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Click Create run button
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(
        () => {
          expect(runButton).toBeEnabled();
        },
        { timeout: 3000 },
      );
      await user.click(runButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/develop-train/automl/results/test-namespace/new-run-123',
        );
      });
    });

    it('should show error notification when pipeline run creation fails', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Pipeline creation failed'));

      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Select a prediction type (required before label column appears)
      const binaryRadio = document.getElementById('task-type-binary');
      expect(binaryRadio).not.toBeNull();
      fireEvent.click(binaryRadio!);

      // Select a label column
      const labelColumnSelect = await screen.findByTestId('label_column-select');
      await user.click(labelColumnSelect);

      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Click Create run button
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(
        () => {
          expect(runButton).toBeEnabled();
        },
        { timeout: 3000 },
      );
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

      renderWithProviders(<AutomlConfigurePage />);

      // Fill in the name
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      // Go to configure step
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Select AWS connection and files to make form valid
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);

      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Select a prediction type (required before label column appears)
      const binaryRadio = document.getElementById('task-type-binary');
      expect(binaryRadio).not.toBeNull();
      fireEvent.click(binaryRadio!);

      // Select a label column
      const labelColumnSelect = await screen.findByTestId('label_column-select');
      await user.click(labelColumnSelect);

      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Click Create run button
      const runButton = await screen.findByRole('button', {
        name: 'Create run',
      });
      await waitFor(
        () => {
          expect(runButton).toBeEnabled();
        },
        { timeout: 3000 },
      );
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

      renderWithProviders(<AutomlConfigurePage />);
      expect(await screen.findByTestId('invalid-project')).toBeInTheDocument();
    });

    it('should render InvalidProject when namespace is invalid', async () => {
      mockUseParams.mockReturnValue({ namespace: 'nonexistent-namespace' });

      renderWithProviders(<AutomlConfigurePage />);
      expect(await screen.findByTestId('invalid-project')).toBeInTheDocument();
    });

    it('should render content when namespace is valid', async () => {
      mockUseParams.mockReturnValue({ namespace: 'test-namespace' });

      renderWithProviders(<AutomlConfigurePage />);
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.queryByTestId('invalid-project')).not.toBeInTheDocument();
    });

    it('should render content when namespace is undefined but namespaces exist', async () => {
      mockUseParams.mockReturnValue({ namespace: undefined });

      renderWithProviders(<AutomlConfigurePage />);
      expect(await screen.findByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.queryByTestId('invalid-project')).not.toBeInTheDocument();
    });
  });

  describe('Form persistence', () => {
    it('should maintain form state across step transitions', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      // Fill in form fields
      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Persistent Experiment');

      const descriptionInput = await screen.findByLabelText(/Description/i);
      await user.type(descriptionInput, 'Persistent Description');

      // Go to configure
      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Go back
      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      // Verify form data is preserved
      expect(nameInput).toHaveValue('Persistent Experiment');
      expect(descriptionInput).toHaveValue('Persistent Description');

      // Go to configure again
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      // Verify we're in configure step with correct subtitle
      const subtitle = await screen.findByTestId('configure-step-subtitle');
      expect(subtitle).toHaveTextContent('"Persistent Experiment" configurations');
    });
  });
});
