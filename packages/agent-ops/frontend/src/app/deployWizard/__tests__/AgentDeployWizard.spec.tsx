import * as React from 'react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AgentDeployWizard from '~/app/deployWizard/AgentDeployWizard';
import { DeployAgentWizardStepTitle } from '~/app/deployWizard/types';

const mockNavigate = jest.fn();
const mockDeployAgent = jest.fn();
const mockNotificationSuccess = jest.fn();
const mockNotificationError = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/api/deployAgent', () => ({
  deployAgent: () => (opts: unknown, request: unknown) => mockDeployAgent(opts, request),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: mockNotificationSuccess,
    error: mockNotificationError,
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  }),
}));

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () => ({
  __esModule: true,
  default: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  ),
}));

jest.mock('~/app/components/ScrollLock', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/app/deployWizard/ExitDeployAgentModal', () => ({
  __esModule: true,
  default: ({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) => (
    <div data-testid="exit-deploy-agent-modal">
      <button type="button" data-testid="exit-deploy-agent-discard-button" onClick={onConfirm}>
        Discard
      </button>
      <button type="button" data-testid="exit-deploy-agent-cancel-button" onClick={onClose}>
        Cancel
      </button>
    </div>
  ),
}));

jest.mock('~/app/hooks/useAgentOpsProjectNamespaces', () => ({
  getEffectiveProjectNamespaces: (
    projectNamespaces: { name: string; displayName: string }[],
    isLoading: boolean,
    fallbackNamespace?: string,
  ) => {
    if (projectNamespaces.length > 0) {
      return projectNamespaces;
    }
    if (isLoading && fallbackNamespace) {
      return [{ name: fallbackNamespace, displayName: fallbackNamespace }];
    }
    return projectNamespaces;
  },
  useAgentOpsProjectNamespaces: () => ({
    projectNamespaces: [{ name: 'team1', displayName: 'team1' }],
    isLoading: false,
    loadError: null,
    onProjectSelection: jest.fn(),
  }),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectSelector', () => ({
  __esModule: true,
  default: ({
    namespace,
    onSelection,
    placeholder,
  }: {
    namespace: string;
    onSelection: (projectName: string) => void;
    placeholder?: string;
  }) => (
    <select
      data-testid="deploy-agent-project-select"
      value={namespace}
      onChange={(event) => onSelection(event.target.value)}
    >
      <option value="">{placeholder ?? 'Select a project'}</option>
      <option value="team1">team1</option>
    </select>
  ),
}));

jest.mock('@odh-dashboard/internal/components/SimpleSelect', () => ({
  __esModule: true,
  default: ({
    dataTestId,
    value,
    options = [],
    onChange,
    placeholder,
  }: {
    dataTestId?: string;
    value?: string;
    options?: { key: string; label: string }[];
    onChange: (key: string) => void;
    placeholder?: string;
  }) => (
    <select
      data-testid={dataTestId}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder ?? 'Select...'}</option>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock('@odh-dashboard/internal/components/NumberInputWrapper', () => ({
  __esModule: true,
  default: ({
    'data-testid': dataTestId,
    value,
    onChange,
  }: {
    'data-testid'?: string;
    value?: number;
    onChange?: (value: number | undefined) => void;
  }) => (
    <input
      data-testid={dataTestId}
      type="number"
      value={value ?? ''}
      onChange={(event) => {
        const nextValue = event.target.value === '' ? undefined : Number(event.target.value);
        onChange?.(Number.isNaN(nextValue) ? undefined : nextValue);
      }}
    />
  ),
}));

const expectWizardNextDisabled = (): void => {
  expect(screen.getByTestId('deploy-agent-wizard-next')).toHaveAttribute('aria-disabled', 'true');
};

const expectWizardNextEnabled = (): void => {
  expect(screen.getByTestId('deploy-agent-wizard-next')).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
};

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual<typeof import('mod-arch-core')>('mod-arch-core'),
  useNamespaceSelector: () => ({
    namespaces: [{ name: 'team1', displayName: 'team1' }],
    namespacesLoaded: true,
    namespacesLoadError: undefined,
    updatePreferredNamespace: jest.fn(),
  }),
}));

const renderWizard = (props?: { namespace?: string; returnRoute?: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AgentDeployWizard
          namespace={props?.namespace ?? 'team1'}
          returnRoute={props?.returnRoute}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('AgentDeployWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeployAgent.mockResolvedValue({
      success: true,
      name: 'my-agent',
      namespace: 'team1',
      message: 'Agent deployed successfully',
    });
  });

  it('renders the deploy agent title and all wizard step names', () => {
    renderWizard();

    expect(screen.getByText('Deploy agent')).toBeInTheDocument();
    expect(
      screen.getByText('Specify the container image and where the agent will be deployed.'),
    ).toBeInTheDocument();

    Object.values(DeployAgentWizardStepTitle).forEach((stepTitle) => {
      expect(screen.getByRole('button', { name: stepTitle })).toBeInTheDocument();
    });
  });

  it('disables Next on step 1 until required fields are valid', async () => {
    renderWizard();

    expectWizardNextDisabled();

    await userEvent.type(
      screen.getByTestId('deploy-agent-container-image'),
      'quay.io/myorg/my-agent',
    );

    await waitFor(() => {
      expectWizardNextEnabled();
    });
  });

  it('auto-generates agent name from container image path', async () => {
    renderWizard();

    await userEvent.type(
      screen.getByTestId('deploy-agent-container-image'),
      'quay.io/myorg/my-agent',
    );

    expect(screen.getByTestId('deploy-agent-name')).toHaveValue('my-agent');
  });

  it('disables Back on step 1', () => {
    renderWizard();

    expect(screen.getByTestId('deploy-agent-wizard-back')).toHaveAttribute('aria-disabled', 'true');
  });

  it('preserves step 1 data when navigating back from step 2', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-back'));

    expect(screen.getByTestId('deploy-agent-container-image')).toHaveValue(
      'quay.io/myorg/my-agent',
    );
    expect(screen.getByTestId('deploy-agent-name')).toHaveValue('my-agent');
  });

  it('navigates back when cancel is clicked without dirty form', async () => {
    const user = userEvent.setup();

    renderWizard();

    await user.click(screen.getByTestId('deploy-agent-wizard-cancel'));
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1');
  });

  it('navigates to returnRoute on cancel when provided', async () => {
    const user = userEvent.setup();

    renderWizard({ returnRoute: '/ai-hub/agents/deployments/team1/my-agent' });

    await user.click(screen.getByTestId('deploy-agent-wizard-cancel'));
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1/my-agent');
  });

  it('keeps Next disabled when agent name is cleared', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.clear(screen.getByTestId('deploy-agent-name'));

    expectWizardNextDisabled();
  });

  it('shows exit modal when cancel is clicked with dirty form', async () => {
    const user = userEvent.setup();

    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-cancel'));

    expect(screen.getByTestId('exit-deploy-agent-modal')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('exit-deploy-agent-discard-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1');
  });

  it('closes exit modal on cancel without navigating', async () => {
    const user = userEvent.setup();

    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-cancel'));
    expect(screen.getByTestId('exit-deploy-agent-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('exit-deploy-agent-cancel-button'));
    expect(screen.queryByTestId('exit-deploy-agent-modal')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Deploy agent')).toBeInTheDocument();
  });

  it('keeps Next disabled for invalid agent name', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.clear(screen.getByTestId('deploy-agent-name'));
    await user.type(screen.getByTestId('deploy-agent-name'), 'Invalid_Name!');

    expect(screen.getByText('Agent name must be a valid DNS-1123 label.')).toBeInTheDocument();
    expectWizardNextDisabled();
  });

  it('keeps Next disabled for invalid pull secret', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.type(screen.getByTestId('deploy-agent-pull-secret'), 'bad secret');

    expectWizardNextDisabled();
  });

  it('enables Next on step 2 with default protocol', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));

    expectWizardNextEnabled();
    expect(screen.getByTestId('deploy-agent-workload-type-select')).toHaveValue('sandbox');
    expect(screen.queryByTestId('deploy-agent-enable-persistent-storage')).not.toBeInTheDocument();
  });

  it('deploys agent and navigates to detail page when submitted on the final step', async () => {
    const user = userEvent.setup();

    renderWizard({ returnRoute: '/ai-hub/agents/deployments/team1' });

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.selectOptions(screen.getByTestId('deploy-agent-protocol-select'), 'a2a');
    await user.type(screen.getByTestId('deploy-agent-framework'), 'langgraph');

    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    expect(screen.getByTestId('deploy-agent-port-name-0')).toHaveValue('http');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));

    expect(screen.getByTestId('deploy-agent-summary-container-image')).toHaveTextContent(
      'quay.io/myorg/my-agent',
    );
    expect(screen.getByTestId('deploy-agent-summary-framework')).toHaveTextContent('langgraph');
    expect(screen.getByTestId('deploy-agent-summary-protocol')).toHaveTextContent(
      'A2A (Agent-to-Agent)',
    );
    expect(screen.queryByTestId('deploy-agent-summary-workload-type')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deploy-agent-summary-persistent-storage')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('deploy-agent-wizard-submit'));

    await waitFor(() => {
      expect(mockDeployAgent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          name: 'my-agent',
          namespace: 'team1',
          containerImage: 'quay.io/myorg/my-agent',
          imageTag: 'latest',
          protocol: 'a2a',
          framework: 'langgraph',
        }),
      );
    });
    expect(mockNotificationSuccess).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1/my-agent');
  });

  it('shows networking step subtitle once without external access controls', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));

    expect(screen.getByTestId('deploy-agent-port-name-0')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Enable external access to the agent endpoint.' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText('Configure the service port for the agent Sandbox workload.'),
    ).toHaveLength(1);
  });

  it('renders a single service port row without add or remove controls', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));

    expect(screen.getByTestId('deploy-agent-port-name-0')).toBeInTheDocument();
    expect(screen.queryByTestId('deploy-agent-port-name-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deploy-agent-add-service-port')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deploy-agent-remove-service-port-0')).not.toBeInTheDocument();
  });

  it('keeps Next disabled on environment variables step when an environment variable row is incomplete', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-add-env-var'));

    expectWizardNextDisabled();
    expect(screen.getByText('Environment variable name is required')).toBeInTheDocument();
    expect(screen.getByTestId('deploy-agent-env-var-name-0')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('offers only direct value for environment variable type', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-add-env-var'));

    const typeSelect = screen.getByTestId('deploy-agent-env-var-type-0');
    expect(typeSelect).toHaveValue('direct');
    const options = Array.from(typeSelect.querySelectorAll('option'));
    expect(options.filter((option) => option.value === 'direct')).toHaveLength(1);
    expect(options.some((option) => option.value === 'secret')).toBe(false);
    expect(options.some((option) => option.value === 'configmap')).toBe(false);
    expect(screen.getByTestId('deploy-agent-env-var-value-0')).toBeInTheDocument();
  });
});
