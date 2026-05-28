import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { useTrainJobs, useRayJobs } from '../../api';
import { TrainJobKind, RayJobKind } from '../../k8sTypes';
import { ModelTrainingContextProvider, useModelTrainingContext } from '../ModelTrainingContext';

jest.mock('../../api', () => ({
  useTrainJobs: jest.fn(),
  useRayJobs: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/areas', () => ({
  SupportedArea: {
    MODEL_TRAINING: 'model-training',
    RAY_JOBS: 'ray-jobs',
  },
  useIsAreaAvailable: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/projects/ProjectsContext', () => {
  const ActualReact = jest.requireActual('react');
  return {
    __esModule: true,
    ProjectsContext: ActualReact.createContext({
      projects: [],
      modelServingProjects: [],
      nonActiveProjects: [],
      preferredProject: null,
      updatePreferredProject: () => undefined,
      loaded: true,
      loadError: undefined,
      waitForProject: () => Promise.resolve(),
    }),
    byName: (name?: string) => (project: { metadata: { name: string } }) =>
      project.metadata.name === name,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useIsAreaAvailable } = require('@odh-dashboard/internal/concepts/areas');

const mockUseTrainJobs = jest.mocked(useTrainJobs);
const mockUseRayJobs = jest.mocked(useRayJobs);
const mockUseIsAreaAvailable = jest.mocked(
  useIsAreaAvailable as (area: string) => { status: boolean },
);

const mockTrainJob = {
  apiVersion: 'trainer.kubeflow.org/v1',
  kind: 'TrainJob',
  metadata: { name: 'train-1', namespace: 'project-a', uid: 'uid-1' },
  spec: {
    runtimeRef: {
      apiGroup: 'trainer.kubeflow.org',
      kind: 'ClusterTrainingRuntime',
      name: 'torch-tune',
    },
  },
} as unknown as TrainJobKind;

const mockRayJob = {
  apiVersion: 'ray.io/v1',
  kind: 'RayJob',
  metadata: { name: 'ray-1', namespace: 'project-b', uid: 'uid-2' },
  spec: {},
} as unknown as RayJobKind;

const ContextConsumer: React.FC = () => {
  const ctx = useModelTrainingContext();
  return (
    <div>
      <span data-testid="train-count">{ctx.trainJobs[0].length}</span>
      <span data-testid="train-loaded">{String(ctx.trainJobs[1])}</span>
      <span data-testid="train-error">{ctx.trainJobs[2]?.message ?? 'none'}</span>
      <span data-testid="ray-count">{ctx.rayJobs[0].length}</span>
      <span data-testid="ray-loaded">{String(ctx.rayJobs[1])}</span>
      <span data-testid="project">{ctx.project?.metadata.name ?? 'none'}</span>
    </div>
  );
};

const areaAvailableResult = { status: true };
const areaUnavailableResult = { status: false };

const makeProject = (name: string): ProjectKind =>
  ({
    kind: 'Project',
    apiVersion: 'project.openshift.io/v1',
    metadata: { name, uid: `uid-${name}`, resourceVersion: '1' },
    status: { phase: 'Active' },
  } as unknown as ProjectKind);

const projectA = makeProject('project-a');
const projectB = makeProject('project-b');

const projectsContextValue = {
  projects: [projectA, projectB],
  modelServingProjects: [],
  nonActiveProjects: [],
  preferredProject: null,
  updatePreferredProject: jest.fn(),
  loaded: true,
  loadError: undefined,
  waitForProject: jest.fn(),
};

const renderWithContext = (namespace?: string) =>
  render(
    <ProjectsContext.Provider value={projectsContextValue}>
      <ModelTrainingContextProvider namespace={namespace}>
        <ContextConsumer />
      </ModelTrainingContextProvider>
    </ProjectsContext.Provider>,
  );

// Stable result references to prevent infinite re-render loops in ProjectWatcher effects.
// The real useK8sWatchResourceList memoizes its result tuple, returning the same reference
// until data changes. Our mocks must do the same.
const STABLE_EMPTY: CustomWatchK8sResult<TrainJobKind[]> = [[], false, undefined];
const STABLE_EMPTY_RAY: CustomWatchK8sResult<RayJobKind[]> = [[], false, undefined];
const STABLE_EMPTY_LOADED: CustomWatchK8sResult<TrainJobKind[]> = [[], true, undefined];
const STABLE_EMPTY_RAY_LOADED: CustomWatchK8sResult<RayJobKind[]> = [[], true, undefined];
const STABLE_TRAIN_RESULT: CustomWatchK8sResult<TrainJobKind[]> = [[mockTrainJob], true, undefined];
const STABLE_RAY_RESULT: CustomWatchK8sResult<RayJobKind[]> = [[mockRayJob], true, undefined];

describe('ModelTrainingContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrainJobs.mockReturnValue(STABLE_EMPTY);
    mockUseRayJobs.mockReturnValue(STABLE_EMPTY_RAY);
    mockUseIsAreaAvailable.mockReturnValue(areaAvailableResult);
  });

  describe('single-project mode', () => {
    it('should use direct watch hooks when namespace is provided', () => {
      mockUseTrainJobs.mockReturnValue(STABLE_TRAIN_RESULT);
      mockUseRayJobs.mockReturnValue(STABLE_RAY_RESULT);

      renderWithContext('project-a');

      expect(mockUseTrainJobs).toHaveBeenCalledWith('project-a');
      expect(mockUseRayJobs).toHaveBeenCalledWith('project-a');
      expect(screen.getByTestId('train-count')).toHaveTextContent('1');
      expect(screen.getByTestId('ray-count')).toHaveTextContent('1');
      expect(screen.getByTestId('train-loaded')).toHaveTextContent('true');
      expect(screen.getByTestId('project')).toHaveTextContent('project-a');
    });

    it('should return empty train jobs when model training is not available', () => {
      mockUseIsAreaAvailable.mockImplementation((area) =>
        area === 'model-training' ? areaUnavailableResult : areaAvailableResult,
      );

      renderWithContext('project-a');

      expect(mockUseTrainJobs).toHaveBeenCalledWith(null);
      expect(screen.getByTestId('train-count')).toHaveTextContent('0');
      expect(screen.getByTestId('train-loaded')).toHaveTextContent('true');
    });

    it('should return empty ray jobs when ray jobs area is not available', () => {
      mockUseIsAreaAvailable.mockImplementation((area) =>
        area === 'ray-jobs' ? areaUnavailableResult : areaAvailableResult,
      );

      renderWithContext('project-a');

      expect(mockUseRayJobs).toHaveBeenCalledWith(null);
      expect(screen.getByTestId('ray-count')).toHaveTextContent('0');
      expect(screen.getByTestId('ray-loaded')).toHaveTextContent('true');
    });
  });

  describe('multi-project mode', () => {
    it('should pass null to direct watch hooks when no namespace', () => {
      renderWithContext();

      expect(mockUseTrainJobs).toHaveBeenCalledWith(null);
      expect(mockUseRayJobs).toHaveBeenCalledWith(null);
    });

    it('should aggregate results from per-project watchers', () => {
      const stableResults: Record<string, CustomWatchK8sResult<TrainJobKind[]>> = {
        'project-a': STABLE_TRAIN_RESULT,
      };
      const stableRayResults: Record<string, CustomWatchK8sResult<RayJobKind[]>> = {
        'project-b': STABLE_RAY_RESULT,
      };

      mockUseTrainJobs.mockImplementation((ns) => stableResults[ns ?? ''] ?? STABLE_EMPTY_LOADED);
      mockUseRayJobs.mockImplementation(
        (ns) => stableRayResults[ns ?? ''] ?? STABLE_EMPTY_RAY_LOADED,
      );

      renderWithContext();

      expect(screen.getByTestId('train-count')).toHaveTextContent('1');
      expect(screen.getByTestId('ray-count')).toHaveTextContent('1');
      expect(screen.getByTestId('train-loaded')).toHaveTextContent('true');
      expect(screen.getByTestId('ray-loaded')).toHaveTextContent('true');
    });

    it('should return empty results when areas are not available', () => {
      mockUseIsAreaAvailable.mockReturnValue(areaUnavailableResult);

      renderWithContext();

      expect(screen.getByTestId('train-count')).toHaveTextContent('0');
      expect(screen.getByTestId('ray-count')).toHaveTextContent('0');
      expect(screen.getByTestId('train-loaded')).toHaveTextContent('true');
    });

    it('should propagate errors from per-project watchers', () => {
      const watchError = new Error('watch failed');
      const errorResult: CustomWatchK8sResult<TrainJobKind[]> = [[], false, watchError];
      const stableResults: Record<string, CustomWatchK8sResult<TrainJobKind[]>> = {
        'project-a': errorResult,
      };

      mockUseTrainJobs.mockImplementation((ns) => stableResults[ns ?? ''] ?? STABLE_EMPTY_LOADED);
      mockUseRayJobs.mockReturnValue(STABLE_EMPTY_RAY_LOADED);

      renderWithContext();

      expect(screen.getByTestId('train-error')).toHaveTextContent('watch failed');
    });

    it('should set project to null when no namespace is provided', () => {
      renderWithContext();

      expect(screen.getByTestId('project')).toHaveTextContent('none');
    });

    it('should clean up results when a project watcher unmounts', () => {
      const stableResults: Record<string, CustomWatchK8sResult<TrainJobKind[]>> = {
        'project-a': STABLE_TRAIN_RESULT,
      };
      const stableRayResults: Record<string, CustomWatchK8sResult<RayJobKind[]>> = {
        'project-b': STABLE_RAY_RESULT,
      };

      mockUseTrainJobs.mockImplementation((ns) => stableResults[ns ?? ''] ?? STABLE_EMPTY_LOADED);
      mockUseRayJobs.mockImplementation(
        (ns) => stableRayResults[ns ?? ''] ?? STABLE_EMPTY_RAY_LOADED,
      );

      // Render with two projects
      const { rerender } = render(
        <ProjectsContext.Provider value={projectsContextValue}>
          <ModelTrainingContextProvider>
            <ContextConsumer />
          </ModelTrainingContextProvider>
        </ProjectsContext.Provider>,
      );

      expect(screen.getByTestId('train-count')).toHaveTextContent('1');
      expect(screen.getByTestId('ray-count')).toHaveTextContent('1');

      // Re-render with only one project — project-b's watcher unmounts
      const reducedProjectsContextValue = {
        ...projectsContextValue,
        projects: [projectA],
      };

      rerender(
        <ProjectsContext.Provider value={reducedProjectsContextValue}>
          <ModelTrainingContextProvider>
            <ContextConsumer />
          </ModelTrainingContextProvider>
        </ProjectsContext.Provider>,
      );

      // After unmount cleanup, project-b's ray job should be removed
      expect(screen.getByTestId('ray-count')).toHaveTextContent('0');
      expect(screen.getByTestId('train-loaded')).toHaveTextContent('true');
    });
  });
});
