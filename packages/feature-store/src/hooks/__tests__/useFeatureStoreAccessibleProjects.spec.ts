import { renderHook, waitFor } from '@testing-library/react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { useFeatureStoreAccessibleProjects } from '../useFeatureStoreAccessibleProjects';
import { mockProjects, createMockProject } from '../../__mocks__/mockProjects';

jest.mock('@odh-dashboard/internal/api/k8s/projects');

const mockGetProjects = getProjects as jest.MockedFunction<typeof getProjects>;

jest.mock('../../utils/contextUtils', () => ({
  isFeatureStoreAccessibleProject: jest.fn((projectName: string) => {
    return !(
      projectName.startsWith('openshift-') ||
      projectName.startsWith('kube-') ||
      projectName === 'system' ||
      projectName === 'openshift'
    );
  }),
}));

describe('useFeatureStoreAccessibleProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful project loading', () => {
    it('should load and filter projects successfully', async () => {
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      expect(result.current.accessibleProjects).toEqual([]);
      expect(result.current.projectsLoaded).toBe(false);
      expect(result.current.projectsError).toBeUndefined();

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.accessibleProjects).toHaveLength(3);
      expect(result.current.accessibleProjects.map((p) => p.metadata.name)).toEqual([
        'user-project',
        'default',
        'feature-store-project',
      ]);
      expect(result.current.projectsError).toBeUndefined();
    });

    it('should handle empty projects list', async () => {
      mockGetProjects.mockResolvedValue([]);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.accessibleProjects).toEqual([]);
      expect(result.current.projectsError).toBeUndefined();
    });

    it('should call getProjects only once on mount', async () => {
      mockGetProjects.mockResolvedValue(mockProjects);

      const { rerender } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(mockGetProjects).toHaveBeenCalledTimes(1);
      });

      rerender();
      rerender();

      expect(mockGetProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Failed to fetch projects');
      mockGetProjects.mockRejectedValue(mockError);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.accessibleProjects).toEqual([]);
      expect(result.current.projectsError).toEqual(mockError);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load projects for FeatureStore context:',
        mockError,
      );
    });

    it('should handle non-Error exceptions', async () => {
      const mockError = 'String error';
      mockGetProjects.mockRejectedValue(mockError);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.accessibleProjects).toEqual([]);
      expect(result.current.projectsError).toBeInstanceOf(Error);
      expect(result.current.projectsError?.message).toBe(
        'Failed to load projects for FeatureStore',
      );
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load projects for FeatureStore context:',
        mockError,
      );
    });

    it('should clear previous errors on successful retry', async () => {
      const mockError = new Error('Network error');
      mockGetProjects.mockRejectedValueOnce(mockError).mockResolvedValueOnce(mockProjects);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.projectsError).toEqual(mockError);
      expect(result.current.accessibleProjects).toEqual([]);

      const { result: newResult } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(newResult.current.projectsLoaded).toBe(true);
      });

      expect(newResult.current.projectsError).toBeUndefined();
      expect(newResult.current.accessibleProjects).toHaveLength(3);
    });
  });

  describe('project filtering behavior', () => {
    it('should include default namespace (key difference from regular ProjectsContext)', async () => {
      const projectsWithDefault = [createMockProject('default'), createMockProject('user-project')];
      mockGetProjects.mockResolvedValue(projectsWithDefault);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.accessibleProjects).toHaveLength(2);
      expect(result.current.accessibleProjects.map((p) => p.metadata.name)).toContain('default');
      expect(result.current.accessibleProjects.map((p) => p.metadata.name)).toContain(
        'user-project',
      );
    });

    it('should filter out system projects', async () => {
      const systemProjects = [
        createMockProject('openshift-monitoring'),
        createMockProject('kube-system'),
      ];
      mockGetProjects.mockResolvedValue(systemProjects);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });
      expect(result.current.accessibleProjects).toEqual([]);
    });
  });

  describe('loading states', () => {
    it('should start with correct initial state', () => {
      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      expect(result.current.accessibleProjects).toEqual([]);
      expect(result.current.projectsLoaded).toBe(false);
      expect(result.current.projectsError).toBeUndefined();
    });

    it('should maintain loading state until projects are loaded', async () => {
      let resolveProjects!: (projects: ProjectKind[]) => void;
      const projectsPromise = new Promise<ProjectKind[]>((resolve) => {
        resolveProjects = resolve;
      });
      mockGetProjects.mockReturnValue(projectsPromise);

      const { result } = renderHook(() => useFeatureStoreAccessibleProjects());

      expect(result.current.projectsLoaded).toBe(false);
      expect(result.current.accessibleProjects).toEqual([]);

      resolveProjects(mockProjects);

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      expect(result.current.accessibleProjects).toHaveLength(3);
    });
  });

  describe('hook stability', () => {
    it('should return stable references when data does not change', async () => {
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result, rerender } = renderHook(() => useFeatureStoreAccessibleProjects());

      await waitFor(() => {
        expect(result.current.projectsLoaded).toBe(true);
      });

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult.accessibleProjects).toBe(secondResult.accessibleProjects);
      expect(firstResult.projectsLoaded).toBe(secondResult.projectsLoaded);
      expect(firstResult.projectsError).toBe(secondResult.projectsError);
    });
  });
});
