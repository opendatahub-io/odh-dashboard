import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import { deployKServeDeployment } from '@odh-dashboard/kserve/deploy';
import { mockNimServingRuntimeTemplate } from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { deployNIMKServeDeployment, isNIMKServeDeployActive } from '../deploy';
import { NIMImageFieldWizardField } from '../../pages/deploymentWizard/fields/NIMImageField';
import { NIMAccountStatus } from '../../api/accounts/utils';

jest.mock('@odh-dashboard/kserve/deploy', () => ({
  deployKServeDeployment: jest.fn(),
}));

const mockDeployKServeDeployment = jest.mocked(deployKServeDeployment);

const WIZARD_DATA = {
  modelLocationData: { data: { type: 'nvidia-nim' } },
} as unknown as WizardFormData['state'];

const makeExternalData = (nimTemplate?: TemplateKind) => ({
  [NIMImageFieldWizardField.id]: {
    loaded: true,
    data: {
      nimImages: { images: [], projectName: 'test-project' },
      accountStatus: NIMAccountStatus.READY,
      nimTemplate,
    },
  },
});

/** The runtime `deployNIMKServeDeployment` handed down to KServe. */
const getDeployedRuntime = (): ServingRuntimeKind | undefined =>
  mockDeployKServeDeployment.mock.calls[0][5];

describe('isNIMKServeDeployActive', () => {
  it('should return true when the model location type is nvidia-nim', () => {
    expect(isNIMKServeDeployActive(WIZARD_DATA)).toBe(true);
  });

  it('should return false when the model location type is not nvidia-nim', () => {
    const wizardData = {
      modelLocationData: { data: { type: 'existing' } },
    } as unknown as WizardFormData['state'];

    expect(isNIMKServeDeployActive(wizardData)).toBe(false);
  });

  it('should return false when there is no model location data', () => {
    const wizardData = {
      modelLocationData: { data: undefined },
    } as unknown as WizardFormData['state'];

    expect(isNIMKServeDeployActive(wizardData)).toBe(false);
  });
});

describe('deployNIMKServeDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeployKServeDeployment.mockResolvedValue({} as KServeDeployment);
  });

  it('should resolve the serving runtime from the NIM template', async () => {
    await deployNIMKServeDeployment(
      WIZARD_DATA,
      makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
      'test-project',
    );

    expect(mockDeployKServeDeployment).toHaveBeenCalledTimes(1);
    expect(getDeployedRuntime()?.metadata.name).toBe('nvidia-nim-runtime');
  });

  it('should apply the shm mounts to the resolved runtime', async () => {
    await deployNIMKServeDeployment(
      WIZARD_DATA,
      makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
      'test-project',
    );

    const runtime = getDeployedRuntime();
    expect(runtime?.spec.volumes).toContainEqual({
      name: 'shm',
      emptyDir: { medium: 'Memory', sizeLimit: '2Gi' },
    });
    expect(
      runtime?.spec.containers.find((container) => container.name === 'kserve-container')
        ?.volumeMounts,
    ).toContainEqual({ name: 'shm', mountPath: '/dev/shm' });
  });

  it('should drop the container resources declared by the template', async () => {
    await deployNIMKServeDeployment(
      WIZARD_DATA,
      makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
      'test-project',
    );

    getDeployedRuntime()?.spec.containers.forEach((container) => {
      expect(container.resources).toBeUndefined();
    });
  });

  it('should throw when the template holds no serving runtime', async () => {
    await expect(
      deployNIMKServeDeployment(WIZARD_DATA, makeExternalData(undefined), 'test-project'),
    ).rejects.toThrow('Unable to find NIM ServingRuntime Template in namespace test-project');
    expect(mockDeployKServeDeployment).not.toHaveBeenCalled();
  });

  it('should keep the existing runtime when editing a deployment', async () => {
    const existingServer: ServingRuntimeKind = {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'ServingRuntime',
      metadata: { name: 'existing-runtime', namespace: 'test-project' },
      spec: { containers: [{ name: 'kserve-container' }] },
    };

    await deployNIMKServeDeployment(
      WIZARD_DATA,
      makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
      'test-project',
      { server: existingServer } as KServeDeployment,
      undefined,
      existingServer,
    );

    expect(getDeployedRuntime()).toBe(existingServer);
  });

  it('should forward the dry run flag to KServe', async () => {
    await deployNIMKServeDeployment(
      WIZARD_DATA,
      makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
      'test-project',
      undefined,
      undefined,
      undefined,
      'nvidia-nim-runtime',
      true,
    );

    expect(mockDeployKServeDeployment.mock.calls[0][6]).toBe('nvidia-nim-runtime');
    expect(mockDeployKServeDeployment.mock.calls[0][7]).toBe(true);
  });
});
