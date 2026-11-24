/* eslint-disable camelcase */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router';
import { TrackingProvider } from '~/__tests__/unit/testUtils/TrackingProvider';
import AutomlConfigurePage from '~/app/pages/AutomlConfigurePage';
import { useS3GetFileSchemaQuery } from '~/app/hooks/useS3GetFileSchemaQuery';
import { AUTOML_FAILURE_CATEGORY } from '~/app/utilities/tracking';

const trackEvent = jest.fn();

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockMutateAsync = jest.fn();
const mockResetSchemaCache = jest.fn();
const mockUploadMutateAsync = jest.fn();
let mockLocationState: { from?: string } | undefined;

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

jest.mock('~/app/hooks/useCreatePipelineRunMutation', () => ({
  useCreatePipelineRunMutation: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
  })),
}));
jest.mock('@odh-dashboard/autox-core/ui/hooks', () => ({
  ...jest.requireActual('@odh-dashboard/autox-core/ui/hooks'),
  useS3FileUploadMutation: jest.fn(() => ({
    mutateAsync: mockUploadMutateAsync,
  })),
}));

jest.mock('~/app/hooks/useS3GetFileRowCountQuery', () => ({
  useS3GetFileRowCountQuery: jest.fn(() => ({ data: 144, isFetching: false, error: null })),
}));

jest.mock('~/app/hooks/useS3GetFileSchemaQuery', () => ({
  useS3GetFileSchemaQuery: jest.fn(() => ({
    data: [
      { name: 'column1', type: 'string', task_type: 'binary', values: ['yes', 'no'] },
      { name: 'column2', type: 'integer', task_type: 'regression' },
      { name: 'column3', type: 'double', task_type: 'regression' },
    ],
    isLoading: false,
    isFetching: false,
    error: null,
    resetSchemaCache: mockResetSchemaCache,
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
jest.mock('@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    s3SecretName,
    onSelectFiles,
    onClose,
  }: {
    isOpen: boolean;
    s3SecretName?: string;
    onSelectFiles: (files: unknown) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="file-explorer-modal" data-secret-name={s3SecretName}>
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
jest.mock('@odh-dashboard/autox-core/ui/components/feature', () => {
  const secrets = [
    {
      uuid: 'aws-secret-1',
      name: 'Test AWS Secret',
      displayName: 'Test AWS Secret',
      data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
      type: 's3',
      invalid: false,
    },
    {
      uuid: 'aws-secret-2',
      name: 'Other AWS Secret',
      data: { AWS_S3_BUCKET: 'other-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
      type: 's3',
    },
  ];
  return {
    __esModule: true,
    SecretSelector: ({
      onChange,
      value,
      valueName,
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
      valueName?: string;
      dataTestId?: string;
    }) => {
      const isAwsSelector = dataTestId?.endsWith('aws-secret-selector');
      const selectedValue = valueName
        ? secrets.find((secret) => secret.name === valueName)?.uuid
        : value;

      const handleClick = () => {
        if (isAwsSelector) {
          onChange(secrets[0]);
        }
      };

      return (
        <div data-testid={dataTestId}>
          <button type="button" data-testid={`${dataTestId}-select-secret`} onClick={handleClick}>
            Select Secret
          </button>
          <button
            type="button"
            data-testid={`${dataTestId}-select-other-secret`}
            onClick={() => onChange(secrets[1])}
          >
            Select Other Secret
          </button>
          {selectedValue && <div data-testid={`${dataTestId}-value`}>{selectedValue}</div>}
        </div>
      );
    },
  };
});

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
  return render(component, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <TrackingProvider trackEvent={trackEvent}>
          <BrowserRouter>{children}</BrowserRouter>
        </TrackingProvider>
      </QueryClientProvider>
    ),
  });
};

describe('AutomlConfigurePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockLocationState = undefined;
    mockUploadMutateAsync.mockReset().mockResolvedValue({ uploaded: true, key: 'data.csv' });
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

    it('should fire AutoML Run Details Defined with outcome:submit and hasDescription:false when no description is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => expect(nextButton).toBeEnabled());
      await user.click(nextButton);

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith('AutoML Run Details Defined', {
        outcome: 'submit',
        hasDescription: false,
      });
    });

    it('should fire AutoML Run Details Defined with hasDescription:true when a description is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'Test Experiment');
      const descriptionInput = await screen.findByLabelText(/Description/i);
      await user.type(descriptionInput, 'Some description');

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => expect(nextButton).toBeEnabled());
      await user.click(nextButton);

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith('AutoML Run Details Defined', {
        outcome: 'submit',
        hasDescription: true,
      });
    });
  });

  describe('Create step - Cancel button', () => {
    it('should navigate back when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);
      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should fire AutoML Run Details Defined with outcome:cancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);
      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(trackEvent).toHaveBeenCalledTimes(2);
      expect(trackEvent).toHaveBeenCalledWith('AutoML Run Details Defined', {
        outcome: 'cancel',
        hasDescription: false,
      });
    });

    it('should fire AutoML Flow Exited with defineDetails and experimentsList', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);
      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
        exitType: 'navigate',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'experimentsList',
      });
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
      expect(subtitle).toHaveTextContent('Run “My Experiment” AutoML experiment');
    });

    it('should NOT display description text in configure step', async () => {
      expect(
        screen.queryByText('Automatically configure and optimize your machine learning workflows.'),
      ).not.toBeInTheDocument();
    });

    it('should display breadcrumb in configure step', async () => {
      expect(await screen.findByTestId('experiment-breadcrumb-home')).toHaveTextContent(
        /AutoML in/,
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

    it('should fire AutoML Flow Exited with trainingData and experimentsList when the breadcrumb is clicked', async () => {
      const user = userEvent.setup();
      const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector('a');
      await user.click(homeLink!);
      expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
        exitType: 'navigate',
        lastFunnelStep: 'trainingData',
        exitDestination: 'experimentsList',
      });
    });

    it('should report predictionType (not trainingData) once a target column has been selected', async () => {
      const user = userEvent.setup();

      // Progress past training data: select an AWS connection and browse to a file.
      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);
      const selectFilesButton = await screen.findByRole('button', { name: 'Browse bucket' });
      await user.click(selectFilesButton);
      const fileSelectButton = await screen.findByTestId('file-explorer-select-file');
      await user.click(fileSelectButton);

      // Select a target column — this is what should surface progress past 'trainingData'.
      const targetColumnSelect = await screen.findByTestId('target_column-select');
      await user.click(targetColumnSelect);
      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector('a');
      await user.click(homeLink!);

      expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
        exitType: 'navigate',
        lastFunnelStep: 'predictionType',
        exitDestination: 'experimentsList',
      });
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

    it('should clear optional test-data fields when restarting the configure step for a new run', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AutomlConfigurePage
          initialValues={{
            display_name: 'My Experiment',
            train_data_secret_name: 'Test AWS Secret',
            train_data_bucket_name: 'test-bucket',
            train_data_file_key: 'train.csv',
            dataset_split_mode: 'separate',
            test_data_bucket_name: 'test-bucket',
            test_data_file_key: 'test.csv',
            task_type: 'binary',
            target_column: 'column1',
          }}
          initialInputDataSecret={{
            uuid: 'aws-secret-1',
            name: 'Test AWS Secret',
            data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
            type: 's3',
            invalid: false,
          }}
        />,
      );
      const next = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => expect(next).toBeEnabled());
      await user.click(next);
      expect(screen.getByText('2 of 2 datasets selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Back' }));
      await user.click(await screen.findByRole('button', { name: 'Next' }));

      expect(await screen.findByTestId('dataset-split-auto')).toBeChecked();
      await user.click(screen.getByTestId('dataset-split-separate'));
      expect(screen.getByText('0 of 2 datasets selected')).toBeInTheDocument();
      expect(screen.getByTestId('test-data-accordion-toggle')).toHaveTextContent('Incomplete');
    });

    it('should hide file selection after back and returning to configure without reselecting S3', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AutomlConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      const nextButton = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButton).toBeEnabled();
      });
      await user.click(nextButton);

      const selectAwsSecretButton = await screen.findByTestId('aws-secret-selector-select-secret');
      await user.click(selectAwsSecretButton);

      expect(
        await screen.findByRole('heading', { name: 'Select file from bucket' }),
      ).toBeInTheDocument();

      const backButton = await screen.findByRole('button', { name: 'Back' });
      await user.click(backButton);

      const nextButtonAgain = await screen.findByRole('button', { name: 'Next' });
      await waitFor(() => {
        expect(nextButtonAgain).toBeEnabled();
      });
      await user.click(nextButtonAgain);

      expect(
        screen.queryByRole('heading', { name: 'Select file from bucket' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Select file from bucket' }),
      ).not.toBeInTheDocument();
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

      // Select a target column (required before prediction type cards appear)
      const targetColumnSelect = await screen.findByTestId('target_column-select');
      await user.click(targetColumnSelect);
      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Select a prediction type
      const binaryCard = screen.getByTestId('task-type-card-binary');
      expect(binaryCard).toBeInTheDocument();
      await user.click(binaryCard);

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

      // Select a target column (required before prediction type cards appear)
      const targetColumnSelect = await screen.findByTestId('target_column-select');
      await user.click(targetColumnSelect);
      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Select a prediction type
      const binaryCard = screen.getByTestId('task-type-card-binary');
      expect(binaryCard).toBeInTheDocument();
      await user.click(binaryCard);

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
          { state: { entrySource: 'direct' } },
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

      // Select a target column (required before prediction type cards appear)
      const targetColumnSelect = await screen.findByTestId('target_column-select');
      await user.click(targetColumnSelect);
      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Select a prediction type
      const binaryCard = screen.getByTestId('task-type-card-binary');
      expect(binaryCard).toBeInTheDocument();
      await user.click(binaryCard);

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

      // The in-product notification may keep the detailed message, but analytics must only
      // ever see the fixed, allowlisted failure category — never the raw Error.message, which
      // may originate from the backend/proxy and embed sensitive details.
      expect(trackEvent).toHaveBeenCalledWith(
        'AutoML Run Created',
        expect.objectContaining({ success: false, error: AUTOML_FAILURE_CATEGORY }),
      );
      const allTrackingCalls = JSON.stringify(trackEvent.mock.calls);
      expect(allTrackingCalls).not.toContain('Pipeline creation failed');
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

      // Select a target column (required before prediction type cards appear)
      const targetColumnSelect = await screen.findByTestId('target_column-select');
      await user.click(targetColumnSelect);
      const columnOption = await screen.findByRole('option', { name: /column1/i });
      await user.click(columnOption);

      // Select a prediction type
      const binaryCard = screen.getByTestId('task-type-card-binary');
      expect(binaryCard).toBeInTheDocument();
      await user.click(binaryCard);

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

  describe('Reconfigure mode (with initialValues and sourceRunId)', () => {
    it('should display reconfigure title when sourceRunId and sourceRunName are provided', async () => {
      renderWithProviders(
        <AutomlConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const heading = await screen.findByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Reconfigure "Original Run"');
      expect(screen.queryByText('Create AutoML optimization run')).not.toBeInTheDocument();
    });

    it('should display reconfigure description when sourceRunId is provided', async () => {
      renderWithProviders(
        <AutomlConfigurePage
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
        <AutomlConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should report otherAutoml on Cancel when reconfigure was entered from the results page', async () => {
      const user = userEvent.setup();
      mockLocationState = { from: 'results' };
      renderWithProviders(
        <AutomlConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
        exitType: 'navigate',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'otherAutoml',
        changedFields: '',
      });
    });

    it('should report experimentsList (not otherAutoml) on Cancel when reconfigure was entered from the runs list', async () => {
      // sourceRunId is set for every reconfigure flow, including from the runs list — only the
      // `from: 'results'` location state indicates navigate(-1) returns to another AutoML run.
      const user = userEvent.setup();
      mockLocationState = { from: 'runsList' };
      renderWithProviders(
        <AutomlConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
        exitType: 'navigate',
        lastFunnelStep: 'defineDetails',
        exitDestination: 'experimentsList',
        changedFields: '',
      });
    });

    it('should display breadcrumb with source run link when navigating from results page', async () => {
      mockLocationState = { from: 'results' };
      renderWithProviders(
        <AutomlConfigurePage
          initialValues={{ display_name: 'Original Run - 1' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      const sourceRunBreadcrumb = await screen.findByTestId('configure-breadcrumb-source-run');
      expect(sourceRunBreadcrumb).toHaveTextContent('Original Run');
      expect(sourceRunBreadcrumb.querySelector('a')).toHaveAttribute(
        'href',
        '/develop-train/automl/results/test-namespace/prev-run-456',
      );
      const homeBreadcrumb = await screen.findByTestId('experiment-breadcrumb-home');
      expect(homeBreadcrumb.querySelector('a')).toHaveAttribute(
        'href',
        '/develop-train/automl/experiments/test-namespace',
      );
      expect(await screen.findByTestId('project-navigator-link-in-breadcrumb')).toHaveTextContent(
        /Go to/,
      );
      const activeBreadcrumb = await screen.findByTestId('configure-breadcrumb-name');
      expect(activeBreadcrumb).toHaveTextContent('Reconfigure');
    });

    it('should display Reconfigure breadcrumb without source run when navigating from experiments page', async () => {
      renderWithProviders(
        <AutomlConfigurePage
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
      renderWithProviders(<AutomlConfigurePage />);

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should render "Create new run" button text when sourceRunId is provided', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AutomlConfigurePage
          initialValues={{ display_name: 'Reconfigured Run' }}
          sourceRunId="prev-run-456"
          sourceRunName="Original Run"
        />,
      );

      // Name should already be pre-filled from initialValues
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
      renderWithProviders(<AutomlConfigurePage />);

      const nameInput = await screen.findByLabelText(/Name/i);
      await user.type(nameInput, 'New Run');

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
        <AutomlConfigurePage initialValues={{ display_name: 'My Previous Run - 1' }} />,
      );

      const nameInput = await screen.findByLabelText(/Name/i);
      expect(nameInput).toHaveValue('My Previous Run - 1');
    });

    it('should pre-fill description from initialValues', async () => {
      renderWithProviders(
        <AutomlConfigurePage
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
        <AutomlConfigurePage
          initialValues={{ display_name: 'Pre-filled Name' }}
          sourceRunId="run-xyz"
          sourceRunName="Original Run"
        />,
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
      const tabularInitialValues = {
        display_name: 'Reconfigured Run',
        description: 'A reconfigured experiment',
        train_data_secret_name: 'Test AWS Secret',
        train_data_bucket_name: 'test-bucket',
        train_data_file_key: 'my-data/train.csv',
        task_type: 'binary' as const,
        target_column: 'column1',
        top_n: 7,
      };
      const tabularInitialSecret = {
        uuid: 'aws-secret-1',
        name: 'Test AWS Secret',
        displayName: 'Test AWS Secret',
        data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
        type: 's3',
        invalid: false,
      };

      const navigateToConfigure = async () => {
        const user = userEvent.setup();

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => {
          expect(nextButton).toBeEnabled();
        });
        await user.click(nextButton);

        // Verify we're on the configure step
        expect(await screen.findByText('Documents')).toBeInTheDocument();

        return user;
      };

      it('should show the pre-filled secret value in the configure step', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-1');
      });

      it('should show the pre-filled training data file in the configure step', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        const table = screen.getByRole('grid', { name: 'Selected training data file' });
        expect(table).toBeInTheDocument();
        expect(screen.getByText('train.csv')).toBeInTheDocument();
      });

      it('should pre-select the prediction type card in the configure step', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('task-type-card-binary')).toHaveClass('pf-m-selected');
        expect(screen.getByTestId('task-type-card-multiclass')).not.toHaveClass('pf-m-selected');
      });

      it('should show the pre-filled top_n value in the configure step', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        const input = screen.getByTestId('top-n-input').querySelector('input');
        expect(input).toHaveValue(7);
      });

      it('should show target column fields for a tabular task type in the configure step', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByText('Target column')).toBeInTheDocument();
        expect(screen.getByTestId('target_column-select')).toBeInTheDocument();
      });

      it('should show timeseries fields when task_type is timeseries in the configure step', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={{
              ...tabularInitialValues,
              task_type: 'timeseries',
              target_column: 'column2',
              id_column: 'store_id',
              timestamp_column: 'date',
              prediction_length: 30,
            }}
            sourceRunId="run-1"
          />,
        );

        await navigateToConfigure();

        expect(screen.getByTestId('task-type-card-timeseries')).toHaveClass('pf-m-selected');
        expect(screen.getByText('Target column')).toBeInTheDocument();
        expect(screen.getByTestId('target_column-select')).toBeInTheDocument();
      });

      it.each(['pending', 'failed'] as const)(
        'should block separate-dataset submission while test sampling is %s and allow recovery',
        async (samplingState) => {
          const schemaQuery = jest.mocked(useS3GetFileSchemaQuery);
          const originalImplementation = schemaQuery.getMockImplementation()!;
          let blocked = true;
          schemaQuery.mockImplementation((...args) => ({
            ...originalImplementation(...args),
            isFetching: args[3] === 'my-data/test.csv' && blocked && samplingState === 'pending',
            error:
              args[3] === 'my-data/test.csv' && blocked && samplingState === 'failed'
                ? new Error('CSV validation error: invalid test CSV')
                : null,
          }));
          try {
            const props = {
              initialValues: {
                ...tabularInitialValues,
                dataset_split_mode: 'separate' as const,
                test_data_bucket_name: 'test-bucket',
                test_data_file_key: 'my-data/test.csv',
              },
              initialInputDataSecret: tabularInitialSecret,
              sourceRunId: 'run-1',
            };
            const { rerender } = renderWithProviders(<AutomlConfigurePage {...props} />);
            await navigateToConfigure();
            const submit = screen.getByRole('button', { name: 'Create new run' });
            await waitFor(() => expect(submit).toBeDisabled());
            await act(async () => fireEvent.submit(submit));
            expect(mockMutateAsync).not.toHaveBeenCalled();
            blocked = false;
            rerender(<AutomlConfigurePage {...props} />);
            await waitFor(() => expect(submit).toBeEnabled());
          } finally {
            schemaQuery.mockImplementation(originalImplementation);
          }
        },
      );

      it('should leave an unknown saved connection unresolved', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={{
              ...tabularInitialValues,
              train_data_secret_name: 'Missing AWS Secret',
            }}
            sourceRunId="run-1"
          />,
        );
        await navigateToConfigure();
        expect(screen.queryByTestId('aws-secret-selector-value')).not.toBeInTheDocument();
      });

      it('should submit the restored test dataset without changing separate mode', async () => {
        mockMutateAsync.mockResolvedValue({ run_id: 'restored-run' });
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={{
              ...tabularInitialValues,
              dataset_split_mode: 'separate',
              test_data_bucket_name: 'test-bucket',
              test_data_file_key: 'my-data/test.csv',
            }}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );
        const user = await navigateToConfigure();

        expect(screen.getByTestId('dataset-split-separate')).toBeChecked();
        const submit = screen.getByRole('button', { name: 'Create new run' });
        await waitFor(() => expect(submit).toBeEnabled());
        await user.click(submit);

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            test_data_bucket_name: 'test-bucket',
            test_data_file_key: 'my-data/test.csv',
          }),
        );
        await waitFor(() =>
          expect(mockNavigate).toHaveBeenCalledWith(
            '/develop-train/automl/results/test-namespace/restored-run',
            { state: { entrySource: 'direct' } },
          ),
        );
      });

      it.each(['replace', 'remove'] as const)(
        'should retain the current test-file selection after %s and Back → Next',
        async (action) => {
          renderWithProviders(
            <AutomlConfigurePage
              initialValues={{
                ...tabularInitialValues,
                dataset_split_mode: 'separate',
                test_data_bucket_name: 'test-bucket',
                test_data_file_key: 'old/test.csv',
              }}
              initialInputDataSecret={tabularInitialSecret}
              sourceRunId="run-1"
            />,
          );
          const user = await navigateToConfigure();
          await user.click(screen.getByTestId('test-data-accordion-toggle'));
          if (action === 'replace') {
            await user.click(screen.getByTestId('test-data-browse-bucket-button'));
            await user.click(screen.getByTestId('file-explorer-select-file'));
          } else {
            await user.click(
              within(screen.getByRole('grid', { name: 'Selected test data file' })).getByRole(
                'button',
                { name: 'Remove selection' },
              ),
            );
          }

          await user.click(screen.getByRole('button', { name: 'Back' }));
          const next = await screen.findByRole('button', { name: 'Next' });
          await waitFor(() => expect(next).toBeEnabled());
          await user.click(next);
          await user.click(await screen.findByTestId('test-data-accordion-toggle'));

          if (action === 'replace') {
            expect(screen.getByRole('grid', { name: 'Selected test data file' })).toHaveTextContent(
              'test-file.csv',
            );
          } else {
            expect(
              screen.queryByRole('grid', { name: 'Selected test data file' }),
            ).not.toBeInTheDocument();
            expect(screen.getByTestId('test-data-accordion-toggle')).toHaveTextContent(
              'Incomplete',
            );
            expect(screen.getByText('Complete the Documents section')).toBeInTheDocument();
          }
          expect(screen.queryByTitle('/old/test.csv')).not.toBeInTheDocument();
        },
      );

      it('should retain the current connection in the selector and explorer after Back → Next', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );
        const user = await navigateToConfigure();
        await user.click(screen.getByTestId('aws-secret-selector-select-other-secret'));
        await user.click(screen.getByTestId('browse-bucket-button'));
        expect(screen.getByTestId('file-explorer-modal')).toHaveAttribute(
          'data-secret-name',
          'Other AWS Secret',
        );
        await user.click(screen.getByTestId('file-explorer-select-file'));
        await user.click(screen.getByRole('button', { name: 'Back' }));
        await navigateToConfigure();
        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-2');
        expect(screen.getByText('test-file.csv')).toBeInTheDocument();
        await user.click(screen.getByTestId('browse-bucket-button'));
        expect(screen.getByTestId('file-explorer-modal')).toHaveAttribute(
          'data-secret-name',
          'Other AWS Secret',
        );
      });

      it('should block submission during a replacement upload and preserve the previous test file on failure', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={{
              ...tabularInitialValues,
              dataset_split_mode: 'separate',
              test_data_file_key: 'old-test.csv',
            }}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );
        const user = await navigateToConfigure();
        await user.click(screen.getByTestId('test-data-accordion-toggle'));
        await user.click(
          within(screen.getByRole('group', { name: 'Choose how to add test data' })).getByRole(
            'button',
            { name: 'Upload new file' },
          ),
        );
        mockUploadMutateAsync.mockResolvedValueOnce({ uploaded: true, key: 'test.csv' });
        fireEvent.change(screen.getByTestId('test-data-upload-file-input'), {
          target: { files: [new File(['name\na\n'], 'test.csv', { type: 'text/csv' })] },
        });
        const submit = screen.getByTestId('automl-create-run-button');
        await waitFor(() => expect(submit).toBeEnabled());
        let rejectUpload!: (error: Error) => void;
        mockUploadMutateAsync.mockReturnValueOnce(
          new Promise((_resolve, reject) => {
            rejectUpload = reject;
          }),
        );
        fireEvent.change(screen.getByTestId('test-data-upload-file-input'), {
          target: { files: [new File(['name\nb\n'], 'replacement.csv', { type: 'text/csv' })] },
        });
        await waitFor(() => expect(submit).toBeDisabled());
        const form = submit.closest('form');
        if (!form) {
          throw new Error('Submit button must belong to the configure form');
        }
        await act(async () => {
          fireEvent.submit(form);
        });
        expect(mockMutateAsync).not.toHaveBeenCalled();
        await act(async () => rejectUpload(new Error('Upload failed')));
        await waitFor(() => expect(submit).toBeEnabled());
        await user.click(submit);
        await waitFor(() =>
          expect(mockMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({ test_data_file_key: 'test.csv' }),
          ),
        );
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      it.each(['training', 'test'] as const)(
        'should ignore a late %s upload after Back → Next and a replacement selection',
        async (dataset) => {
          let resolveUpload!: (value: { uploaded: boolean; key: string }) => void;
          mockUploadMutateAsync.mockReturnValueOnce(
            new Promise((resolve) => {
              resolveUpload = resolve;
            }),
          );
          renderWithProviders(
            <AutomlConfigurePage
              initialValues={{
                ...tabularInitialValues,
                ...(dataset === 'test' && {
                  dataset_split_mode: 'separate',
                  test_data_bucket_name: 'test-bucket',
                  test_data_file_key: 'old-test.csv',
                }),
              }}
              initialInputDataSecret={tabularInitialSecret}
              sourceRunId="run-1"
            />,
          );
          const user = await navigateToConfigure();
          if (dataset === 'test') {
            await user.click(screen.getByTestId('test-data-accordion-toggle'));
          }
          await user.click(
            within(
              screen.getByRole('group', {
                name: `Choose how to add ${dataset} data`,
              }),
            ).getByRole('button', { name: 'Upload new file' }),
          );
          fireEvent.change(
            screen.getByTestId(
              dataset === 'test' ? 'test-data-upload-file-input' : 'automl-upload-file-input',
            ),
            { target: { files: [new File(['name\na\n'], 'pending.csv', { type: 'text/csv' })] } },
          );
          await waitFor(() => expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1));

          await user.click(screen.getByRole('button', { name: 'Back' }));
          await navigateToConfigure();
          if (dataset === 'test') {
            await user.click(screen.getByTestId('test-data-accordion-toggle'));
          }
          await user.click(
            screen.getByTestId(
              dataset === 'test' ? 'test-data-browse-bucket-button' : 'browse-bucket-button',
            ),
          );
          await user.click(screen.getByTestId('file-explorer-select-file'));
          await act(async () => resolveUpload({ uploaded: true, key: 'stale-upload.csv' }));

          // Remount again so the visible filename is read back from the retained form.
          await user.click(screen.getByRole('button', { name: 'Back' }));
          await navigateToConfigure();
          if (dataset === 'test') {
            await user.click(screen.getByTestId('test-data-accordion-toggle'));
          }
          expect(
            screen.getByRole('grid', {
              name: `Selected ${dataset} data file`,
            }),
          ).toHaveTextContent('test-file.csv');
          expect(screen.queryByText('stale-upload.csv')).not.toBeInTheDocument();
        },
      );

      it('should retain configure-step fields after back and returning to configure', async () => {
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        const user = await navigateToConfigure();

        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-1');
        expect(screen.getByText('train.csv')).toBeInTheDocument();
        expect(screen.getByTestId('task-type-card-binary')).toHaveClass('pf-m-selected');

        await user.click(await screen.findByRole('button', { name: 'Back' }));

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => {
          expect(nextButton).toBeEnabled();
        });
        await user.click(nextButton);

        expect(await screen.findByText('Documents')).toBeInTheDocument();
        expect(screen.getByTestId('aws-secret-selector-value')).toHaveTextContent('aws-secret-1');
        expect(screen.getByText('train.csv')).toBeInTheDocument();
        expect(screen.getByTestId('task-type-card-binary')).toHaveClass('pf-m-selected');
      });
    });

    describe('AutoML Run Reconfigured tracking - changedFields', () => {
      const tabularInitialValues = {
        display_name: 'Reconfigured Run',
        description: 'A reconfigured experiment',
        train_data_secret_name: 'Test AWS Secret',
        train_data_bucket_name: 'test-bucket',
        train_data_file_key: 'my-data/train.csv',
        task_type: 'binary' as const,
        target_column: 'column1',
        // Real AutomlReconfigureLoader always resolves and pre-fills eval_metric — mirror that
        // here so the assertions aren't polluted by a spurious optimizationMetric diff.
        eval_metric: 'accuracy' as const,
        top_n: 7,
      };
      const tabularInitialSecret = {
        uuid: 'aws-secret-1',
        name: 'Test AWS Secret',
        displayName: 'Test AWS Secret',
        data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
        type: 's3',
        invalid: false,
      };

      it('should NOT include targetColumn in changedFields when the target column is unchanged', async () => {
        const user = userEvent.setup();
        mockMutateAsync.mockResolvedValue({ run_id: 'reconfigured-run-1' });

        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => expect(nextButton).toBeEnabled());
        await user.click(nextButton);

        const submitButton = await screen.findByRole('button', { name: 'Create new run' });
        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
        expect(trackEvent).toHaveBeenCalledWith(
          'AutoML Run Reconfigured',
          expect.objectContaining({ changedFields: '' }),
        );
      });

      it('should include targetColumn in changedFields when the target column is changed', async () => {
        const user = userEvent.setup();
        mockMutateAsync.mockResolvedValue({ run_id: 'reconfigured-run-2' });

        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => expect(nextButton).toBeEnabled());
        await user.click(nextButton);

        // Change the target column to a different column
        const targetColumnSelect = await screen.findByTestId('target_column-select');
        await user.click(targetColumnSelect);
        const columnOption = await screen.findByRole('option', { name: /column2/i });
        await user.click(columnOption);

        // Re-select the prediction type, since changing the target column resets it
        const regressionCard = await screen.findByTestId('task-type-card-regression');
        await user.click(regressionCard);

        const submitButton = await screen.findByRole('button', { name: 'Create new run' });
        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
        // Switching prediction type also recomputes the default optimization metric for the
        // new task type, so that legitimately shows up as changed too.
        expect(trackEvent).toHaveBeenCalledWith(
          'AutoML Run Reconfigured',
          expect.objectContaining({
            changedFields: 'predictionType,optimizationMetric,targetColumn',
          }),
        );
      });

      it('should still report changedFields when the reconfigure mutation fails', async () => {
        const user = userEvent.setup();
        mockMutateAsync.mockRejectedValue(new Error('Pipeline creation failed'));

        renderWithProviders(
          <AutomlConfigurePage
            initialValues={tabularInitialValues}
            initialInputDataSecret={tabularInitialSecret}
            sourceRunId="run-1"
          />,
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => expect(nextButton).toBeEnabled());
        await user.click(nextButton);

        // Change the target column to a different column
        const targetColumnSelect = await screen.findByTestId('target_column-select');
        await user.click(targetColumnSelect);
        const columnOption = await screen.findByRole('option', { name: /column2/i });
        await user.click(columnOption);

        // Re-select the prediction type, since changing the target column resets it
        const regressionCard = await screen.findByTestId('task-type-card-regression');
        await user.click(regressionCard);

        const submitButton = await screen.findByRole('button', { name: 'Create new run' });
        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());

        // The diff must be computed regardless of mutation outcome — a failed reconfiguration
        // still changed these fields, and reporting an empty diff would make failure analysis
        // on this event unusable.
        expect(trackEvent).toHaveBeenCalledWith(
          'AutoML Run Reconfigured',
          expect.objectContaining({
            changedFields: 'predictionType,optimizationMetric,targetColumn',
            outcome: 'submit',
            success: false,
            // Analytics must only ever see the fixed, allowlisted failure category — never
            // the raw Error.message, which may embed backend/proxy-originated sensitive details.
            error: AUTOML_FAILURE_CATEGORY,
          }),
        );
        const allTrackingCalls = JSON.stringify(trackEvent.mock.calls);
        expect(allTrackingCalls).not.toContain('Pipeline creation failed');
      });
    });

    describe('AutoML Flow Exited tracking - reconfigure funnel step and changedFields', () => {
      const initialValues = {
        display_name: 'Reconfigured Run',
        description: 'A reconfigured experiment',
        train_data_secret_name: 'Test AWS Secret',
        train_data_bucket_name: 'test-bucket',
        train_data_file_key: 'my-data/train.csv',
        task_type: 'binary' as const,
        target_column: 'column1',
        eval_metric: 'accuracy' as const,
        top_n: 7,
      };
      const initialSecret = {
        uuid: 'aws-secret-1',
        name: 'Test AWS Secret',
        displayName: 'Test AWS Secret',
        data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
        type: 's3',
        invalid: false,
      };

      it('should report configure (not trainingData/predictionType) with an empty changedFields when nothing was changed', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={initialValues}
            initialInputDataSecret={initialSecret}
            sourceRunId="run-1"
          />,
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => expect(nextButton).toBeEnabled());
        await user.click(nextButton);

        // The configure screen is fully populated on mount — reconfigure has no equivalent to
        // the create flow's progressive trainingData → predictionType unlocking to report.
        await screen.findByTestId('target_column-select');

        const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector(
          'a',
        );
        await user.click(homeLink!);

        expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
          exitType: 'navigate',
          lastFunnelStep: 'configure',
          exitDestination: 'experimentsList',
          changedFields: '',
        });
      });

      it('should report the changed fields when the user modifies the target column before leaving', async () => {
        const user = userEvent.setup();
        renderWithProviders(
          <AutomlConfigurePage
            initialValues={initialValues}
            initialInputDataSecret={initialSecret}
            sourceRunId="run-1"
          />,
        );

        const nextButton = await screen.findByRole('button', { name: 'Next' });
        await waitFor(() => expect(nextButton).toBeEnabled());
        await user.click(nextButton);

        // Selecting a different column also changes its inferred task type, and therefore the
        // task-type-default optimization metric — same three-field diff as the equivalent
        // submit-time changedFields test above, for the same fixture and interaction.
        const targetColumnSelect = await screen.findByTestId('target_column-select');
        await user.click(targetColumnSelect);
        const columnOption = await screen.findByRole('option', { name: /column2/i });
        await user.click(columnOption);

        const homeLink = (await screen.findByTestId('experiment-breadcrumb-home')).querySelector(
          'a',
        );
        await user.click(homeLink!);

        expect(trackEvent).toHaveBeenCalledWith('AutoML Flow Exited', {
          exitType: 'navigate',
          lastFunnelStep: 'configure',
          exitDestination: 'experimentsList',
          changedFields: 'predictionType,optimizationMetric,targetColumn',
        });
      });
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
      expect(subtitle).toHaveTextContent('Run “Persistent Experiment” AutoML experiment');
    });
  });
});
