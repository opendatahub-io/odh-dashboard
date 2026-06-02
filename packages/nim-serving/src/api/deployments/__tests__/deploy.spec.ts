import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { mockNimAccount } from '@odh-dashboard/internal/__mocks__/mockNimAccount';
import { isNIMDeployActive, deployNIMDeployment } from '../deploy';
import { createNIMService, updateNIMService, patchNIMService } from '../../nimservices/k8s';
import { getNIMAccount } from '../../accounts/k8s';
import type { NIMServiceKind } from '../../nimservices/types';

jest.mock('../../nimservices/k8s', () => ({
  ...jest.requireActual('../../nimservices/k8s'),
  createNIMService: jest.fn(),
  updateNIMService: jest.fn(),
  patchNIMService: jest.fn(),
}));

jest.mock('../../accounts/k8s', () => ({
  ...jest.requireActual('../../accounts/k8s'),
  getNIMAccount: jest.fn(),
}));

const mockCreate = jest.mocked(createNIMService);
const mockUpdate = jest.mocked(updateNIMService);
const mockPatch = jest.mocked(patchNIMService);
const mockGetNIMAccount = jest.mocked(getNIMAccount);

const mockNIMServiceResource: NIMServiceKind = {
  apiVersion: 'apps.nvidia.com/v1alpha1',
  kind: 'NIMService',
  metadata: { name: 'test-nim', namespace: 'test-ns' },
  spec: {
    inferencePlatform: 'kserve',
    image: { repository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct', tag: '1.8' },
  },
};

describe('isNIMDeployActive', () => {
  it('should return true when model location type is nvidia-nim', () => {
    const wizardData = {
      modelLocationData: { data: { type: 'nvidia-nim' } },
    } as unknown as WizardFormData['state'];

    expect(isNIMDeployActive(wizardData)).toBe(true);
  });

  it('should return false when model location type is not nvidia-nim', () => {
    const wizardData = {
      modelLocationData: { data: { type: 'existing' } },
    } as unknown as WizardFormData['state'];

    expect(isNIMDeployActive(wizardData)).toBe(false);
  });

  it('should return false when model location data is undefined', () => {
    const wizardData = {
      modelLocationData: { data: undefined },
    } as unknown as WizardFormData['state'];

    expect(isNIMDeployActive(wizardData)).toBe(false);
  });
});

describe('deployNIMDeployment', () => {
  beforeEach(() => jest.clearAllMocks());

  const wizardState = {} as WizardFormData['state'];

  it('should throw when modelResource is missing', async () => {
    await expect(deployNIMDeployment(wizardState, 'test-ns')).rejects.toThrow(
      'NIMService resource is required',
    );
  });

  it('should create a new NIMService when no existing deployment', async () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      apiKeySecretName: 'nvidia-nim-secrets',
    });
    account.status = {
      ...account.status,
      nimPullSecret: { name: 'ngc-secret' },
    };
    mockGetNIMAccount.mockResolvedValue(account);
    mockCreate.mockResolvedValue(mockNIMServiceResource);

    const result = await deployNIMDeployment(
      wizardState,
      'test-ns',
      undefined,
      mockNIMServiceResource,
    );

    expect(mockGetNIMAccount).toHaveBeenCalledWith('test-ns');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: expect.objectContaining({
          authSecret: 'nvidia-nim-secrets',
          image: expect.objectContaining({
            pullSecrets: ['ngc-secret'],
          }),
        }),
      }),
      { dryRun: undefined },
    );
    expect(result.modelServingPlatformId).toBe('nvidia-nim');
    expect(result.model).toBe(mockNIMServiceResource);
  });

  it('should update an existing NIMService deployment', async () => {
    mockGetNIMAccount.mockResolvedValue(
      mockNimAccount({ namespace: 'test-ns', apiKeySecretName: 'nvidia-nim-secrets' }),
    );
    mockUpdate.mockResolvedValue(mockNIMServiceResource);

    const existingDeployment = {
      modelServingPlatformId: 'nvidia-nim' as const,
      model: mockNIMServiceResource,
    };

    await deployNIMDeployment(wizardState, 'test-ns', existingDeployment, mockNIMServiceResource);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should patch when overwrite is true and existing deployment exists', async () => {
    mockGetNIMAccount.mockResolvedValue(
      mockNimAccount({ namespace: 'test-ns', apiKeySecretName: 'nvidia-nim-secrets' }),
    );
    mockPatch.mockResolvedValue(mockNIMServiceResource);

    const existingDeployment = {
      modelServingPlatformId: 'nvidia-nim' as const,
      model: mockNIMServiceResource,
    };

    await deployNIMDeployment(
      wizardState,
      'test-ns',
      existingDeployment,
      mockNIMServiceResource,
      undefined,
      undefined,
      false,
      undefined,
      true,
    );

    expect(mockPatch).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should throw when no NIM account exists in the project', async () => {
    mockGetNIMAccount.mockResolvedValue(undefined);

    await expect(
      deployNIMDeployment(wizardState, 'test-ns', undefined, mockNIMServiceResource),
    ).rejects.toThrow('NIM Account not found');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should pass dryRun option', async () => {
    const account = mockNimAccount({
      namespace: 'test-ns',
      apiKeySecretName: 'nvidia-nim-secrets',
    });
    mockGetNIMAccount.mockResolvedValue(account);
    mockCreate.mockResolvedValue(mockNIMServiceResource);

    await deployNIMDeployment(
      wizardState,
      'test-ns',
      undefined,
      mockNIMServiceResource,
      undefined,
      undefined,
      true,
    );

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Object), { dryRun: true });
  });
});
