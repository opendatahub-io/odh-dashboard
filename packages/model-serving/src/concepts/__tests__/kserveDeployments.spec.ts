import { testHook } from '@odh-dashboard/jest-config/hooks';
import type {
  InferenceServiceKind,
  ProjectKind,
  ServingRuntimeKind,
  PodKind,
} from '@odh-dashboard/internal/k8sTypes';
import type { KServeDeployment } from '../../../../kserve/src/deployments';
import { useWatchDeployments } from '../../../../kserve/src/deployments';
import * as watchModule from '../../../../kserve/src/api/watch';

// Mock the watch module
jest.mock('../../../../kserve/src/api/watch');

const mockUseWatchInferenceServices = watchModule.useWatchInferenceServices as jest.Mock;
const mockUseWatchServingRuntimes = watchModule.useWatchServingRuntimes as jest.Mock;
const mockUseWatchDeploymentPods = watchModule.useWatchDeploymentPods as jest.Mock;

// Type helper for hook return value
type DeploymentHookResult = [KServeDeployment[] | undefined, boolean, Error | undefined];

// Helper to create mock InferenceService
const createMockInferenceService = (
  name: string,
  namespace: string,
  labels?: Record<string, string>,
  runtime?: string,
): InferenceServiceKind => ({
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: {
    name,
    namespace,
    labels: labels || {},
    uid: `uid-${name}`,
    resourceVersion: '1',
    creationTimestamp: '2024-01-01T00:00:00Z',
  },
  spec: {
    predictor: {
      model: {
        modelFormat: {
          name: 'pytorch',
        },
        runtime,
        storageUri: 's3://bucket/model',
      },
    },
  },
  status: {
    url: 'http://model.test-project.svc.cluster.local',
  },
});

// Helper to create mock ServingRuntime
const createMockServingRuntime = (name: string, namespace: string): ServingRuntimeKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: {
    name,
    namespace,
    uid: `uid-${name}`,
    resourceVersion: '1',
    creationTimestamp: '2024-01-01T00:00:00Z',
  },
  spec: {
    supportedModelFormats: [
      {
        name: 'pytorch',
        version: '1',
      },
    ],
    containers: [
      {
        name: 'kserve-container',
        image: 'pytorch/torchserve:latest',
      },
    ],
  },
});

// Helper to create mock Project
const createMockProject = (name: string): ProjectKind => ({
  apiVersion: 'project.openshift.io/v1',
  kind: 'Project',
  metadata: {
    name,
    uid: `uid-${name}`,
    resourceVersion: '1',
    creationTimestamp: '2024-01-01T00:00:00Z',
  },
});

describe('useWatchDeployments', () => {
  let mockProject: ProjectKind;
  let mockInferenceServices: InferenceServiceKind[];
  let mockServingRuntimes: ServingRuntimeKind[];
  let mockPods: PodKind[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockProject = createMockProject('test-project');

    // Create mock inference services
    mockInferenceServices = [
      createMockInferenceService('model-1', 'test-project', { app: 'test' }, 'runtime-1'),
      createMockInferenceService('model-2', 'test-project', { app: 'test' }, 'runtime-1'),
      createMockInferenceService('model-3', 'test-project', { app: 'other' }, 'runtime-2'),
    ];

    // Create mock serving runtimes
    mockServingRuntimes = [
      createMockServingRuntime('runtime-1', 'test-project'),
      createMockServingRuntime('runtime-2', 'test-project'),
    ];

    mockPods = [];

    // Setup default mock implementations
    mockUseWatchInferenceServices.mockReturnValue([mockInferenceServices, true, undefined]);
    mockUseWatchServingRuntimes.mockReturnValue([mockServingRuntimes, true, undefined]);
    mockUseWatchDeploymentPods.mockReturnValue([mockPods, true, undefined]);
  });

  it('should return all deployments when no filterFn is provided', () => {
    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments, loaded, error] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(3);
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should filter deployments when filterFn is provided', () => {
    const filterFn = (inferenceService: InferenceServiceKind) =>
      inferenceService.metadata.labels?.app === 'test';

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, filterFn, undefined);

    const [deployments, loaded, error] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(2);
    expect(deployments?.[0].model.metadata.name).toBe('model-1');
    expect(deployments?.[1].model.metadata.name).toBe('model-2');
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should return empty array when filterFn filters out all deployments', () => {
    const filterFn = (inferenceService: InferenceServiceKind) =>
      inferenceService.metadata.labels?.app === 'nonexistent';

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, filterFn, undefined);

    const [deployments, loaded, error] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(0);
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should match serving runtimes to inference services', () => {
    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments?.[0].server?.metadata.name).toBe('runtime-1');
    expect(deployments?.[1].server?.metadata.name).toBe('runtime-1');
    expect(deployments?.[2].server?.metadata.name).toBe('runtime-2');
  });

  it('should handle deployment without matching serving runtime', () => {
    const inferenceServiceWithoutRuntime = createMockInferenceService(
      'model-no-runtime',
      'test-project',
      {},
      'nonexistent-runtime',
    );

    mockUseWatchInferenceServices.mockReturnValue([
      [inferenceServiceWithoutRuntime],
      true,
      undefined,
    ]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(1);
    expect(deployments?.[0].server).toBeUndefined();
  });

  it('should pass through loading state', () => {
    mockUseWatchInferenceServices.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments, loaded] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(0);
    expect(loaded).toBe(false);
  });

  it('should pass through error state from inference services', () => {
    const mockError = new Error('Failed to fetch inference services');
    mockUseWatchInferenceServices.mockReturnValue([[], true, mockError]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [, , error] = renderResult.result.current as DeploymentHookResult;

    expect(error).toBe(mockError);
  });

  it('should pass through error state from serving runtimes', () => {
    const mockError = new Error('Failed to fetch serving runtimes');
    mockUseWatchServingRuntimes.mockReturnValue([[], true, mockError]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [, , error] = renderResult.result.current as DeploymentHookResult;

    expect(error).toBe(mockError);
  });

  it('should pass through error state from deployment pods', () => {
    const mockError = new Error('Failed to fetch deployment pods');
    mockUseWatchDeploymentPods.mockReturnValue([[], true, mockError]);

    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [, , error] = renderResult.result.current as DeploymentHookResult;

    expect(error).toBe(mockError);
  });

  it('should update deployments when filterFn changes', () => {
    const filterFn1 = (inferenceService: InferenceServiceKind) =>
      inferenceService.metadata.labels?.app === 'test';

    const renderResult = testHook(useWatchDeployments)(
      mockProject,
      undefined,
      filterFn1,
      undefined,
    );

    let [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(2);

    // Change filter to match different deployments
    const filterFn2 = (inferenceService: InferenceServiceKind) =>
      inferenceService.metadata.labels?.app === 'other';

    renderResult.rerender(mockProject, undefined, filterFn2, undefined);

    [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(1);
    expect(deployments?.[0].model.metadata.name).toBe('model-3');
  });

  it('should update deployments when inference services change', () => {
    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    let [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(3);

    // Add a new inference service
    const newInferenceServices = [
      ...mockInferenceServices,
      createMockInferenceService('model-4', 'test-project', {}, 'runtime-1'),
    ];

    mockUseWatchInferenceServices.mockReturnValue([newInferenceServices, true, undefined]);

    renderResult.rerender(mockProject, undefined, undefined, undefined);

    [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(4);
  });

  it('should include all deployment properties', () => {
    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments] = renderResult.result.current as DeploymentHookResult;
    const deployment = deployments?.[0];

    expect(deployment).toMatchObject({
      modelServingPlatformId: 'kserve',
      model: expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'model-1',
        }),
      }),
      server: expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'runtime-1',
        }),
      }),
      status: expect.any(Object),
      endpoints: expect.any(Array),
    });
  });

  it('should pass labelSelectors to useWatchInferenceServices', () => {
    const labelSelectors = { 'custom-label': 'value' };

    testHook(useWatchDeployments)(mockProject, labelSelectors, undefined, undefined);

    expect(mockUseWatchInferenceServices).toHaveBeenCalledWith(
      mockProject,
      labelSelectors,
      undefined,
    );
  });

  it('should pass options to all watch hooks', () => {
    const opts = { dryRun: false };

    testHook(useWatchDeployments)(mockProject, undefined, undefined, opts);

    expect(mockUseWatchInferenceServices).toHaveBeenCalledWith(mockProject, undefined, opts);
    expect(mockUseWatchServingRuntimes).toHaveBeenCalledWith(mockProject, opts);
    expect(mockUseWatchDeploymentPods).toHaveBeenCalledWith(mockProject, opts);
  });

  it('should work without a project', () => {
    const renderResult = testHook(useWatchDeployments)(undefined, undefined, undefined);

    expect(mockUseWatchInferenceServices).toHaveBeenCalledWith(undefined, undefined, undefined);
    expect(renderResult.result.current[0]).toHaveLength(3);
  });

  it('should handle complex filterFn logic', () => {
    // Add more specific labels to test complex filtering
    const servicesWithLabels = [
      createMockInferenceService('model-1', 'test-project', {
        app: 'test',
        version: 'v1',
        environment: 'prod',
      }),
      createMockInferenceService('model-2', 'test-project', {
        app: 'test',
        version: 'v2',
        environment: 'dev',
      }),
      createMockInferenceService('model-3', 'test-project', {
        app: 'other',
        version: 'v1',
        environment: 'prod',
      }),
    ];

    mockUseWatchInferenceServices.mockReturnValue([servicesWithLabels, true, undefined]);

    // Complex filter: app='test' AND environment='prod'
    const complexFilter = (inferenceService: InferenceServiceKind) => {
      const { labels } = inferenceService.metadata;
      return labels ? labels.app === 'test' && labels.environment === 'prod' : false;
    };

    const renderResult = testHook(useWatchDeployments)(
      mockProject,
      undefined,
      complexFilter,
      undefined,
    );

    const [deployments] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(1);
    expect(deployments?.[0].model.metadata.name).toBe('model-1');
  });
});
