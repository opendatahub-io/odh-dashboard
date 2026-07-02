import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AgentDeployWizard from '~/app/deployWizard/AgentDeployWizard';
import { DeployAgentWizardStepTitle } from '~/app/deployWizard/types';

const mockNavigate = jest.fn();

const expectWizardNextDisabled = (): void => {
  expect(screen.getByTestId('deploy-agent-wizard-next')).toHaveAttribute('aria-disabled', 'true');
};

const expectWizardNextEnabled = (): void => {
  expect(screen.getByTestId('deploy-agent-wizard-next')).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
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

jest.mock('mod-arch-core', () => ({
  ...jest.requireActual<typeof import('mod-arch-core')>('mod-arch-core'),
  useNamespaceSelector: () => ({
    namespaces: [{ name: 'team1', displayName: 'team1' }],
    namespacesLoaded: true,
    namespacesLoadError: undefined,
    updatePreferredNamespace: jest.fn(),
  }),
}));

const renderWizard = (props?: { namespace?: string; returnRoute?: string }) =>
  render(
    <MemoryRouter>
      <AgentDeployWizard namespace={props?.namespace ?? 'team1'} returnRoute={props?.returnRoute} />
    </MemoryRouter>,
  );

describe('AgentDeployWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('shows persistent volume size only when persistent storage is enabled', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));

    expect(screen.queryByTestId('deploy-agent-persistent-volume-size')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('deploy-agent-enable-persistent-storage'));

    expect(screen.getByTestId('deploy-agent-persistent-volume-size')).toBeInTheDocument();
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

    expectWizardNextDisabled();
  });

  it('keeps Next disabled for invalid pull secret', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.type(screen.getByTestId('deploy-agent-pull-secret'), 'bad secret');

    expectWizardNextDisabled();
  });

  it('disables Next on step 2 until workload type is selected', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));

    expectWizardNextDisabled();

    await user.selectOptions(screen.getByTestId('deploy-agent-workload-type-select'), 'deployment');
    expectWizardNextEnabled();
  });

  it('disables Next on step 2 when persistent storage size is invalid', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.selectOptions(screen.getByTestId('deploy-agent-workload-type-select'), 'deployment');
    await user.click(screen.getByTestId('deploy-agent-enable-persistent-storage'));
    await user.clear(screen.getByTestId('deploy-agent-persistent-volume-size'));
    await user.type(screen.getByTestId('deploy-agent-persistent-volume-size'), '1 GB');

    expectWizardNextDisabled();
  });

  it('navigates to return route when deploy agent is submitted on the final step', async () => {
    const user = userEvent.setup();

    renderWizard({ returnRoute: '/ai-hub/agents/deployments/team1' });

    await user.type(screen.getByTestId('deploy-agent-container-image'), 'quay.io/myorg/my-agent');
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.selectOptions(screen.getByTestId('deploy-agent-protocol-select'), 'a2a');
    await user.selectOptions(screen.getByTestId('deploy-agent-workload-type-select'), 'deployment');

    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-next'));
    await user.click(screen.getByTestId('deploy-agent-wizard-submit'));

    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1');
  });
});
