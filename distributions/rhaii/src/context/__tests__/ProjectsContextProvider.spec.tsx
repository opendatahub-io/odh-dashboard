import * as React from 'react';
import { render, act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import { KnownLabels, type ProjectKind } from '@odh-dashboard/k8s-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { BrowserStorageContextProvider } from '@odh-dashboard/ui-core/hooks/useBrowserStorage';
import { DashboardNamespaceContext } from '../DashboardNamespaceContext';
import RhaiiProjectSelector from '../../components/RhaiiProjectSelector';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const mockFetchNamespaces = jest.fn<Promise<ProjectKind[]>, [AbortSignal?]>();
const mockFetchNamespaceByName = jest.fn<Promise<ProjectKind>, [string, AbortSignal?]>();
class MockNamespaceListUnavailableError extends Error {
  constructor(readonly projects?: ProjectKind[]) {
    super('Namespace listing is partial');
  }
}
class MockProjectAccessDeniedError extends Error {
  constructor() {
    super('No access to that project, or it does not exist.');
  }
}
jest.mock('../fetchNamespaces', () => ({
  __esModule: true,
  default: (...args: [AbortSignal?]) => mockFetchNamespaces(...args),
  fetchNamespaceByName: (...args: [string, AbortSignal?]) => mockFetchNamespaceByName(...args),
  NamespaceListUnavailableError: MockNamespaceListUnavailableError,
  ProjectAccessDeniedError: MockProjectAccessDeniedError,
  FETCH_TIMEOUT_MS: 30_000,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProjectProvider = require('../ProjectsContextProvider').default as React.FC<{
  children: React.ReactNode;
}>;

const ProjectsContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <BrowserStorageContextProvider>
    <ProjectProvider>{children}</ProjectProvider>
  </BrowserStorageContextProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockUseIsAreaAvailable.mockReturnValue({
    status: true,
  } as ReturnType<typeof useIsAreaAvailable>);
  jest.useFakeTimers();
  mockFetchNamespaces.mockResolvedValue([]);
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => undefined,
  });
});

const project = (name: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: { phase: 'Active' },
});

const Consumer: React.FC = () => {
  const {
    projects,
    modelServingProjects,
    deploymentTargetProjects,
    preferredProject,
    getProjectDeploymentActions,
  } = React.useContext(ProjectsContext);
  const working = useWorkingProject();
  return (
    <>
      <div data-testid="source-status">{working.status}</div>
      <div data-testid="known-projects">
        {projects.map(({ metadata }) => metadata.name).join(',')}
      </div>
      <div data-testid="serving-projects">
        {modelServingProjects.map(({ metadata }) => metadata.name).join(',')}
      </div>
      <div data-testid="deploy-targets">
        {(deploymentTargetProjects ?? []).map(({ metadata }) => metadata.name).join(',')}
      </div>
      <div data-testid="selector-projects">
        {working.projects.map(({ name }) => name).join(',')}
      </div>
      <div data-testid="working-project">{working.activeProject?.name ?? 'none'}</div>
      <div data-testid="allowed-actions">
        {JSON.stringify(getProjectDeploymentActions?.('allowed') ?? null)}
      </div>
      <div data-testid="route-project">{preferredProject?.metadata.name ?? 'none'}</div>
      <button onClick={() => working.selectProject({ name: 'allowed' })}>Select allowed</button>
      <button
        onClick={() =>
          void Promise.resolve(working.selectProject({ name: 'allowed' })).catch(() => undefined)
        }
      >
        Try allowed
      </button>
      <button onClick={() => working.selectProject({ name: 'denied' })}>Select denied</button>
      <button
        onClick={() => {
          const controller = new AbortController();
          void working.rememberProject?.('allowed', controller.signal);
        }}
      >
        Add allowed
      </button>
    </>
  );
};

describe('RHAII working project provider integration', () => {
  beforeEach(() => jest.useRealTimers());

  it('should expose listed projects to both masthead and route consumers', async () => {
    mockFetchNamespaces.mockResolvedValue([project('allowed')]);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    // Listing succeeded; nothing is selected until the user chooses.
    await waitFor(() =>
      expect(screen.getByTestId('source-status')).toHaveTextContent('no-project-selected'),
    );
    fireEvent.click(screen.getByText('Select allowed'));
    expect(screen.getByTestId('working-project')).toHaveTextContent('allowed');
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
  });

  it('should use normal list-backed selection without manual lookup when listing succeeds', async () => {
    const user = userEvent.setup();
    mockFetchNamespaces.mockResolvedValue([project('allowed'), project('another')]);
    render(
      <ProjectsContextProvider>
        <RhaiiProjectSelector />
        <Consumer />
      </ProjectsContextProvider>,
    );
    // Listing succeeded; nothing is selected until the user chooses.
    await waitFor(() =>
      expect(screen.getByTestId('source-status')).toHaveTextContent('no-project-selected'),
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('dialog', { name: 'Project selector' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add project' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('manual-project-name')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Project type' }));
    await user.click(await screen.findByRole('option', { name: /All projects/ }));
    await waitFor(() =>
      expect(screen.getByTestId('working-project-option-another')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    await user.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() =>
      expect(screen.getByTestId('working-project-selector')).toHaveTextContent('Project: another'),
    );
    expect(screen.getByTestId('working-project')).toHaveTextContent('another');
    expect(screen.getByTestId('route-project')).toHaveTextContent('another');
    expect(JSON.parse(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY) ?? 'null')).toBe(
      'another',
    );
    expect(mockFetchNamespaceByName).not.toHaveBeenCalled();
    expect(localStorage.getItem('rhaii-recent-namespaces')).toBeNull();
    expect(screen.queryByTestId('project-added-notification')).not.toBeInTheDocument();
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
  });

  it('should default to AI projects, show AI badges and allow switching to all projects', async () => {
    const user = userEvent.setup();
    const aiProject = project('ai-project');
    aiProject.metadata.labels = { [KnownLabels.DASHBOARD_RESOURCE]: 'true' };
    mockFetchNamespaces.mockResolvedValue([aiProject, project('standard-project')]);
    render(
      <ProjectsContextProvider>
        <RhaiiProjectSelector />
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('known-projects')).toHaveTextContent('ai-project'),
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));

    expect(screen.getByRole('button', { name: 'Project type' })).toHaveTextContent(
      'AI projects only',
    );
    expect(
      within(screen.getByTestId('working-project-option-ai-project')).getByTestId(
        'ai-project-label',
      ),
    ).toHaveTextContent('AI');
    expect(screen.queryByTestId('working-project-option-standard-project')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Project type' }));
    await user.click(await screen.findByRole('option', { name: /All projects/ }));
    await waitFor(() =>
      expect(screen.getByTestId('working-project-option-standard-project')).toBeInTheDocument(),
    );
    expect(
      within(screen.getByTestId('working-project-option-standard-project')).queryByTestId(
        'ai-project-label',
      ),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('working-project-option-ai-project'));
    await user.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      within(screen.getByTestId('working-project-selector')).getByTestId('ai-project-label'),
    ).toBeInTheDocument();
  });

  it('should allow selecting non-AI projects when the AI filter has no matches', async () => {
    const user = userEvent.setup();
    mockFetchNamespaces.mockResolvedValue([project('standard-project')]);
    render(
      <ProjectsContextProvider>
        <RhaiiProjectSelector />
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('known-projects')).toHaveTextContent('standard-project'),
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByTestId('working-project-no-results')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Project type' }));
    await user.click(await screen.findByRole('option', { name: /All projects/ }));
    await waitFor(() =>
      expect(screen.getByTestId('working-project-option-standard-project')).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId('working-project-option-standard-project'));
    await user.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() =>
      expect(screen.getByTestId('working-project-selector')).toHaveTextContent('standard-project'),
    );
  });

  it('should distinguish forbidden listing from empty listing and allow only validated additions', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    mockFetchNamespaceByName.mockImplementation(async (name) => {
      if (name === 'allowed') return project('allowed');
      throw new Error('No access');
    });
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable'),
    );
    expect(screen.getByTestId('working-project')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('Select denied'));
    expect(mockFetchNamespaceByName).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Add allowed'));
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
    await waitFor(() => expect(screen.getByTestId('working-project')).toHaveTextContent('allowed'));
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
    expect(JSON.parse(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY) ?? 'null')).toBe(
      'allowed',
    );
    expect(mockFetchNamespaceByName).toHaveBeenCalledTimes(1);
  });

  it('should select the first manually added project and announce it through the xKS selector', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    mockFetchNamespaceByName.mockResolvedValue(project('allowed'));
    render(
      <ProjectsContextProvider>
        <RhaiiProjectSelector />
        <Consumer />
      </ProjectsContextProvider>,
    );
    const trigger = screen.getByTestId('working-project-selector');
    await waitFor(() => expect(trigger).toHaveTextContent('No projects'));
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    fireEvent.change(screen.getByTestId('manual-project-name'), {
      target: { value: 'allowed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('modal-submit-button')).toBeEnabled());
    fireEvent.click(screen.getByTestId('modal-submit-button'));
    await waitFor(() => expect(trigger).toHaveTextContent('Project: allowed'));
    expect(screen.getByTestId('working-project-updated-notification')).toHaveTextContent(
      "You're now working in allowed.",
    );
    expect(screen.getByTestId('project-added-notification')).toHaveTextContent(
      '“allowed” is now available in the project selector.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
    fireEvent.click(
      within(screen.getByTestId('working-project-updated-notification')).getByRole('button'),
    );
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
    expect(screen.getByTestId('project-added-notification')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('project-added-notification')).getByRole('button'));
    expect(screen.queryByTestId('project-added-notification')).not.toBeInTheDocument();

    mockFetchNamespaceByName.mockResolvedValue(project('another'));
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    fireEvent.change(screen.getByTestId('manual-project-name'), { target: { value: 'another' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('modal-submit-button')).toBeEnabled());
    fireEvent.click(screen.getByTestId('modal-submit-button'));
    await waitFor(() =>
      expect(screen.getByTestId('project-added-notification')).toHaveTextContent(
        '“another” is now available in the project selector.',
      ),
    );
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Project: allowed');
  });

  it('should not switch the working project when another project is added', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    mockFetchNamespaceByName.mockResolvedValue(project('allowed'));
    let remember: ((name: string, signal: AbortSignal) => Promise<void>) | undefined;
    const RememberConsumer: React.FC = () => {
      remember = useWorkingProject().rememberProject;
      return <Consumer />;
    };
    render(
      <ProjectsContextProvider>
        <RememberConsumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(remember).toBeDefined());
    await act(async () => remember?.('allowed', new AbortController().signal));
    await waitFor(() => expect(screen.getByTestId('working-project')).toHaveTextContent('allowed'));
    mockFetchNamespaceByName.mockResolvedValue(project('another'));
    await act(async () => remember?.('another', new AbortController().signal));
    expect(screen.getByTestId('known-projects')).toHaveTextContent('another');
    expect(screen.getByTestId('working-project')).toHaveTextContent('allowed');
  });

  it('should restore a persisted preferred project after validating access when listing is unavailable', async () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('allowed'));
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    let resolveLookup: (value: ProjectKind) => void = () => undefined;
    mockFetchNamespaceByName.mockReturnValue(
      new Promise<ProjectKind>((resolve) => {
        resolveLookup = resolve;
      }),
    );

    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );

    await waitFor(() =>
      expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', expect.any(AbortSignal)),
    );
    expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable');
    expect(screen.getByTestId('known-projects')).toBeEmptyDOMElement();
    expect(screen.getByTestId('working-project')).toHaveTextContent('none');

    await act(async () => resolveLookup(project('allowed')));

    await waitFor(() => expect(screen.getByTestId('working-project')).toHaveTextContent('allowed'));
    expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed');
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
    expect(JSON.parse(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY) ?? 'null')).toBe(
      'allowed',
    );
  });

  it.each([
    { source: 'stored', ai: true },
    { source: 'stored', ai: false },
    { source: 'storage', ai: true },
    { source: 'storage', ai: false },
  ])(
    'should use validated AI classification ($ai) for a $source selection',
    async ({ source, ai }) => {
      const aiProject = project('allowed');
      aiProject.metadata.labels = { [KnownLabels.DASHBOARD_RESOURCE]: 'true' };
      mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
      const validatedProject = ai ? aiProject : project('allowed');
      mockFetchNamespaceByName.mockResolvedValue(validatedProject);
      if (source === 'stored') {
        localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('allowed'));
      }
      render(
        <ProjectsContextProvider>
          <RhaiiProjectSelector />
          <Consumer />
        </ProjectsContextProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable'),
      );
      if (source === 'storage') {
        // First publish the full resource, then ensure cross-tab validation does not strip it.
        mockFetchNamespaceByName.mockResolvedValueOnce(aiProject);
        fireEvent.click(screen.getByText('Add allowed'));
        await waitFor(() =>
          expect(screen.getByTestId('working-project')).toHaveTextContent('allowed'),
        );
        localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('allowed'));
        await act(async () => {
          fireEvent(
            window,
            new StorageEvent('storage', {
              key: PREFERRED_NAMESPACE_STORAGE_KEY,
              newValue: JSON.stringify('allowed'),
              storageArea: localStorage,
            }),
          );
        });
        await waitFor(() => expect(mockFetchNamespaceByName).toHaveBeenCalledTimes(2));
      }
      await waitFor(() =>
        expect(screen.getByTestId('working-project')).toHaveTextContent('allowed'),
      );
      const badge = within(screen.getByTestId('working-project-selector')).queryByTestId(
        'ai-project-label',
      );
      if (ai) {
        expect(badge).toBeInTheDocument();
      } else {
        expect(badge).not.toBeInTheDocument();
      }
      fireEvent.click(screen.getByTestId('working-project-selector'));
      expect(screen.getByRole('button', { name: 'Project type' })).toHaveTextContent(
        ai ? 'AI projects only' : 'All projects',
      );
      expect(screen.getByTestId('working-project-option-allowed')).toBeInTheDocument();
    },
  );

  it('should not activate a stored project when access has been revoked', async () => {
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('allowed'));
    localStorage.setItem('rhaii-recent-namespaces', JSON.stringify(['allowed']));
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    let rejectLookup: (error: Error) => void = () => undefined;
    const lookup = new Promise<ProjectKind>((_resolve, reject) => {
      rejectLookup = reject;
    });
    mockFetchNamespaceByName.mockReturnValue(lookup);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable'),
    );
    await waitFor(() =>
      expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', expect.any(AbortSignal)),
    );
    await act(async () => {
      rejectLookup(new Error('No access'));
      await lookup.catch(() => undefined);
    });
    expect(screen.getByTestId('known-projects')).toBeEmptyDOMElement();
    expect(screen.getByTestId('working-project')).toHaveTextContent('none');
  });

  it('should preserve selection and storage on denied switch and notify only after a successful retry', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    mockFetchNamespaceByName.mockImplementation(async (name) => project(name));
    let remember: ((name: string, signal: AbortSignal) => Promise<void>) | undefined;
    const Setup: React.FC = () => {
      remember = useWorkingProject().rememberProject;
      return (
        <>
          <RhaiiProjectSelector />
          <Consumer />
        </>
      );
    };
    render(
      <ProjectsContextProvider>
        <Setup />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(remember).toBeDefined());
    await act(async () => remember?.('allowed', new AbortController().signal));
    await act(async () => remember?.('another', new AbortController().signal));
    mockFetchNamespaceByName.mockRejectedValueOnce(
      new Error('No access to that project, or it does not exist.'),
    );
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('button', { name: 'Project type' })).toHaveTextContent('All projects');
    expect(screen.getByRole('radio', { name: /allowed/ })).toBeChecked();
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.queryByTestId('working-project-updated-notification')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('error-message-alert')).toHaveTextContent('No access'),
    );
    expect(screen.getByTestId('working-project')).toHaveTextContent('allowed');
    expect(JSON.parse(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY) ?? 'null')).toBe(
      'allowed',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    await waitFor(() => expect(screen.getByTestId('working-project')).toHaveTextContent('another'));
    expect(JSON.parse(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY) ?? 'null')).toBe(
      'another',
    );
    expect(screen.getByTestId('working-project-updated-notification')).toHaveTextContent(
      "You're now working in another.",
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should distinguish an empty list and an infrastructure error', async () => {
    const view = render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('source-status')).toHaveTextContent('empty-list'),
    );
    view.unmount();
    mockFetchNamespaces.mockRejectedValue(new Error('service unavailable'));
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('source-status')).toHaveTextContent('project-source-error'),
    );
    expect(screen.getByTestId('known-projects')).toHaveTextContent('');
  });

  it('should show discovered projects from a partial listing and keep manual entry', async () => {
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([project('allowed'), project('another')]),
    );
    // Selecting in a partial listing re-validates the project, as manual entry does.
    mockFetchNamespaceByName.mockResolvedValue(project('allowed'));
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed,another'),
    );
    expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable');
    fireEvent.click(screen.getByText('Select allowed'));
    await waitFor(() => expect(screen.getByTestId('working-project')).toHaveTextContent('allowed'));
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', undefined);
  });

  it('should offer only projects with deploy access as deployment targets', async () => {
    mockFetchNamespaces.mockResolvedValue([
      { ...project('allowed'), canDeploy: true },
      { ...project('another'), canDeploy: false },
      project('legacy'),
    ] as ProjectKind[]);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed,another,legacy'),
    );
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed,legacy');
    // View-only projects stay available for browsing deployments.
    expect(screen.getByTestId('serving-projects')).toHaveTextContent('allowed,another,legacy');
  });

  it('should watch only viewable projects and keep a create-only project as a target', async () => {
    mockFetchNamespaces.mockResolvedValue([
      { ...project('allowed'), canView: true, canDeploy: true, canEdit: false, canDelete: true },
      { ...project('create-only'), canView: false, canDeploy: true },
      project('legacy'),
    ] as ProjectKind[]);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed,legacy'),
    );
    expect(screen.getByTestId('serving-projects')).toHaveTextContent('allowed,legacy');
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed,create-only,legacy');
    expect(screen.getByTestId('allowed-actions')).toHaveTextContent(
      JSON.stringify({
        canEdit: false,
        canStartStop: true,
        canDelete: true,
        canCreateTokenAuth: true,
        canManageTokenAuth: true,
      }),
    );
  });

  it('should offer unverified projects for selection only, and watch one once a lookup confirms it', async () => {
    // What a lister gets when discovery is unavailable.
    const unverified = {
      canView: false,
      canDeploy: false,
      canEdit: false,
      canStartStop: false,
      canDelete: false,
      canCreateTokenAuth: false,
      canManageTokenAuth: false,
      actionsUnverified: true,
    };
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), unverified),
        Object.assign(project('another'), unverified),
      ]),
    );
    mockFetchNamespaceByName.mockResolvedValue(
      Object.assign(project('allowed'), {
        canView: true,
        canDeploy: true,
        canEdit: false,
        canStartStop: true,
        canDelete: false,
        canCreateTokenAuth: false,
        canManageTokenAuth: false,
      }),
    );
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('selector-projects')).toHaveTextContent('allowed,another'),
    );
    expect(screen.getByTestId('known-projects')).toBeEmptyDOMElement();
    expect(screen.getByTestId('serving-projects')).toBeEmptyDOMElement();
    expect(screen.getByTestId('deploy-targets')).toBeEmptyDOMElement();
    expect(screen.getByTestId('allowed-actions')).toHaveTextContent(
      JSON.stringify({
        canEdit: false,
        canStartStop: false,
        canDelete: false,
        canCreateTokenAuth: false,
        canManageTokenAuth: false,
      }),
    );

    fireEvent.click(screen.getByText('Try allowed'));
    await waitFor(() =>
      expect(screen.getByTestId('serving-projects')).toHaveTextContent('allowed'),
    );
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', undefined);
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed');
    expect(screen.getByTestId('selector-projects')).toHaveTextContent('allowed,another');
    expect(screen.getByTestId('allowed-actions')).toHaveTextContent(
      JSON.stringify({
        canEdit: false,
        canStartStop: true,
        canDelete: false,
        canCreateTokenAuth: false,
        canManageTokenAuth: false,
      }),
    );
  });

  it('should report no deployment actions for a project without discovery data', async () => {
    mockFetchNamespaces.mockResolvedValue([project('allowed')]);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
    expect(screen.getByTestId('allowed-actions')).toHaveTextContent('null');
  });

  it('should stop offering a cached project once a lookup denies it', async () => {
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), { canDeploy: true }),
        Object.assign(project('another'), { canDeploy: true }),
      ]),
    );
    mockFetchNamespaceByName.mockRejectedValue(new MockProjectAccessDeniedError());
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed,another'),
    );
    fireEvent.click(screen.getByText('Try allowed'));
    await waitFor(() => expect(screen.getByTestId('deploy-targets')).toHaveTextContent('another'));
    expect(screen.getByTestId('known-projects')).toHaveTextContent('another');
    expect(screen.getByTestId('known-projects')).not.toHaveTextContent('allowed');
    expect(screen.getByTestId('working-project')).toHaveTextContent('none');
    // A denied project gets no action, not the "unknown, so allowed" default.
    expect(screen.getByTestId('allowed-actions')).toHaveTextContent(
      JSON.stringify({
        canEdit: false,
        canStartStop: false,
        canDelete: false,
        canCreateTokenAuth: false,
        canManageTokenAuth: false,
      }),
    );

    // Entering it again, once a lookup allows it, restores what that lookup reports.
    mockFetchNamespaceByName.mockResolvedValue(
      Object.assign(project('allowed'), { canDeploy: true, canEdit: true }),
    );
    fireEvent.click(screen.getByText('Add allowed'));
    await waitFor(() =>
      expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed,another'),
    );
    expect(screen.getByTestId('allowed-actions')).not.toHaveTextContent('"canEdit":false');
  });

  it('should not restore a project when an older lookup succeeds after a newer denial', async () => {
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), { canDeploy: true }),
        Object.assign(project('another'), { canDeploy: true }),
      ]),
    );
    let resolveOlder: (value: ProjectKind) => void = () => undefined;
    mockFetchNamespaceByName
      .mockImplementationOnce(
        () =>
          new Promise<ProjectKind>((resolve) => {
            resolveOlder = resolve;
          }),
      )
      .mockRejectedValueOnce(new MockProjectAccessDeniedError());
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed,another'),
    );
    fireEvent.click(screen.getByText('Try allowed'));
    fireEvent.click(screen.getByText('Try allowed'));
    await waitFor(() => expect(screen.getByTestId('deploy-targets')).toHaveTextContent('another'));
    await act(async () => {
      resolveOlder(Object.assign(project('allowed'), { canDeploy: true }));
      await Promise.resolve();
    });
    expect(screen.getByTestId('deploy-targets')).not.toHaveTextContent('allowed');
    expect(screen.getByTestId('working-project')).toHaveTextContent('none');
  });

  it('should not let a recent-project restoration undo a newer denial', async () => {
    localStorage.setItem('rhaii-recent-namespaces', JSON.stringify(['allowed']));
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), { canDeploy: true }),
        Object.assign(project('another'), { canDeploy: true }),
      ]),
    );
    let resolveRestoration: (value: ProjectKind) => void = () => undefined;
    mockFetchNamespaceByName
      .mockImplementationOnce(
        () =>
          new Promise<ProjectKind>((resolve) => {
            resolveRestoration = resolve;
          }),
      )
      .mockRejectedValueOnce(new MockProjectAccessDeniedError());
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() =>
      expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', expect.any(AbortSignal)),
    );
    fireEvent.click(screen.getByText('Try allowed'));
    await waitFor(() =>
      expect(screen.getByTestId('deploy-targets')).toHaveTextContent(/^another$/),
    );
    await act(async () => {
      resolveRestoration(Object.assign(project('allowed'), { canDeploy: true }));
      await Promise.resolve();
    });
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent(/^another$/);
  });

  it('should keep a cached project when a lookup fails without a decision', async () => {
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), { canDeploy: true }),
      ]),
    );
    mockFetchNamespaceByName.mockRejectedValue(new Error('Unable to search for projects.'));
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed'));
    fireEvent.click(screen.getByText('Try allowed'));
    await waitFor(() => expect(mockFetchNamespaceByName).toHaveBeenCalled());
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed');
  });

  it('should look names listed after a discovery failure up by name without the unified selector', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    const unverified = { canView: false, canDeploy: false, actionsUnverified: true };
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), unverified),
        Object.assign(project('denied'), unverified),
      ]),
    );
    mockFetchNamespaceByName.mockImplementation((name) =>
      name === 'allowed'
        ? Promise.resolve(Object.assign(project('allowed'), { canView: true, canDeploy: true }))
        : Promise.reject(new MockProjectAccessDeniedError()),
    );
    const Loaded: React.FC = () => {
      const { loaded } = React.useContext(ProjectsContext);
      return <div data-testid="loaded">{String(loaded)}</div>;
    };
    render(
      <ProjectsContextProvider>
        <Consumer />
        <Loaded />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
    expect(screen.getByTestId('known-projects')).not.toHaveTextContent('denied');
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('allowed');
    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', expect.any(AbortSignal));
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('denied', expect.any(AbortSignal));
  });

  it('should not report the page loaded while the listed names are being looked up', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), { actionsUnverified: true, canView: false }),
      ]),
    );
    let resolveLookup: (value: ProjectKind) => void = () => undefined;
    mockFetchNamespaceByName.mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    const Loaded: React.FC = () => {
      const { loaded } = React.useContext(ProjectsContext);
      return <div data-testid="loaded">{String(loaded)}</div>;
    };
    render(
      <ProjectsContextProvider>
        <Loaded />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(mockFetchNamespaceByName).toHaveBeenCalled());
    expect(screen.getByTestId('loaded')).toHaveTextContent('false');
    await act(async () => resolveLookup(Object.assign(project('allowed'), { canView: true })));
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));
  });

  it('should stop waiting for slow lookups after the fetch timeout and add them later', async () => {
    jest.useFakeTimers();
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), { actionsUnverified: true, canView: false }),
      ]),
    );
    let resolveLookup: (value: ProjectKind) => void = () => undefined;
    mockFetchNamespaceByName.mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    const Loaded: React.FC = () => {
      const { loaded } = React.useContext(ProjectsContext);
      return <div data-testid="loaded">{String(loaded)}</div>;
    };
    render(
      <ProjectsContextProvider>
        <Consumer />
        <Loaded />
      </ProjectsContextProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetchNamespaceByName).toHaveBeenCalled();
    expect(screen.getByTestId('loaded')).toHaveTextContent('false');
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('known-projects')).toBeEmptyDOMElement();
    await act(async () => resolveLookup(Object.assign(project('allowed'), { canView: true })));
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
  });

  it('should look the stored project up after a discovery failure that listed nothing', async () => {
    // The usual xKS case: the fallback list is forbidden, so nothing is listed.
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('allowed'));
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError([]));
    mockFetchNamespaceByName.mockResolvedValue(
      Object.assign(project('allowed'), { canView: true, canDeploy: true }),
    );
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
  });

  it('should offer a lookup by name from the empty state only while the listing is incomplete', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError([]));
    mockFetchNamespaceByName.mockResolvedValue(
      Object.assign(project('allowed'), { canView: true, canDeploy: true }),
    );
    const Finder: React.FC = () => {
      const { findProject, loaded } = React.useContext(ProjectsContext);
      return (
        <>
          <div data-testid="find-offered">{String(loaded && !!findProject)}</div>
          <button onClick={() => void findProject?.('allowed')}>Find allowed</button>
        </>
      );
    };
    render(
      <ProjectsContextProvider>
        <Consumer />
        <Finder />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('find-offered')).toHaveTextContent('true'));
    expect(screen.getByTestId('known-projects')).toBeEmptyDOMElement();
    fireEvent.click(screen.getByText('Find allowed'));
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('allowed', undefined);
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
  });

  it('should drop a denied project from the recent list and keep that list short', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    const stored = Array.from({ length: 15 }, (_, i) => `recent-${i}`);
    localStorage.setItem('rhaii-recent-namespaces', JSON.stringify(stored));
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError([]));
    mockFetchNamespaceByName.mockImplementation((name) =>
      name === 'recent-0'
        ? Promise.reject(new MockProjectAccessDeniedError())
        : Promise.resolve(Object.assign(project(name), { canView: true, canDeploy: true })),
    );
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('recent-1'));
    // Only the ten most recent names are looked up.
    expect(mockFetchNamespaceByName).not.toHaveBeenCalledWith('recent-10', expect.anything());
    const recent: unknown = JSON.parse(localStorage.getItem('rhaii-recent-namespaces') ?? '[]');
    expect(recent).toEqual(stored.slice(1, 10));
  });

  it('should keep reporting loaded when a later poll turns the listing partial', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    localStorage.setItem('rhaii-recent-namespaces', JSON.stringify(['allowed']));
    mockFetchNamespaces.mockResolvedValue([project('allowed')]);
    let waitForProject: (name: string) => Promise<void> = () => Promise.resolve();
    const loadedStates: boolean[] = [];
    const Watcher: React.FC = () => {
      const ctx = React.useContext(ProjectsContext);
      waitForProject = ctx.waitForProject;
      loadedStates.push(ctx.loaded);
      return null;
    };
    render(
      <ProjectsContextProvider>
        <Watcher />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(loadedStates.at(-1)).toBe(true));
    const firstLoaded = loadedStates.indexOf(true);

    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([project('allowed'), project('created')]),
    );
    mockFetchNamespaceByName.mockResolvedValue(project('created'));
    await act(async () => {
      await waitForProject('created');
    });
    expect(loadedStates.slice(firstLoaded)).not.toContain(false);
  });

  it('should not take back a loaded page when the dashboard namespace arrives late', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    // A lookup that fails (not a denial) leaves the name to look up again.
    localStorage.setItem('rhaii-recent-namespaces', JSON.stringify(['flaky']));
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError([]));
    mockFetchNamespaceByName.mockRejectedValue(new Error('lookup failed'));
    const loadedStates: boolean[] = [];
    const Watcher: React.FC = () => {
      loadedStates.push(React.useContext(ProjectsContext).loaded);
      return null;
    };
    let setNamespace: (ns: string) => void = () => undefined;
    const NamespaceHost: React.FC<React.PropsWithChildren> = ({ children }) => {
      const [ns, setNs] = React.useState('opendatahub');
      setNamespace = setNs;
      return (
        <DashboardNamespaceContext.Provider value={ns}>
          {children}
        </DashboardNamespaceContext.Provider>
      );
    };
    render(
      <NamespaceHost>
        <ProjectsContextProvider>
          <Watcher />
        </ProjectsContextProvider>
      </NamespaceHost>,
    );
    await waitFor(() => expect(loadedStates.at(-1)).toBe(true));
    const firstLoaded = loadedStates.indexOf(true);

    await act(async () => {
      setNamespace('rhaii-dashboard');
    });
    // The lookups run again, in the background.
    await waitFor(() => expect(mockFetchNamespaceByName).toHaveBeenCalledTimes(2));
    expect(loadedStates.slice(firstLoaded)).not.toContain(false);
  });

  it('should not make a project the caller cannot browse the working project', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError([]));
    mockFetchNamespaceByName.mockResolvedValue(
      Object.assign(project('deploy-only'), { canView: false, canDeploy: true }),
    );
    let findProject: ProjectsContextType['findProject'];
    const Finder: React.FC = () => {
      findProject = React.useContext(ProjectsContext).findProject;
      return null;
    };
    render(
      <ProjectsContextProvider>
        <Consumer />
        <Finder />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(findProject).toBeDefined());
    await act(async () => {
      await expect(findProject?.('deploy-only')).rejects.toThrow(
        'You can deploy models to deploy-only, but not view its deployments.',
      );
    });
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('deploy-only');
    expect(screen.getByTestId('route-project')).toHaveTextContent('none');
    expect(localStorage.getItem('mod-arch.namespace.lastUsed')).toBeNull();
  });

  it('should not offer a lookup by name when the listing is complete', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    mockFetchNamespaces.mockResolvedValue([project('allowed')]);
    const Finder: React.FC = () => {
      const { findProject, loaded } = React.useContext(ProjectsContext);
      return <div data-testid="find-offered">{loaded ? String(!!findProject) : 'loading'}</div>;
    };
    render(
      <ProjectsContextProvider>
        <Finder />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('find-offered')).toHaveTextContent('false'));
  });

  it('should preserve the legacy project context when UPS is disabled', async () => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: false,
    } as ReturnType<typeof useIsAreaAvailable>);
    mockFetchNamespaces.mockResolvedValue([project('allowed')]);
    render(
      <ProjectsContextProvider>
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed'));
    expect(screen.getByTestId('source-status')).toHaveTextContent('provider-absent');
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  // jsdom's test environment does not provide fetch by default.
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe('ProjectsContextProvider — waitForProject settlement', () => {
  it('rejects the first wait when a second waitForProject supersedes it', async () => {
    let waitForProject: (name: string) => Promise<void> = () => Promise.resolve();

    const WaitConsumer: React.FC = () => {
      const ctx = React.useContext(ProjectsContext);
      waitForProject = ctx.waitForProject;
      return null;
    };

    await act(async () => {
      render(
        <ProjectsContextProvider>
          <WaitConsumer />
        </ProjectsContextProvider>,
      );
    });

    const first = waitForProject('project-a');
    const second = waitForProject('project-b');

    await expect(first).rejects.toThrow('The operation was aborted.');

    mockFetchNamespaces.mockResolvedValue([
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'project-b' },
        status: { phase: 'Active' },
      } as ProjectKind,
    ]);

    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });

    await expect(second).resolves.toBeUndefined();
  });

  const renderWait = async (): Promise<(name: string) => Promise<void>> => {
    let wait: (name: string) => Promise<void> = () => Promise.resolve();
    const WaitConsumer: React.FC = () => {
      wait = React.useContext(ProjectsContext).waitForProject;
      return null;
    };
    await act(async () => {
      render(
        <ProjectsContextProvider>
          <WaitConsumer />
          <Consumer />
        </ProjectsContextProvider>,
      );
    });
    return (name) => wait(name);
  };

  it('keeps manually added projects when a partial poll succeeds', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    mockFetchNamespaceByName.mockResolvedValue(project('allowed'));
    const waitForProject = await renderWait();
    await act(async () => {
      fireEvent.click(screen.getByText('Add allowed'));
    });
    expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed');

    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([project('project-c')]),
    );
    await act(async () => {
      await expect(waitForProject('project-c')).resolves.toBeUndefined();
    });
    expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed,project-c');
    expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable');
  });

  it('keeps a verified project when a later outage lists it without actions', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError());
    mockFetchNamespaceByName.mockResolvedValue(project('allowed'));
    const waitForProject = await renderWait();
    await act(async () => {
      fireEvent.click(screen.getByText('Add allowed'));
    });
    expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed');

    const unverified = { canView: false, canDeploy: false, actionsUnverified: true };
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('allowed'), unverified),
        Object.assign(project('project-c'), unverified),
      ]),
    );
    mockFetchNamespaceByName.mockResolvedValue(project('project-c'));
    await act(async () => {
      await expect(waitForProject('project-c')).resolves.toBeUndefined();
    });
    expect(screen.getByTestId('known-projects')).toHaveTextContent('allowed,project-c');
  });

  it('marks the listing partial when a poll after a complete load is partial', async () => {
    mockFetchNamespaces.mockResolvedValue([project('allowed')]);
    const waitForProject = await renderWait();
    expect(screen.getByTestId('source-status')).not.toHaveTextContent('listing-unavailable');

    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([project('allowed'), project('project-c')]),
    );
    await act(async () => {
      await expect(waitForProject('project-c')).resolves.toBeUndefined();
    });
    expect(screen.getByTestId('source-status')).toHaveTextContent('listing-unavailable');
  });

  it('looks a project outside a partial listing up by name', async () => {
    mockFetchNamespaces.mockRejectedValue(new MockNamespaceListUnavailableError([]));
    const waitForProject = await renderWait();
    mockFetchNamespaceByName.mockResolvedValue(project('outside'));

    await act(async () => {
      await expect(waitForProject('outside')).resolves.toBeUndefined();
    });
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('outside', expect.any(AbortSignal));
    expect(screen.getByTestId('known-projects')).toHaveTextContent('outside');
  });

  it('looks a name listed only while discovery was unavailable up before resolving', async () => {
    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([
        Object.assign(project('unverified'), { canView: false, actionsUnverified: true }),
      ]),
    );
    const waitForProject = await renderWait();
    mockFetchNamespaceByName.mockResolvedValue(
      Object.assign(project('unverified'), { canView: true, canDeploy: true }),
    );

    await act(async () => {
      await expect(waitForProject('unverified')).resolves.toBeUndefined();
    });
    expect(mockFetchNamespaceByName).toHaveBeenCalledWith('unverified', expect.any(AbortSignal));
    expect(screen.getByTestId('known-projects')).toHaveTextContent('unverified');
    expect(screen.getByTestId('deploy-targets')).toHaveTextContent('unverified');
  });

  it('resolves when the project appears in a partial listing', async () => {
    let waitForProject: (name: string) => Promise<void> = () => Promise.resolve();
    const WaitConsumer: React.FC = () => {
      waitForProject = React.useContext(ProjectsContext).waitForProject;
      return null;
    };
    await act(async () => {
      render(
        <ProjectsContextProvider>
          <WaitConsumer />
        </ProjectsContextProvider>,
      );
    });

    mockFetchNamespaces.mockRejectedValue(
      new MockNamespaceListUnavailableError([project('project-c')]),
    );
    await act(async () => {
      await expect(waitForProject('project-c')).resolves.toBeUndefined();
    });
  });
});
