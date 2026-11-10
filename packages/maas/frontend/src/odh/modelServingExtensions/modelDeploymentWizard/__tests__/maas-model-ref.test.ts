import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { enqueuePostDeployAlert } from '~/app/utilities/postDeployAlertStore';
import { createMaaSModelRef, deleteMaaSModelRef, updateMaaSModelRef } from '~/app/api/maas-models';
import type { DeleteMaaSModelRefResponse, MaaSModelRef } from '~/app/types/maas-model';
import { MAAS_PUBLISHED_INTERNAL_ALERT_ID } from '~/odh/modelServingExtensions/MaaSPublishedPostDeployAlert';
import type { MaaSFieldValue } from '~/odh/modelServingExtensions/modelDeploymentWizard/MaaSEndpointCheckbox';
import { postDeployMaaSModelRef } from '~/odh/modelServingExtensions/modelDeploymentWizard/maas-model-ref';
import { fireMaaSPublishTrackingEvent } from '~/odh/modelServingExtensions/modelDeploymentWizard/maasPublishTracking';

jest.mock('~/app/utilities/postDeployAlertStore', () => ({
  enqueuePostDeployAlert: jest.fn(),
}));

jest.mock('~/app/api/maas-models', () => ({
  createMaaSModelRef: jest.fn(),
  updateMaaSModelRef: jest.fn(),
  deleteMaaSModelRef: jest.fn(),
}));

jest.mock('~/odh/modelServingExtensions/modelDeploymentWizard/maasPublishTracking', () => ({
  fireMaaSPublishTrackingEvent: jest.fn(),
  markMaaSPublishSubmitAttempted: jest.fn(),
}));

const mockEnqueuePostDeployAlert = jest.mocked(enqueuePostDeployAlert);
const mockCreateMaaSModelRef = jest.mocked(createMaaSModelRef);
const mockUpdateMaaSModelRef = jest.mocked(updateMaaSModelRef);
const mockDeleteMaaSModelRef = jest.mocked(deleteMaaSModelRef);
const mockFireMaaSPublishTrackingEvent = jest.mocked(fireMaaSPublishTrackingEvent);

const mockMaaSModelRef: MaaSModelRef = {
  name: 'test-deployment',
  namespace: 'test-namespace',
  modelRef: { kind: 'LLMInferenceService', name: 'test-deployment' },
};

const mockDeleteResponse: DeleteMaaSModelRefResponse = {
  message: 'deleted',
};

const MAAS_DEFAULT_GATEWAY = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
};

const createMockDeployment = (
  overrides: Partial<LLMdDeployment['model']> = {},
): LLMdDeployment => ({
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'serving.kserve.io/v1alpha2',
    kind: 'LLMInferenceService',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-namespace',
      uid: 'test-uid',
      annotations: {},
    },
    spec: {
      model: {
        uri: 's3://bucket/model',
      },
    },
    ...overrides,
  },
});

describe('postDeployMaaSModelRef', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMaaSModelRef.mockImplementation(() => () => Promise.resolve(mockMaaSModelRef));
    mockUpdateMaaSModelRef.mockImplementation(() => () => Promise.resolve(mockMaaSModelRef));
    mockDeleteMaaSModelRef.mockImplementation(() => () => Promise.resolve(mockDeleteResponse));
  });

  it('should enqueue the internal alert when creating with MaaS checked', async () => {
    const deployedModel = createMockDeployment();
    const fieldData: MaaSFieldValue = { isChecked: true };

    await postDeployMaaSModelRef(fieldData, deployedModel);

    expect(mockEnqueuePostDeployAlert).toHaveBeenCalledWith(MAAS_PUBLISHED_INTERNAL_ALERT_ID, {
      modelName: 'test-deployment',
    });
    expect(mockCreateMaaSModelRef).toHaveBeenCalled();
    expect(mockFireMaaSPublishTrackingEvent).toHaveBeenCalled();
  });

  it('should not enqueue the alert when creating with MaaS unchecked', async () => {
    const deployedModel = createMockDeployment();
    const fieldData: MaaSFieldValue = { isChecked: false };

    await postDeployMaaSModelRef(fieldData, deployedModel);

    expect(mockEnqueuePostDeployAlert).not.toHaveBeenCalled();
    expect(mockCreateMaaSModelRef).not.toHaveBeenCalled();
  });

  it('should enqueue the alert when editing and MaaS is freshly checked', async () => {
    const existingDeployment = createMockDeployment();
    const deployedModel = createMockDeployment();
    const fieldData: MaaSFieldValue = { isChecked: true };

    await postDeployMaaSModelRef(fieldData, deployedModel, existingDeployment);

    expect(mockEnqueuePostDeployAlert).toHaveBeenCalledWith(MAAS_PUBLISHED_INTERNAL_ALERT_ID, {
      modelName: 'test-deployment',
    });
    expect(mockUpdateMaaSModelRef).toHaveBeenCalled();
  });

  it('should not enqueue the alert when editing a deployment that was already published as MaaS', async () => {
    const existingDeployment = createMockDeployment();
    existingDeployment.model.spec.router = {
      gateway: {
        refs: [MAAS_DEFAULT_GATEWAY],
      },
    };
    const deployedModel = createMockDeployment();
    const fieldData: MaaSFieldValue = { isChecked: true };

    await postDeployMaaSModelRef(fieldData, deployedModel, existingDeployment);

    expect(mockEnqueuePostDeployAlert).not.toHaveBeenCalled();
    expect(mockUpdateMaaSModelRef).toHaveBeenCalled();
  });

  it('should not enqueue the alert when unpublishing on edit', async () => {
    const existingDeployment = createMockDeployment();
    existingDeployment.model.spec.router = {
      gateway: {
        refs: [MAAS_DEFAULT_GATEWAY],
      },
    };
    const deployedModel = createMockDeployment();
    const fieldData: MaaSFieldValue = { isChecked: false };

    await postDeployMaaSModelRef(fieldData, deployedModel, existingDeployment);

    expect(mockEnqueuePostDeployAlert).not.toHaveBeenCalled();
    expect(mockDeleteMaaSModelRef).toHaveBeenCalled();
  });

  it('should not enqueue the alert on dry run', async () => {
    const deployedModel = createMockDeployment();
    const fieldData: MaaSFieldValue = { isChecked: true };

    await postDeployMaaSModelRef(fieldData, deployedModel, undefined, true);

    expect(mockEnqueuePostDeployAlert).not.toHaveBeenCalled();
    expect(mockCreateMaaSModelRef).not.toHaveBeenCalled();
  });
});
