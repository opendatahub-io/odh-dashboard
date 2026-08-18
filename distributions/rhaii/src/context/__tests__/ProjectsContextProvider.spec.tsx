import * as React from 'react';
import { render, act } from '@testing-library/react';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

const mockFetchNamespaces = jest.fn<Promise<ProjectKind[]>, [AbortSignal?]>();
jest.mock('../fetchNamespaces', () => ({
  __esModule: true,
  default: (...args: [AbortSignal?]) => mockFetchNamespaces(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProjectsContextProvider = require('../ProjectsContextProvider').default as React.FC<{
  children: React.ReactNode;
}>;

beforeEach(() => {
  jest.useFakeTimers();
  mockFetchNamespaces.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
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
