import * as React from 'react';
import { render, act } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY } from '@odh-dashboard/ui-core/context/getStoredPreferredProject';
import {
  type WorkingProjectContextType,
  useWorkingProject,
} from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

const mockFetchNamespaces = jest.fn<Promise<ProjectKind[]>, [AbortSignal?]>();
jest.mock('../fetchNamespaces', () => ({
  __esModule: true,
  default: (...args: [AbortSignal?]) => mockFetchNamespaces(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProjectsContextProvider = require('../ProjectsContextProvider')
  .default as typeof import('../ProjectsContextProvider').default;

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  mockFetchNamespaces.mockResolvedValue([]);
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => undefined,
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

    const Consumer: React.FC = () => {
      const ctx = React.useContext(ProjectsContext);
      waitForProject = ctx.waitForProject;
      return null;
    };

    await act(async () => {
      render(
        <ProjectsContextProvider>
          <Consumer />
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

describe('ProjectsContextProvider — unavailable namespace list', () => {
  it('waits for namespace listing to fail before validating a candidate', async () => {
    let rejectListing: ((reason: Error) => void) | undefined;
    mockFetchNamespaces.mockImplementationOnce(
      () =>
        new Promise<ProjectKind[]>((_, reject) => {
          rejectListing = reject;
        }),
    );
    const validateProjectCandidate = jest.fn(() => Promise.resolve(null));

    await act(async () => {
      render(
        <ProjectsContextProvider
          routeCandidate={{ status: 'present', name: 'candidate-project' }}
          validateProjectCandidate={validateProjectCandidate}
        >
          <div />
        </ProjectsContextProvider>,
      );
    });

    expect(validateProjectCandidate).not.toHaveBeenCalled();

    await act(async () => rejectListing?.(new Error('namespace listing is forbidden')));

    expect(validateProjectCandidate).toHaveBeenCalledWith(
      'candidate-project',
      expect.any(AbortSignal),
    );
  });

  it('keeps a route candidate inactive until provider validation succeeds', async () => {
    mockFetchNamespaces.mockRejectedValue(new Error('namespace listing is forbidden'));
    let preferredProject: ProjectKind | null = null;
    const validatedProject = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'validated-project' },
      status: { phase: 'Active' },
    } as ProjectKind;
    let finishValidation: ((project: ProjectKind) => void) | undefined;
    const validateProjectCandidate = jest.fn(
      () =>
        new Promise<ProjectKind | null>((resolve) => {
          finishValidation = resolve;
        }),
    );
    let workingProject: WorkingProjectContextType | undefined;
    const Consumer: React.FC = () => {
      preferredProject = React.useContext(ProjectsContext).preferredProject;
      workingProject = useWorkingProject();
      return null;
    };

    await act(async () => {
      render(
        <ProjectsContextProvider
          routeCandidate={{ status: 'present', name: validatedProject.metadata.name }}
          validateProjectCandidate={validateProjectCandidate}
        >
          <Consumer />
        </ProjectsContextProvider>,
      );
    });

    expect(preferredProject).toBeNull();
    expect(validateProjectCandidate).toHaveBeenCalledWith(
      validatedProject.metadata.name,
      expect.any(AbortSignal),
    );
    expect(workingProject?.state).toStrictEqual({
      status: 'list-unavailable',
      providerValidatedProjects: [],
      activeProject: null,
    });

    await act(async () => finishValidation?.(validatedProject));

    expect(preferredProject).toBeNull();
    expect(workingProject?.state).toStrictEqual({
      status: 'list-unavailable',
      providerValidatedProjects: [
        { name: validatedProject.metadata.name, displayName: validatedProject.metadata.name },
      ],
      activeProject: {
        name: validatedProject.metadata.name,
        displayName: validatedProject.metadata.name,
      },
    });
  });

  it.each<[string, string, ProjectKind | null]>([
    ['no project', 'inaccessible-project', null],
    [
      'a different project',
      'inaccessible-project',
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'different-project' },
        status: { phase: 'Active' },
      } as ProjectKind,
    ],
    [
      'a terminating project',
      'inaccessible-project',
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'inaccessible-project' },
        status: { phase: 'Terminating' },
      } as ProjectKind,
    ],
    [
      'an unavailable namespace',
      'kube-system',
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'kube-system' },
        status: { phase: 'Active' },
      } as ProjectKind,
    ],
  ])(
    'does not promote or persist a candidate when validation returns %s',
    async (_, candidate, validatedProject) => {
      mockFetchNamespaces.mockRejectedValue(new Error('namespace listing is forbidden'));
      localStorage.setItem(PREFERRED_NAMESPACE_STORAGE_KEY, JSON.stringify('existing-project'));
      const validateProjectCandidate = jest.fn(() => Promise.resolve(validatedProject));
      let preferredProject: ProjectKind | null = null;
      const Consumer: React.FC = () => {
        preferredProject = React.useContext(ProjectsContext).preferredProject;
        return null;
      };

      await act(async () => {
        render(
          <ProjectsContextProvider
            routeCandidate={{ status: 'present', name: candidate }}
            validateProjectCandidate={validateProjectCandidate}
          >
            <Consumer />
          </ProjectsContextProvider>,
        );
      });

      expect(validateProjectCandidate).toHaveBeenCalled();
      expect(preferredProject).toBeNull();
      expect(localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY)).toBe(
        JSON.stringify('existing-project'),
      );
    },
  );
});
