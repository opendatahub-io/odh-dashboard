import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  setUpTokenAuth,
  UNPROVISIONABLE_TOKEN_MESSAGE,
} from '@odh-dashboard/model-serving/concepts/auth';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import { createLLMInferenceService } from '../../api/LLMInferenceService';
import { deployLLMdDeployment } from '../deploy';

jest.mock('@odh-dashboard/model-serving/concepts/auth', () => ({
  ...jest.requireActual('@odh-dashboard/model-serving/concepts/auth'),
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

const EXISTING_TOKEN = { uuid: 'a', displayName: 'existing', k8sName: 'existing-my-model-sa' };
const NEW_TOKEN = { uuid: 'b', displayName: 'default-name' };

const wizardData = (
  canCreateRoleBindings: boolean,
  canManageTokenAuth: boolean | undefined,
  tokens: { uuid: string; displayName: string; k8sName?: string }[] = [EXISTING_TOKEN],
) =>
  ({
    k8sNameDesc: { data: { k8sName: { value: 'my-model' } } },
    huggingFaceApiKey: { data: undefined },
    tokenAuthentication: { data: tokens },
    canCreateRoleBindings,
    ...(canManageTokenAuth !== undefined && { canManageTokenAuth }),
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
    // Wizard state from before canManageTokenAuth existed.
    [true, undefined, true],
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

  it.each([
    [true, false],
    [false, true],
  ])(
    'should not deploy a new token that cannot be provisioned (RoleBindings %s, token auth %s)',
    async (canCreateRoleBindings, canManageTokenAuth) => {
      await expect(
        deployLLMdDeployment(
          wizardData(canCreateRoleBindings, canManageTokenAuth, [EXISTING_TOKEN, NEW_TOKEN]),
          {},
          'test-project',
          undefined,
          model,
        ),
      ).rejects.toThrow(UNPROVISIONABLE_TOKEN_MESSAGE);
      expect(createLLMInferenceService).not.toHaveBeenCalled();
      expect(setUpTokenAuth).not.toHaveBeenCalled();
    },
  );
});
