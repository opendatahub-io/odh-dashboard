import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  setUpTokenAuth,
  UNPROVISIONABLE_TOKEN_MESSAGE,
} from '@odh-dashboard/model-serving/concepts/auth';
import { mockLLMInferenceServiceK8sResource } from '../../__mocks__/mockLLMInferenceServiceK8sResource';
import {
  createLLMInferenceService,
  updateLLMInferenceService,
} from '../../api/LLMInferenceService';
import { deployLLMdDeployment, keepAuthWithoutTokenPermission } from '../deploy';

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
    'should set up tokens on an edit only with both permissions (RoleBindings %s, token auth %s)',
    async (canCreateRoleBindings, canManageTokenAuth, expected) => {
      jest.mocked(updateLLMInferenceService).mockResolvedValue(model);
      await deployLLMdDeployment(
        wizardData(canCreateRoleBindings, canManageTokenAuth),
        {},
        'test-project',
        { modelServingPlatformId: 'llmd-serving', model },
        model,
      );
      expect(jest.mocked(setUpTokenAuth).mock.calls.length > 0).toBe(expected);
    },
  );

  it('should not deploy a new token after the host refused token management', async () => {
    await expect(
      deployLLMdDeployment(
        wizardData(true, false, [EXISTING_TOKEN, NEW_TOKEN]),
        {},
        'test-project',
        undefined,
        model,
      ),
    ).rejects.toThrow(UNPROVISIONABLE_TOKEN_MESSAGE);
    expect(createLLMInferenceService).not.toHaveBeenCalled();
    expect(setUpTokenAuth).not.toHaveBeenCalled();
  });

  it('should keep the earlier behaviour without RoleBinding create alone', async () => {
    // The field is disabled there; the model keeps requiring auth, setup is skipped.
    await deployLLMdDeployment(
      wizardData(false, undefined, [NEW_TOKEN]),
      {},
      'test-project',
      undefined,
      model,
    );
    expect(createLLMInferenceService).toHaveBeenCalled();
    expect(setUpTokenAuth).not.toHaveBeenCalled();
  });

  it('should not create a model that requires auth when no token can be provisioned', async () => {
    const requiresAuth = {
      ...model,
      metadata: {
        ...model.metadata,
        annotations: { 'security.opendatahub.io/enable-auth': 'true' },
      },
    };
    await expect(
      deployLLMdDeployment(
        wizardData(true, false, []),
        {},
        'test-project',
        undefined,
        requiresAuth,
      ),
    ).rejects.toThrow(UNPROVISIONABLE_TOKEN_MESSAGE);
    expect(createLLMInferenceService).not.toHaveBeenCalled();

    const withoutAuth = {
      ...model,
      metadata: {
        ...model.metadata,
        annotations: { 'security.opendatahub.io/enable-auth': 'false' },
      },
    };
    await deployLLMdDeployment(
      wizardData(true, false, []),
      {},
      'test-project',
      undefined,
      withoutAuth,
    );
    expect(createLLMInferenceService).toHaveBeenCalled();
  });

  describe('keepAuthWithoutTokenPermission', () => {
    const withAuth = (value?: string) => {
      const m = mockLLMInferenceServiceK8sResource({ name: 'my-model', namespace: 'test-project' });
      const annotations = { ...m.metadata.annotations };
      delete annotations['security.opendatahub.io/enable-auth'];
      if (value !== undefined) {
        annotations['security.opendatahub.io/enable-auth'] = value;
      }
      return { ...m, metadata: { ...m.metadata, annotations } };
    };

    it("should keep an edited deployment's auth setting without token permission", () => {
      // The disabled field has no tokens, which would otherwise turn auth off.
      const saved = keepAuthWithoutTokenPermission(withAuth('false'), withAuth(), false);
      expect(saved.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBeUndefined();
      const off = keepAuthWithoutTokenPermission(withAuth(), withAuth('false'), false);
      expect(off.metadata.annotations?.['security.opendatahub.io/enable-auth']).toBe('false');
    });

    it('should derive the setting from the tokens with permission or for a new deployment', () => {
      const derived = withAuth('false');
      expect(keepAuthWithoutTokenPermission(derived, withAuth(), true)).toBe(derived);
      expect(keepAuthWithoutTokenPermission(derived, undefined, false)).toBe(derived);
    });
  });
});
