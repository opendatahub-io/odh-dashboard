import * as React from 'react';
import { render, act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { BrowserStorageContextProvider } from '@odh-dashboard/ui-core/hooks/useBrowserStorage';
import RhaiiProjectSelector from '../../components/RhaiiProjectSelector';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const mockFetchNamespaces = jest.fn<Promise<ProjectKind[]>, [AbortSignal?]>();
const mockFetchNamespaceByName = jest.fn<Promise<ProjectKind>, [string, AbortSignal?]>();
class MockNamespaceListUnavailableError extends Error {}
jest.mock('../fetchNamespaces', () => ({
  __esModule: true,
  default: (...args: [AbortSignal?]) => mockFetchNamespaces(...args),
  fetchNamespaceByName: (...args: [string, AbortSignal?]) => mockFetchNamespaceByName(...args),
  NamespaceListUnavailableError: MockNamespaceListUnavailableError,
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
  const { projects, preferredProject } = React.useContext(ProjectsContext);
  const working = useWorkingProject();
  return (
    <>
      <div data-testid="source-status">{working.status}</div>
      <div data-testid="known-projects">
        {projects.map(({ metadata }) => metadata.name).join(',')}
      </div>
      <div data-testid="working-project">{working.activeProject?.name ?? 'none'}</div>
      <div data-testid="route-project">{preferredProject?.metadata.name ?? 'none'}</div>
      <button onClick={() => working.selectProject({ name: 'allowed' })}>Select allowed</button>
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
    await waitFor(() => expect(screen.getByTestId('source-status')).toHaveTextContent('listed'));
    fireEvent.click(screen.getByText('Select allowed'));
    expect(screen.getByTestId('working-project')).toHaveTextContent('allowed');
    expect(screen.getByTestId('route-project')).toHaveTextContent('allowed');
  });

  it('should use normal list-backed selection without manual lookup when listing succeeds', async () => {
    mockFetchNamespaces.mockResolvedValue([project('allowed'), project('another')]);
    render(
      <ProjectsContextProvider>
        <RhaiiProjectSelector />
        <Consumer />
      </ProjectsContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('source-status')).toHaveTextContent('listed'));
    fireEvent.click(screen.getByTestId('working-project-selector'));
    expect(screen.getByRole('dialog', { name: 'Working project' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add project' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('manual-project-name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('working-project-option-another'));
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
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
});
