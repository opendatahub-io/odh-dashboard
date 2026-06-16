import React from 'react';
import { act, renderHook } from '@testing-library/react';
import ProjectsContextProvider, { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { mockProjectK8sResource } from '#~/__mocks__';

jest.mock('#~/api', () => ({
  useProjects: jest.fn(() => [[], true, undefined]),
}));

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

const useProjectsMock = jest.mocked(
  jest.requireMock<typeof import('#~/api')>('#~/api').useProjects,
);

describe('ProjectsContextProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useProjectsMock.mockReturnValue([[], true, undefined]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ProjectsContextProvider>{children}</ProjectsContextProvider>
  );

  describe('waitForProject', () => {
    it('should resolve immediately when the project is already in the list', async () => {
      const project = mockProjectK8sResource({ k8sName: 'existing-project' });
      useProjectsMock.mockReturnValue([[project], true, undefined]);

      const { result } = renderHook(() => React.useContext(ProjectsContext), { wrapper });

      let resolved = false;
      await act(async () => {
        const promise = result.current.waitForProject('existing-project');
        promise.then(() => {
          resolved = true;
        });
        jest.advanceTimersByTime(200);
        await promise;
      });

      expect(resolved).toBe(true);
    });

    it('should resolve after timeout when the project never appears in the list', async () => {
      useProjectsMock.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() => React.useContext(ProjectsContext), { wrapper });

      let resolved = false;
      await act(async () => {
        const promise = result.current.waitForProject('missing-project');
        promise.then(() => {
          resolved = true;
        });

        // Advance past the 10s timeout (200ms intervals, 50 ticks = 10000ms)
        for (let i = 0; i < 51; i++) {
          jest.advanceTimersByTime(200);
          // Allow microtasks to flush
          await Promise.resolve();
        }
      });

      expect(resolved).toBe(true);
    });

    it('should not resolve before the timeout when the project is absent', async () => {
      useProjectsMock.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() => React.useContext(ProjectsContext), { wrapper });

      let resolved = false;
      await act(async () => {
        const promise = result.current.waitForProject('missing-project');
        promise.then(() => {
          resolved = true;
        });

        // Advance 9 seconds - should not have resolved yet
        for (let i = 0; i < 45; i++) {
          jest.advanceTimersByTime(200);
          await Promise.resolve();
        }
      });

      expect(resolved).toBe(false);
    });

    it('should resolve when the component unmounts before the timeout', async () => {
      useProjectsMock.mockReturnValue([[], true, undefined]);

      const { result, unmount } = renderHook(() => React.useContext(ProjectsContext), { wrapper });

      let resolved = false;
      await act(async () => {
        const promise = result.current.waitForProject('missing-project');
        promise.then(() => {
          resolved = true;
        });

        // Advance a few intervals but stay under the timeout
        for (let i = 0; i < 5; i++) {
          jest.advanceTimersByTime(200);
          await Promise.resolve();
        }
        expect(resolved).toBe(false);

        // Unmount the provider
        unmount();

        // Advance one more interval so the next poll fires and sees unmounted
        jest.advanceTimersByTime(200);
        await Promise.resolve();
      });

      expect(resolved).toBe(true);
    });

    it('should resolve (not reject) on timeout since project creation already succeeded', async () => {
      useProjectsMock.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() => React.useContext(ProjectsContext), { wrapper });

      await act(async () => {
        const promise = result.current.waitForProject('created-project');

        // Advance past the timeout
        for (let i = 0; i < 51; i++) {
          jest.advanceTimersByTime(200);
          await Promise.resolve();
        }

        // The promise should resolve, not reject
        await expect(promise).resolves.toBeUndefined();
      });
    });
  });
});
