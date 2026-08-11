import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireModelDeployed,
  DeploymentTrackingEvent,
  type DeploymentTrackingProperties,
} from '../deploymentTracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('fireModelDeployed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire Model Deployed event for new deployments', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      type: 'single',
      runtime: 'ovms-template',
      servingRuntimeName: 'OpenVINO Model Server',
      servingRuntimeFormat: 'onnx',
      numReplicas: 1,
    };

    fireModelDeployed(properties, false);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_DEPLOYED,
      properties,
    );
  });

  it('should fire Model Updated event when isEdit is true', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      type: 'single',
      runtime: 'ovms-template',
      servingRuntimeName: 'OpenVINO Model Server',
      servingRuntimeFormat: 'onnx',
      numReplicas: 2,
    };

    fireModelDeployed(properties, true);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_UPDATED,
      properties,
    );
  });

  it('should fire Model Deployed with cancel outcome', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.cancel,
    };

    fireModelDeployed(properties);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_DEPLOYED,
      properties,
    );
  });

  it('should fire with error message on failure', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: false,
      error: 'Connection refused',
      type: 'single',
      runtime: 'vllm-template',
      servingRuntimeName: 'vLLM',
      servingRuntimeFormat: 'pytorch',
      numReplicas: 1,
    };

    fireModelDeployed(properties, false);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_DEPLOYED,
      properties,
    );
  });

  it('should include per-platform properties via the spread', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      type: 'single',
      runtime: 'nim-runtime',
      servingRuntimeName: 'NVIDIA NIM',
      servingRuntimeFormat: 'tensorrt',
      numReplicas: 1,
      nimModelId: 'meta/llama3-8b',
      nimImageVersion: '1.0.0',
    };

    fireModelDeployed(properties, false);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_DEPLOYED,
      expect.objectContaining({
        nimModelId: 'meta/llama3-8b',
        nimImageVersion: '1.0.0',
      }),
    );
  });

  it('should default to Model Deployed when isEdit is undefined', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
    };

    fireModelDeployed(properties);

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_DEPLOYED,
      properties,
    );
  });
});
