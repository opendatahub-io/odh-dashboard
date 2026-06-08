// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { Deployment, ModelServingMetricsExtension } from '../../../extension-points';
import { shouldShowDeploymentMetricsLink } from '../deploymentUtils';

const mockDeployment = (overrides: Partial<Deployment> = {}): Deployment => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'InferenceService',
    metadata: {
      name: 'test-model',
      namespace: 'test-ns',
    },
  },
  status: overrides.status,
  server: overrides.server,
  endpoints: overrides.endpoints,
  apiProtocol: overrides.apiProtocol,
});

const metricsExtension: ModelServingMetricsExtension = {
  type: 'model-serving.metrics',
  properties: { platform: 'test' },
  flags: {},
};

describe('shouldShowDeploymentMetricsLink', () => {
  it('should return false when metricsExtension is null', () => {
    const deployment = mockDeployment({
      status: {
        state: ModelDeploymentState.LOADED,
        stoppedStates: { isRunning: true, isStopped: false, isStarting: false, isStopping: false },
      },
    });
    expect(shouldShowDeploymentMetricsLink(deployment, null)).toBe(false);
  });

  it('should return false when namespace is empty', () => {
    const deployment = mockDeployment({
      status: {
        state: ModelDeploymentState.LOADED,
        stoppedStates: { isRunning: true, isStopped: false, isStarting: false, isStopping: false },
      },
    });
    deployment.model.metadata.namespace = '';
    expect(shouldShowDeploymentMetricsLink(deployment, metricsExtension)).toBe(false);
  });

  it('should return false when deployment state is FAILED_TO_LOAD', () => {
    const deployment = mockDeployment({
      status: {
        state: ModelDeploymentState.FAILED_TO_LOAD,
        stoppedStates: { isRunning: true, isStopped: false, isStarting: false, isStopping: false },
      },
    });
    expect(shouldShowDeploymentMetricsLink(deployment, metricsExtension)).toBe(false);
  });

  it('should return false when neither running nor stopped', () => {
    const deployment = mockDeployment({
      status: {
        state: ModelDeploymentState.LOADED,
        stoppedStates: {
          isRunning: false,
          isStopped: false,
          isStarting: true,
          isStopping: false,
        },
      },
    });
    expect(shouldShowDeploymentMetricsLink(deployment, metricsExtension)).toBe(false);
  });

  it('should return true when LOADED and running', () => {
    const deployment = mockDeployment({
      status: {
        state: ModelDeploymentState.LOADED,
        stoppedStates: { isRunning: true, isStopped: false, isStarting: false, isStopping: false },
      },
    });
    expect(shouldShowDeploymentMetricsLink(deployment, metricsExtension)).toBe(true);
  });

  it('should return true when LOADED and stopped', () => {
    const deployment = mockDeployment({
      status: {
        state: ModelDeploymentState.LOADED,
        stoppedStates: { isRunning: false, isStopped: true, isStarting: false, isStopping: false },
      },
    });
    expect(shouldShowDeploymentMetricsLink(deployment, metricsExtension)).toBe(true);
  });

  it('should return false when status is undefined', () => {
    const deployment = mockDeployment();
    expect(shouldShowDeploymentMetricsLink(deployment, metricsExtension)).toBe(false);
  });
});
