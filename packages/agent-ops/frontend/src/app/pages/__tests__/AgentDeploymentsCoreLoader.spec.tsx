import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { useAgentOpsProjectNamespaces } from '~/app/hooks/useAgentOpsProjectNamespaces';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import AgentDeploymentsCoreLoader from '~/app/pages/AgentDeploymentsCoreLoader';

jest.mock('~/odh/context/ProjectsBridgeContext', () => ({
  useProjectsBridge: jest.fn(),
}));

jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: jest.fn(),
}));

jest.mock('~/app/hooks/useAgentOpsProjectNamespaces', () => ({
  useAgentOpsProjectNamespaces: jest.fn(),
}));

jest.mock('~/app/utilities/routes', () => ({
  agentOpsDeploymentsRoute: (namespace?: string) =>
    !namespace ? '/deployments' : `/deployments/${namespace}`,
}));

jest.mock('~/app/pages/AgentDeploymentListPage', () => {
  const { useParams } = jest.requireActual<typeof import('react-router-dom')>('react-router-dom');
  const MockAgentDeploymentListPage = () => {
    const { namespace } = useParams<{ namespace: string }>();
    return <div data-testid="agent-deployment-list-page" data-namespace={namespace ?? ''} />;
  };
  return {
    __esModule: true,
    default: MockAgentDeploymentListPage,
  };
});

const mockUseProjectsBridge = jest.mocked(useProjectsBridge);
const mockUseNamespaceSelector = jest.mocked(useNamespaceSelector);
const mockUseAgentOpsProjectNamespaces = jest.mocked(useAgentOpsProjectNamespaces);

const inactiveBridge = {
  bridgeActive: false as const,
  projects: [],
  preferredProject: null,
  updatePreferredProject: jest.fn(),
  loaded: false,
  loadError: null,
};

const renderLoader = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/deployments/:namespace?" element={<AgentDeploymentsCoreLoader />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AgentDeploymentsCoreLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectsBridge.mockReturnValue(inactiveBridge);
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [],
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      preferredNamespace: undefined,
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
    });
    mockUseAgentOpsProjectNamespaces.mockReturnValue({
      projectNamespaces: [],
      isLoading: false,
      loadError: null,
      onProjectSelection: jest.fn(),
    });
  });

  it('redirects to the host preferred project when the projects bridge is active', () => {
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: true,
      projects: [
        { name: 'alpha-project', displayName: 'Alpha' },
        { name: 'preferred-project', displayName: 'Preferred' },
      ],
      preferredProject: { name: 'preferred-project', displayName: 'Preferred' },
      updatePreferredProject: jest.fn(),
      loaded: true,
      loadError: null,
    });
    mockUseAgentOpsProjectNamespaces.mockReturnValue({
      projectNamespaces: [
        { name: 'alpha-project', displayName: 'Alpha' },
        { name: 'preferred-project', displayName: 'Preferred' },
      ],
      isLoading: false,
      loadError: null,
      onProjectSelection: jest.fn(),
    });

    renderLoader('/deployments');

    expect(screen.getByTestId('agent-deployment-list-page').getAttribute('data-namespace')).toBe(
      'preferred-project',
    );
  });

  it('redirects to mod-arch preferred namespace when the projects bridge is inactive', () => {
    mockUseNamespaceSelector.mockReturnValue({
      namespaces: [
        { name: 'other-project', displayName: 'Other' },
        { name: 'preferred-project', displayName: 'Preferred' },
      ],
      namespacesLoaded: true,
      namespacesLoadError: undefined,
      preferredNamespace: { name: 'preferred-project', displayName: 'Preferred' },
      updatePreferredNamespace: jest.fn(),
      clearStoredNamespace: jest.fn(),
    });
    mockUseAgentOpsProjectNamespaces.mockReturnValue({
      projectNamespaces: [
        { name: 'other-project', displayName: 'Other' },
        { name: 'preferred-project', displayName: 'Preferred' },
      ],
      isLoading: false,
      loadError: null,
      onProjectSelection: jest.fn(),
    });

    renderLoader('/deployments');

    expect(screen.getByTestId('agent-deployment-list-page').getAttribute('data-namespace')).toBe(
      'preferred-project',
    );
  });

  it('renders select-project state when no namespace and no projects exist', () => {
    renderLoader('/deployments');

    expect(screen.getByTestId('agent-deployment-list-page').getAttribute('data-namespace')).toBe(
      '',
    );
  });

  it('renders project load error instead of select-project when projects fail to load', () => {
    mockUseProjectsBridge.mockReturnValue({
      bridgeActive: true,
      projects: [],
      preferredProject: null,
      updatePreferredProject: jest.fn(),
      loaded: false,
      loadError: new Error('bridge unavailable'),
    });
    mockUseAgentOpsProjectNamespaces.mockReturnValue({
      projectNamespaces: [],
      isLoading: false,
      loadError: new Error('projects unavailable'),
      onProjectSelection: jest.fn(),
    });

    renderLoader('/deployments');

    expect(screen.getByTestId('agent-deployments-projects-load-error')).toBeInTheDocument();
    expect(screen.queryByTestId('agent-deployment-list-page')).not.toBeInTheDocument();
  });
});
