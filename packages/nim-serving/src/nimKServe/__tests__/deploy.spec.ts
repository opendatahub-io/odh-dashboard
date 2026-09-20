import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import { deployKServeDeployment } from '@odh-dashboard/kserve/deploy';
import { mockNimServingRuntimeTemplate } from '@odh-dashboard/model-serving/__mocks__/mockLegacyNimResource';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { deployNIMKServeDeployment, isNIMKServeDeployActive } from '../deploy';
import { NIMImageFieldWizardField } from '../../pages/deploymentWizard/fields/NIMImageField';
import { NIMAccountStatus } from '../../api/accounts/utils';
import { getNIMAccount } from '../../api/accounts/k8s';

jest.mock('@odh-dashboard/kserve/deploy', () => ({
  deployKServeDeployment: jest.fn(),
}));

jest.mock('../../api/accounts/k8s', () => ({
  getNIMAccount: jest.fn(),
}));

const mockDeployKServeDeployment = jest.mocked(deployKServeDeployment);
const mockGetNIMAccount = jest.mocked(getNIMAccount);

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

const makeNIMAccount = () => {
  const account = mockNimAccount({
    namespace: 'test-project',
    apiKeySecretName: 'project-nim-api-key',
  });
  account.status = {
    ...account.status,
    nimPullSecret: { name: 'project-nim-pull-secret' },
  };
  return account;
};

const makeTemplateWithCredentialPlaceholders = (): TemplateKind => {
  const template = mockNimServingRuntimeTemplate({ namespace: 'test-project' });
  const runtime = template.objects[0] as ServingRuntimeKind;
  runtime.spec.containers[0].env = [
    {
      name: 'NGC_API_KEY',
      valueFrom: {
        secretKeyRef: {
          name: 'nvidia-nim-secrets',
          key: 'NGC_API_KEY',
        },
      },
    },
  ];
  runtime.spec.imagePullSecrets = [{ name: 'ngc-secret' }];
  return template;
};

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
    mockGetNIMAccount.mockResolvedValue(makeNIMAccount());
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

  it('should replace template credential references with the project NIM Account secrets', async () => {
    mockGetNIMAccount.mockResolvedValue(makeNIMAccount());

    await deployNIMKServeDeployment(
      WIZARD_DATA,
      makeExternalData(makeTemplateWithCredentialPlaceholders()),
      'test-project',
    );

    const runtime = getDeployedRuntime();
    expect(mockGetNIMAccount).toHaveBeenCalledWith('test-project');
    expect(
      runtime?.spec.containers[0].env?.find((env) => env.name === 'NGC_API_KEY')?.valueFrom
        ?.secretKeyRef,
    ).toEqual({ name: 'project-nim-api-key', key: 'NGC_API_KEY' });
    expect(runtime?.spec.imagePullSecrets).toEqual([{ name: 'project-nim-pull-secret' }]);
  });

  it('should reject a new deployment when the project has no NIM Account', async () => {
    mockGetNIMAccount.mockResolvedValue(undefined);

    await expect(
      deployNIMKServeDeployment(
        WIZARD_DATA,
        makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
        'test-project',
      ),
    ).rejects.toThrow('NIM Account not found');

    expect(mockDeployKServeDeployment).not.toHaveBeenCalled();
  });

  it('should reject a new deployment when the NIM Account has no image pull secret', async () => {
    const account = makeNIMAccount();
    account.status = { ...account.status, nimPullSecret: undefined };
    mockGetNIMAccount.mockResolvedValue(account);

    await expect(
      deployNIMKServeDeployment(
        WIZARD_DATA,
        makeExternalData(mockNimServingRuntimeTemplate({ namespace: 'test-project' })),
        'test-project',
      ),
    ).rejects.toThrow('NIM image pull secret is not available');

    expect(mockDeployKServeDeployment).not.toHaveBeenCalled();
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
    expect(mockDeployKServeDeployment.mock.calls[0][12]).toBe(true);
    expect(mockGetNIMAccount).not.toHaveBeenCalled();
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
