import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { deployKServeDeployment } from '../deploy';
import { createServingRuntime, updateServingRuntime } from '../deployServer';
import { deployInferenceService } from '../deployModel';
import type { KServeDeployment } from '../types';

jest.mock('../deployServer', () => ({
  ...jest.requireActual('../deployServer'),
  createServingRuntime: jest.fn(),
  updateServingRuntime: jest.fn(),
}));
jest.mock('../deployModel', () => ({
  ...jest.requireActual('../deployModel'),
  deployInferenceService: jest.fn(),
}));

const mockCreateServingRuntime = jest.mocked(createServingRuntime);
const mockUpdateServingRuntime = jest.mocked(updateServingRuntime);
const mockDeployInferenceService = jest.mocked(deployInferenceService);

const WIZARD_DATA = {
  k8sNameDesc: { data: { name: 'My model', k8sName: { value: 'my-model' }, description: '' } },
  modelLocationData: { data: undefined },
  createConnectionData: { data: {} },
  modelType: { data: undefined },
  hardwareProfileConfig: { formData: {} },
  modelFormatState: { modelFormat: undefined },
  externalRoute: { data: false },
  tokenAuthentication: { data: [] },
  numReplicas: { data: 1 },
  runtimeArgs: { data: undefined },
  environmentVariables: { data: undefined },
  modelAvailability: { data: undefined },
  deploymentStrategy: { data: undefined },
  canCreateRoleBindings: false,
} as unknown as WizardFormData['state'];

describe('deployKServeDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeployInferenceService.mockResolvedValue(mockInferenceServiceK8sResource({}));
  });

  it('should not create a serving runtime when editing a deployment that already has one', async () => {
    const existingDeployment: KServeDeployment = {
      modelServingPlatformId: 'kserve',
      model: mockInferenceServiceK8sResource({}),
      server: mockServingRuntimeK8sResource({ name: 'existing-runtime' }),
    };

    const result = await deployKServeDeployment(
      WIZARD_DATA,
      {},
      'test-project',
      existingDeployment,
    );

    expect(mockCreateServingRuntime).not.toHaveBeenCalled();
    expect(mockUpdateServingRuntime).not.toHaveBeenCalled();
    expect(mockDeployInferenceService).toHaveBeenCalledTimes(1);
    expect(result.server).toBe(existingDeployment.server);
  });

  it('should update an existing serving runtime when explicitly requested', async () => {
    const existingServer = mockServingRuntimeK8sResource({ name: 'existing-runtime' });
    const updatedServer = {
      ...existingServer,
      spec: {
        ...existingServer.spec,
        containers: existingServer.spec.containers.map((container) => ({
          ...container,
          image: 'updated-image',
        })),
      },
    };
    mockUpdateServingRuntime.mockResolvedValue(updatedServer);

    const result = await deployKServeDeployment(
      WIZARD_DATA,
      {},
      'test-project',
      {
        modelServingPlatformId: 'kserve',
        model: mockInferenceServiceK8sResource({}),
        server: existingServer,
      },
      undefined,
      existingServer,
      undefined,
      true,
      undefined,
      undefined,
      undefined,
      (deployment) => ({ ...deployment, server: updatedServer }),
      true,
    );

    expect(mockUpdateServingRuntime).toHaveBeenCalledWith(updatedServer, { dryRun: true });
    expect(result.server).toBe(updatedServer);
  });

  it('should create a serving runtime for a new deployment', async () => {
    const serverResource = mockServingRuntimeK8sResource({ name: 'new-runtime' });
    mockCreateServingRuntime.mockResolvedValue(serverResource);

    await deployKServeDeployment(
      WIZARD_DATA,
      {},
      'test-project',
      undefined,
      undefined,
      serverResource,
    );

    expect(mockCreateServingRuntime).toHaveBeenCalledTimes(1);
    expect(mockCreateServingRuntime.mock.calls[0][0].metadata.name).toBe('my-model');
  });
});
