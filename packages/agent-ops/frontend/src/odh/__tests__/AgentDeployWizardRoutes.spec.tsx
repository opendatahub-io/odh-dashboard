import * as React from 'react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgentDeployWizardPage from '~/app/deployWizard/AgentDeployWizardPage';
import AgentDeployWizardRoutes from '~/odh/AgentDeployWizardRoutes';
import { agentDeployWizardPath } from '~/app/utilities/routes';

jest.mock('@odh-dashboard/internal/pages/ApplicationsPage', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock('~/app/components/ScrollLock', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
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
    projectNamespaces: [{ name: 'aa-fede', displayName: 'aa-fede' }],
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
      <option value="aa-fede">aa-fede</option>
    </select>
  ),
}));

jest.mock('@odh-dashboard/ui-core/components/SimpleSelect', () => ({
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
    namespaces: [{ name: 'aa-fede', displayName: 'aa-fede' }],
    namespacesLoaded: true,
    namespacesLoadError: undefined,
    updatePreferredNamespace: jest.fn(),
  }),
}));

jest.mock('~/odh/AgentOpsFederatedProviders', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('~/odh/components/ProjectsBridgeProviderWrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const wizardLocationState = {
  namespace: 'aa-fede',
  returnRoute: '/ai-hub/agents/deployments/aa-fede',
};

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('AgentDeployWizardRoutes', () => {
  it('renders the deploy wizard when mounted as a host app.route breakout', () => {
    renderWithQueryClient(
      <MemoryRouter
        initialEntries={[
          {
            pathname: agentDeployWizardPath,
            state: wizardLocationState,
          },
        ]}
      >
        <Routes>
          <Route path={agentDeployWizardPath} element={<AgentDeployWizardRoutes />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Deploy agent')).toBeInTheDocument();
    expect(screen.getByTestId('deploy-agent-project-select')).toBeInTheDocument();
  });

  it('redirects to deployments when wizard state is missing', () => {
    render(
      <MemoryRouter initialEntries={[agentDeployWizardPath]}>
        <Routes>
          <Route path={agentDeployWizardPath} element={<AgentDeployWizardPage />} />
          <Route path="/ai-hub/agents/deployments" element={<div>Deployments list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Deployments list')).toBeInTheDocument();
  });

  it('redirects to deployments when namespace is invalid', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: agentDeployWizardPath,
            state: {
              namespace: 'INVALID_NAME',
              returnRoute: '/ai-hub/agents/deployments/INVALID_NAME',
            },
          },
        ]}
      >
        <Routes>
          <Route path={agentDeployWizardPath} element={<AgentDeployWizardPage />} />
          <Route path="/ai-hub/agents/deployments" element={<div>Deployments list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Deployments list')).toBeInTheDocument();
  });
});
