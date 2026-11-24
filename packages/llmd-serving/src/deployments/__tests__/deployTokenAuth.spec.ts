import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import { setUpTokenAuth } from '@odh-dashboard/model-serving/concepts/auth';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { createLLMInferenceService } from '../../api/LLMInferenceService';
import { deployLLMdDeployment } from '../deploy';

jest.mock('@odh-dashboard/model-serving/concepts/auth', () => ({
  setUpTokenAuth: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../api/LLMInferenceService', () => ({
  createLLMInferenceService: jest.fn(),
  patchLLMInferenceService: jest.fn(),
  updateLLMInferenceService: jest.fn(),
}));
jest.mock('../../hfTokenSecret', () => ({
  applyHfTokenServiceAccount: (model: unknown) => model,
  resolveHfTokenSecretName: jest.fn(() => Promise.resolve(undefined)),
  resolveHfTokenServiceAccountName: jest.fn(() => Promise.resolve(undefined)),
}));

const model = mockLLMInferenceServiceK8sResource({ name: 'my-model', namespace: 'test-project' });

const wizardData = (canCreateRoleBindings: boolean, canManageTokenAuth: boolean) =>
  ({
    k8sNameDesc: { data: { k8sName: { value: 'my-model' } } },
    huggingFaceApiKey: { data: undefined },
    tokenAuthentication: { data: [{ uuid: 'a', displayName: 'default-name' }] },
    canCreateRoleBindings,
    canManageTokenAuth,
  } as unknown as WizardFormData['state']);

describe('deployLLMdDeployment token authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createLLMInferenceService).mockResolvedValue(model);
  });

  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
  ])(
    'should set up tokens only with both permissions (RoleBindings %s, token auth %s)',
    async (canCreateRoleBindings, canManageTokenAuth, expected) => {
      await deployLLMdDeployment(
        wizardData(canCreateRoleBindings, canManageTokenAuth),
        {},
        'test-project',
        undefined,
        model,
      );
      expect(jest.mocked(setUpTokenAuth).mock.calls.length > 0).toBe(expected);
    },
  );
});
