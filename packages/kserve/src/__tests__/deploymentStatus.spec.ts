import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { getKServeDeploymentConditions } from '../deploymentStatus';

describe('getKServeDeploymentConditions', () => {
  it('should include deployment requested from creationTimestamp', () => {
    const isvc = mockInferenceServiceK8sResource({
      creationTimestamp: '2026-04-22T15:44:32Z',
    });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    expect(conditions[0]).toEqual({
      type: 'DeploymentRequested',
      label: 'Deployment requested',
      status: 'True',
      lastTransitionTime: '2026-04-22T15:44:32Z',
    });
  });

  it('should map PredictorReady condition', () => {
    const isvc = mockInferenceServiceK8sResource({
      lastTransitionTime: '2026-05-26T13:49:27Z',
    });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    const predictorCondition = conditions.find((c) => c.type === 'PredictorReady');
    expect(predictorCondition).toBeDefined();
    expect(predictorCondition?.label).toBe('Predictor ready');
    expect(predictorCondition?.lastTransitionTime).toBe('2026-05-26T13:49:27Z');
  });

  it('should show error message when condition status is False', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'False',
            lastTransitionTime: '2026-05-25T02:23:56Z',
            reason: 'ProgressDeadlineExceeded',
            message: 'ReplicaSet "meta-2-predictor-85b5bbd49b" has timed out progressing.',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.FAILED_TO_LOAD);

    const predictorCondition = conditions.find((c) => c.type === 'PredictorReady');
    expect(predictorCondition?.status).toBe('False');
    expect(predictorCondition?.message).toBe(
      'ReplicaSet "meta-2-predictor-85b5bbd49b" has timed out progressing.',
    );
  });

  it('should not show message when condition status is True', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
            reason: 'Ready',
            message: 'Some internal message',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    const predictorCondition = conditions.find((c) => c.type === 'PredictorReady');
    expect(predictorCondition?.message).toBeUndefined();
  });

  it('should filter out conditions with reason Stopped except type Stopped', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'False',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'IngressReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:01Z',
          },
          {
            type: 'Stopped',
            status: 'True',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:50:00Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING);

    expect(conditions.find((c) => c.type === 'PredictorReady')).toBeUndefined();
    expect(conditions.find((c) => c.type === 'IngressReady')).toBeDefined();
    expect(conditions.find((c) => c.type === 'Stopped')).toEqual(
      expect.objectContaining({
        label: 'Deployment stopped',
        status: 'True',
      }),
    );
  });

  it('should not include conditions that are absent from the resource', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    expect(conditions.find((c) => c.type === 'IngressReady')).toBeUndefined();
    expect(conditions.find((c) => c.type === 'LatestDeploymentReady')).toBeUndefined();
  });

  it('should handle resource with no status', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({ missingStatus: true }),
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.UNKNOWN);

    expect(conditions).toHaveLength(1);
    expect(conditions[0].type).toBe('DeploymentRequested');
  });

  it('should include all conditions in correct order for a ready deployment', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'LatestDeploymentReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'IngressReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:01Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    expect(conditions.map((c) => c.type)).toEqual([
      'DeploymentRequested',
      'PredictorReady',
      'IngressReady',
      'LatestDeploymentReady',
    ]);
  });

  it('should show LatestDeploymentReady as warning when model is serving but condition is False', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'IngressReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:01Z',
          },
          {
            type: 'LatestDeploymentReady',
            status: 'False',
            reason: 'AuthProxyMigrationPending',
            message: 'Preserving existing auth proxy container to avoid pod restart.',
            lastTransitionTime: '2026-06-23T20:30:24Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    const deploymentReady = conditions.find((c) => c.type === 'LatestDeploymentReady');
    expect(deploymentReady?.status).toBe('Warning');
    expect(deploymentReady?.label).toBe('Deployment ready (update available)');
    expect(deploymentReady?.message).toBe(
      'Preserving existing auth proxy container to avoid pod restart.',
    );
  });

  it('should show LatestDeploymentReady as error when model is NOT serving and condition is False', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'LatestDeploymentReady',
            status: 'False',
            reason: 'ProgressDeadlineExceeded',
            message: 'Deployment has timed out.',
            lastTransitionTime: '2026-06-23T20:30:24Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.FAILED_TO_LOAD);

    const deploymentReady = conditions.find((c) => c.type === 'LatestDeploymentReady');
    expect(deploymentReady?.status).toBe('False');
    expect(deploymentReady?.label).toBe('Deployment ready');
    expect(deploymentReady?.message).toBe('Deployment has timed out.');
  });
});
