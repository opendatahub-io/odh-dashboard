import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireModelDeployed,
  DeploymentTrackingEvent,
  type DeploymentTrackingProperties,
} from '../deploymentTracking';

const mockTrackEvent = jest.fn();

describe('fireModelDeployed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire Model Deployed event for new deployments', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      modelType: 'single',
      runtime: 'ovms-template',
      servingRuntimeName: 'OpenVINO Model Server',
      servingRuntimeFormat: 'onnx',
      numReplicas: 1,
    };

    fireModelDeployed(mockTrackEvent, properties, false);

    expect(mockTrackEvent).toHaveBeenCalledWith(DeploymentTrackingEvent.MODEL_DEPLOYED, properties);
  });

  it('should fire Model Updated event when isEdit is true', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      modelType: 'single',
      runtime: 'ovms-template',
      servingRuntimeName: 'OpenVINO Model Server',
      servingRuntimeFormat: 'onnx',
      numReplicas: 2,
    };

    fireModelDeployed(mockTrackEvent, properties, true);

    expect(mockTrackEvent).toHaveBeenCalledWith(DeploymentTrackingEvent.MODEL_UPDATED, properties);
  });

  it('should fire Model Deployed with cancel outcome', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.cancel,
    };

    fireModelDeployed(mockTrackEvent, properties);

    expect(mockTrackEvent).toHaveBeenCalledWith(DeploymentTrackingEvent.MODEL_DEPLOYED, properties);
  });

  it('should fire with error message on failure', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: false,
      errorMessage: 'Connection refused',
      modelType: 'single',
      runtime: 'vllm-template',
      servingRuntimeName: 'vLLM',
      servingRuntimeFormat: 'pytorch',
      numReplicas: 1,
    };

    fireModelDeployed(mockTrackEvent, properties, false);

    expect(mockTrackEvent).toHaveBeenCalledWith(DeploymentTrackingEvent.MODEL_DEPLOYED, properties);
  });

  it('should include per-platform properties via the spread', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      modelType: 'single',
      runtime: 'nim-runtime',
      servingRuntimeName: 'NVIDIA NIM',
      servingRuntimeFormat: 'tensorrt',
      numReplicas: 1,
      nimModelId: 'meta/llama3-8b',
      nimImageVersion: '1.0.0',
    };

    fireModelDeployed(mockTrackEvent, properties, false);

    expect(mockTrackEvent).toHaveBeenCalledWith(
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

    fireModelDeployed(mockTrackEvent, properties);

    expect(mockTrackEvent).toHaveBeenCalledWith(DeploymentTrackingEvent.MODEL_DEPLOYED, properties);
  });

  it('should include model location properties', () => {
    const properties: DeploymentTrackingProperties = {
      outcome: TrackingOutcome.submit,
      success: true,
      modelType: 'single',
      runtime: 'ovms-template',
      servingRuntimeName: 'OpenVINO Model Server',
      servingRuntimeFormat: 'onnx',
      numReplicas: 1,
      modelLocationType: 'existing',
    };

    fireModelDeployed(mockTrackEvent, properties, false);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      DeploymentTrackingEvent.MODEL_DEPLOYED,
      expect.objectContaining({
        modelLocationType: 'existing',
      }),
    );
  });
});
