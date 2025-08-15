import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockInferenceServiceK8sResource } from '#~/__mocks__';
import {
  checkModelPodStatus,
  getInferenceServiceStatusMessage,
  getInferenceServiceLastFailureReason,
} from '#~/concepts/modelServingKServe/kserveStatusUtils';

describe('checkModelStatus', () => {
  it('Should return true when pod fails to schedule due to insufficient resources.', () => {
    const result = checkModelPodStatus(mockPodK8sResource({ isPending: true }));
    expect(result.failedToSchedule).toBe(true);
    expect(result.failureMessage).toMatch(/Insufficient|taint|Preemption/i); // checks if message is informative
  });

  it('Should return false when pod is scheduled.', () => {
    const result = checkModelPodStatus(mockPodK8sResource({}));
    expect(result.failedToSchedule).toBe(false);
    expect(result.failureMessage).toBeNull();
  });
});

describe('getInferenceServiceStatusMessage', () => {
  it('Should "Loaded" when model is fully loaded', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      activeModelState: 'Loaded',
      targetModelState: 'Loaded',
    });
    expect(getInferenceServiceStatusMessage(inferenceService)).toEqual('Loaded');
  });

  it('Should return loading when first deploying', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      activeModelState: '',
      targetModelState: 'Loading',
    });
    expect(getInferenceServiceStatusMessage(inferenceService)).toEqual('Loading');
    const inferenceService2 = mockInferenceServiceK8sResource({
      activeModelState: '',
      targetModelState: 'Pending',
    });
    expect(getInferenceServiceStatusMessage(inferenceService2)).toEqual('Pending');
  });

  it('Should return "Redploying" when updating exist deployment', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      activeModelState: 'Loaded',
      targetModelState: 'Loading',
    });
    expect(getInferenceServiceStatusMessage(inferenceService)).toEqual('Redeploying');
    const inferenceService2 = mockInferenceServiceK8sResource({
      activeModelState: 'Loaded',
      targetModelState: 'Pending',
    });
    expect(getInferenceServiceStatusMessage(inferenceService2)).toEqual('Redeploying');
  });

  it('Should return "Unknown" when missing status updates', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      missingStatus: true,
    });
    expect(getInferenceServiceStatusMessage(inferenceService)).toEqual('Unknown');
  });

  it('Should return error message when loading failure', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      activeModelState: 'FailedToLoad',
      lastFailureInfoMessage: 'Waiting for runtime Pod to become available',
    });
    expect(getInferenceServiceStatusMessage(inferenceService)).toEqual(
      'Waiting for runtime Pod to become available',
    );
  });

  it('Should return empty message when status is empty ', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      activeModelState: '',
      targetModelState: '',
    });
    expect(getInferenceServiceStatusMessage(inferenceService)).toEqual('');
  });
});

describe('getInferenceServiceLastFailureReason', () => {
  it('Should return last failure reason when present', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      lastFailureInfoReason: 'RuntimeUnhealthy',
    });
    expect(getInferenceServiceLastFailureReason(inferenceService)).toEqual('RuntimeUnhealthy');
  });

  it('Should return undefined when no status exists', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      missingStatus: true,
    });
    expect(getInferenceServiceLastFailureReason(inferenceService)).toEqual('Unknown');
  });

  it('Should return status message when reason is missing', () => {
    const inferenceService = mockInferenceServiceK8sResource({
      activeModelState: 'FailedToLoad',
      lastFailureInfoMessage: 'Some message',
      lastFailureInfoReason: undefined,
    });

    expect(getInferenceServiceLastFailureReason(inferenceService)).toEqual('Some message');
  });
});
